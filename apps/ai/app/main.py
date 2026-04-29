from datetime import datetime
import json
import logging
from time import perf_counter
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI, Request
from pydantic import BaseModel, Field

SCHEMA_VERSION = "v1"

app = FastAPI(title="TrainMate AI", version="0.2.0")
logger = logging.getLogger("trainmate-ai")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid4())
    start = perf_counter()

    try:
        response = await call_next(request)
    except Exception as exc:
        duration_ms = round((perf_counter() - start) * 1000, 2)
        logger.error(
            json.dumps(
                {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "level": "error",
                    "message": "ai-request-failed",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": duration_ms,
                    "reason": str(exc),
                }
            )
        )
        raise

    duration_ms = round((perf_counter() - start) * 1000, 2)
    response.headers["x-request-id"] = request_id
    logger.info(
        json.dumps(
            {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "level": "info",
                "message": "ai-request-completed",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            }
        )
    )
    return response


class RecommendationInput(BaseModel):
    objective: Literal["hypertrophy", "strength", "weight_loss", "running"]
    recent_pse_avg: float = Field(ge=0, le=10)
    last_session_total_load_kg: float = Field(ge=0)
    sessions_last_14_days: int = Field(ge=0, le=28)
    days_since_last_session: int = Field(ge=0, le=60)
    cycle_day: int = Field(default=1, ge=1, le=120)
    preferred_split: str | None = None


class RecommendationOutput(BaseModel):
    objective: Literal["hypertrophy", "strength", "weight_loss", "running"]
    recommendation: str
    volume_adjustment_pct: float
    intensity_adjustment_pct: float
    next_focus: str
    cycle_stage: str
    rationale: list[str]
    recovery_priority: Literal["low", "moderate", "high"]


class ProgressSummaryInput(BaseModel):
    period_days: int = Field(ge=7, le=365)
    workout_sessions: int = Field(ge=0)
    running_sessions: int = Field(ge=0)
    total_load_kg: float = Field(ge=0)
    total_distance_km: float = Field(ge=0)
    avg_workout_pse: float | None = Field(default=None, ge=0, le=10)
    avg_run_pse: float | None = Field(default=None, ge=0, le=10)
    adherence_rate: float = Field(ge=0, le=100)


class ProgressSummaryOutput(BaseModel):
    period_days: int
    status: Literal["on-track", "watch", "at-risk"]
    adherence_rate: float
    highlights: list[str]
    risks: list[str]
    recommended_actions: list[str]


class MuscleGroupLoad(BaseModel):
    muscle_group: str
    total_load_kg: float = Field(ge=0)


class LoadAnalysisInput(BaseModel):
    period_days: int = Field(ge=7, le=365)
    muscle_group_loads: list[MuscleGroupLoad]
    previous_period_total_load_kg: float | None = Field(default=None, ge=0)


class LoadAnalysisOutput(BaseModel):
    period_days: int
    top_muscle_groups: list[MuscleGroupLoad]
    imbalance_flags: list[str]
    recommendations: list[str]
    delta_vs_previous_period_pct: float | None


def _cycle_stage(cycle_day: int) -> str:
    if cycle_day >= 90:
        return "cycle-90-reset"
    if cycle_day >= 60:
        return "cycle-60-variation"
    if cycle_day >= 30:
        return "cycle-30-progression-check"
    return "cycle-build"


def _recommendation_focus(objective: str, preferred_split: str | None) -> str:
    if preferred_split:
        return f"Execute next session using preferred split: {preferred_split}."

    if objective == "hypertrophy":
        return "Prioritize compound lifts first, then accessories with controlled tempo."
    if objective == "strength":
        return "Prioritize low-rep compound movements with full recovery between heavy sets."
    if objective == "weight_loss":
        return "Prioritize full-body density blocks and finish with moderate cardio."
    return "Prioritize aerobic quality session with pacing consistency and controlled effort."


def _compute_recommendation(payload: RecommendationInput) -> RecommendationOutput:
    volume_adjustment_pct = 0.0
    intensity_adjustment_pct = 0.0
    rationale: list[str] = []
    recovery_priority: Literal["low", "moderate", "high"] = "moderate"

    if payload.recent_pse_avg >= 8.5:
        volume_adjustment_pct = -20.0
        intensity_adjustment_pct = -10.0
        recovery_priority = "high"
        rationale.append("Recent average PSE is very high, indicating accumulated fatigue.")
    elif payload.recent_pse_avg >= 7.5:
        volume_adjustment_pct = -10.0
        intensity_adjustment_pct = -5.0
        recovery_priority = "moderate"
        rationale.append("Recent average PSE is elevated; reducing load prevents overreaching.")
    elif payload.recent_pse_avg <= 5.5 and payload.sessions_last_14_days >= 4:
        volume_adjustment_pct = 8.0
        intensity_adjustment_pct = 5.0
        recovery_priority = "low"
        rationale.append("PSE is controlled with consistent frequency; room for progressive overload.")
    else:
        rationale.append("Keep progression steady and evaluate response in the next microcycle.")

    if payload.days_since_last_session >= 4:
        volume_adjustment_pct = min(volume_adjustment_pct, -5.0)
        rationale.append("Long gap since last session: start slightly conservative before ramp-up.")

    if payload.last_session_total_load_kg <= 0:
        rationale.append("No prior load baseline available; use conservative starting loads.")

    recommendation = (
        f"Adjust next session by {volume_adjustment_pct:+.0f}% volume and "
        f"{intensity_adjustment_pct:+.0f}% intensity."
    )

    return RecommendationOutput(
        objective=payload.objective,
        recommendation=recommendation,
        volume_adjustment_pct=volume_adjustment_pct,
        intensity_adjustment_pct=intensity_adjustment_pct,
        next_focus=_recommendation_focus(payload.objective, payload.preferred_split),
        cycle_stage=_cycle_stage(payload.cycle_day),
        rationale=rationale,
        recovery_priority=recovery_priority,
    )


def _compute_progress_summary(payload: ProgressSummaryInput) -> ProgressSummaryOutput:
    highlights: list[str] = []
    risks: list[str] = []
    actions: list[str] = []

    if payload.workout_sessions > 0:
        highlights.append(f"{payload.workout_sessions} workout sessions logged in {payload.period_days} days.")
    if payload.running_sessions > 0:
        highlights.append(f"{payload.running_sessions} running sessions logged.")
    if payload.total_load_kg > 0:
        highlights.append(f"Total lifted load: {payload.total_load_kg:.1f} kg.")
    if payload.total_distance_km > 0:
        highlights.append(f"Total running distance: {payload.total_distance_km:.2f} km.")

    status: Literal["on-track", "watch", "at-risk"] = "watch"
    if payload.adherence_rate >= 75 and (payload.avg_workout_pse is None or payload.avg_workout_pse <= 7.8):
        status = "on-track"
    if payload.adherence_rate < 55 or (payload.avg_workout_pse is not None and payload.avg_workout_pse >= 8.5):
        status = "at-risk"

    if payload.adherence_rate < 60:
        risks.append("Adherence is below target; consistency is limiting progression.")
        actions.append("Plan fixed training slots for the next 7 days and target >=3 sessions/week.")
    if payload.avg_workout_pse is not None and payload.avg_workout_pse >= 8:
        risks.append("Average workout PSE is high, suggesting excessive fatigue.")
        actions.append("Reduce volume by 10-15% for one microcycle and prioritize sleep/recovery.")
    if payload.running_sessions > 0 and payload.avg_run_pse is not None and payload.avg_run_pse >= 8:
        risks.append("Running effort is high; watch cumulative fatigue with strength sessions.")
        actions.append("Shift one run to low intensity and keep interval quality day separated from leg day.")

    if not actions:
        actions.append("Maintain current progression and recheck indicators at next 30-day checkpoint.")
    if not risks:
        risks.append("No critical risks detected in current period.")

    return ProgressSummaryOutput(
        period_days=payload.period_days,
        status=status,
        adherence_rate=round(payload.adherence_rate, 2),
        highlights=highlights,
        risks=risks,
        recommended_actions=actions,
    )


def _compute_load_analysis(payload: LoadAnalysisInput) -> LoadAnalysisOutput:
    sorted_groups = sorted(
        payload.muscle_group_loads,
        key=lambda item: item.total_load_kg,
        reverse=True,
    )
    top_groups = sorted_groups[:5]
    total_load = sum(item.total_load_kg for item in sorted_groups)

    imbalance_flags: list[str] = []
    recommendations: list[str] = []

    if total_load <= 0:
        imbalance_flags.append("No load data in selected window.")
        recommendations.append("Log load for each set to enable accurate volume balancing.")
    else:
        top_share = (top_groups[0].total_load_kg / total_load) * 100 if top_groups else 0
        if top_share > 55:
            imbalance_flags.append(
                f"Load concentration is high in '{top_groups[0].muscle_group}' ({top_share:.1f}% of total)."
            )
            recommendations.append("Redistribute weekly volume to secondary muscle groups.")

        if len(top_groups) >= 2:
            ratio = top_groups[0].total_load_kg / max(top_groups[1].total_load_kg, 1e-6)
            if ratio > 2.0:
                imbalance_flags.append("Top muscle group load is more than 2x the second group.")
                recommendations.append("Increase accessory volume for under-trained groups by 10-20%.")

        if not recommendations:
            recommendations.append("Current load distribution looks balanced for the selected period.")

    delta_vs_previous: float | None = None
    if payload.previous_period_total_load_kg is not None and payload.previous_period_total_load_kg > 0:
        delta_vs_previous = ((total_load - payload.previous_period_total_load_kg) / payload.previous_period_total_load_kg) * 100
        if delta_vs_previous > 15:
            recommendations.append("Total load increased sharply vs previous period; monitor recovery markers.")
        elif delta_vs_previous < -15:
            recommendations.append("Total load dropped significantly; confirm if deload/taper was intentional.")

    if not imbalance_flags:
        imbalance_flags.append("No major volume imbalance detected.")

    return LoadAnalysisOutput(
        period_days=payload.period_days,
        top_muscle_groups=top_groups,
        imbalance_flags=imbalance_flags,
        recommendations=recommendations,
        delta_vs_previous_period_pct=round(delta_vs_previous, 2) if delta_vs_previous is not None else None,
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "trainmate-ai",
        "schema_version": SCHEMA_VERSION,
        "request_id_header": "x-request-id",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/contract")
def contract() -> dict[str, object]:
    return {
        "schema_version": SCHEMA_VERSION,
        "endpoints": ["/health", "/recommendation", "/progress-summary", "/load-analysis"],
    }


@app.post("/recommendation", response_model=RecommendationOutput)
def recommendation(payload: RecommendationInput) -> RecommendationOutput:
    return _compute_recommendation(payload)


@app.post("/progress-summary", response_model=ProgressSummaryOutput)
def progress_summary(payload: ProgressSummaryInput) -> ProgressSummaryOutput:
    return _compute_progress_summary(payload)


@app.post("/load-analysis", response_model=LoadAnalysisOutput)
def load_analysis(payload: LoadAnalysisInput) -> LoadAnalysisOutput:
    return _compute_load_analysis(payload)

