import { GoalType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import {
  getAiHealth,
  requestLoadAnalysis,
  requestProgressSummary,
  requestRecommendation
} from "../ai/client.js";
import {
  aiObjectiveSchema,
  loadAnalysisInputSchema,
  progressSummaryInputSchema,
  recommendationInputSchema
} from "../ai/contract.js";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db/prisma.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { decimalToNumber } from "../utils/decimal.js";

const recommendationRequestSchema = z.object({
  objective: aiObjectiveSchema.optional(),
  cycleDay: z.number().int().min(1).max(120).optional(),
  preferredSplit: z.string().max(120).optional()
});

const periodInputSchema = z.object({
  periodDays: z.number().int().min(7).max(365).default(30)
});

function mapGoalTypeToObjective(goalType?: GoalType): z.infer<typeof aiObjectiveSchema> {
  switch (goalType) {
    case GoalType.STRENGTH:
      return "strength";
    case GoalType.WEIGHT_LOSS:
      return "weight_loss";
    case GoalType.RUN_5K:
    case GoalType.RUN_10K:
    case GoalType.RUN_21K:
    case GoalType.RUN_42K:
      return "running";
    case GoalType.HYPERTROPHY:
    default:
      return "hypertrophy";
  }
}

export const aiRouter = Router();

aiRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    const health = await getAiHealth();
    res.status(200).json(health);
  })
);

aiRouter.use(requireAuth);

aiRouter.post(
  "/recommendation",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const payload = recommendationRequestSchema.parse(req.body ?? {});

    const [goal, recentSessions, sessionsLast14Days] = await Promise.all([
      prisma.goal.findFirst({
        where: { userId: auth.userId, isActive: true },
        orderBy: { createdAt: "desc" },
        select: { type: true }
      }),
      prisma.workoutSession.findMany({
        where: { userId: auth.userId },
        orderBy: { sessionDate: "desc" },
        take: 5,
        select: { sessionDate: true, pse: true, totalLoadKg: true }
      }),
      prisma.workoutSession.count({
        where: {
          userId: auth.userId,
          sessionDate: {
            gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    const lastSession = recentSessions[0];
    const recentPseValues = recentSessions.map((session) => session.pse).filter((value): value is number => value !== null);
    const recentPseAvg =
      recentPseValues.length > 0
        ? recentPseValues.reduce((total, value) => total + value, 0) / recentPseValues.length
        : 6;

    const daysSinceLastSession = lastSession
      ? Math.max(0, Math.floor((Date.now() - lastSession.sessionDate.getTime()) / (24 * 60 * 60 * 1000)))
      : 14;

    const input = recommendationInputSchema.parse({
      objective: payload.objective ?? mapGoalTypeToObjective(goal?.type),
      recent_pse_avg: Number(recentPseAvg.toFixed(2)),
      last_session_total_load_kg: decimalToNumber(lastSession?.totalLoadKg) ?? 0,
      sessions_last_14_days: sessionsLast14Days,
      days_since_last_session: daysSinceLastSession,
      cycle_day: payload.cycleDay ?? 1,
      preferred_split: payload.preferredSplit
    });

    const recommendation = await requestRecommendation(input);
    res.status(200).json({
      input,
      recommendation
    });
  })
);

aiRouter.post(
  "/progress-summary",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { periodDays } = periodInputSchema.parse(req.body ?? {});
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const [workouts, runs] = await Promise.all([
      prisma.workoutSession.aggregate({
        where: { userId: auth.userId, sessionDate: { gte: startDate } },
        _count: { _all: true },
        _sum: { totalLoadKg: true },
        _avg: { pse: true }
      }),
      prisma.runningSession.aggregate({
        where: { userId: auth.userId, sessionDate: { gte: startDate } },
        _count: { _all: true },
        _sum: { distanceKm: true },
        _avg: { pse: true }
      })
    ]);

    const expectedSessions = Math.max(1, Math.round((periodDays / 7) * 3));
    const adherenceRate = Math.min(100, (workouts._count._all / expectedSessions) * 100);

    const input = progressSummaryInputSchema.parse({
      period_days: periodDays,
      workout_sessions: workouts._count._all,
      running_sessions: runs._count._all,
      total_load_kg: decimalToNumber(workouts._sum.totalLoadKg) ?? 0,
      total_distance_km: decimalToNumber(runs._sum.distanceKm) ?? 0,
      avg_workout_pse: workouts._avg.pse ?? null,
      avg_run_pse: runs._avg.pse ?? null,
      adherence_rate: Number(adherenceRate.toFixed(2))
    });

    const summary = await requestProgressSummary(input);
    res.status(200).json({
      input,
      summary
    });
  })
);

aiRouter.post(
  "/load-analysis",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { periodDays } = periodInputSchema.parse(req.body ?? {});
    const periodMs = periodDays * 24 * 60 * 60 * 1000;
    const startDate = new Date(Date.now() - periodMs);
    const previousStartDate = new Date(Date.now() - 2 * periodMs);

    const [groupedSets, exercises, currentPeriodTotal, previousPeriodTotal] = await Promise.all([
      prisma.workoutSet.groupBy({
        by: ["exerciseLibraryId"],
        where: {
          exerciseLibraryId: { not: null },
          workoutSession: {
            userId: auth.userId,
            sessionDate: { gte: startDate }
          }
        },
        _sum: { loadTotal: true }
      }),
      prisma.exerciseLibrary.findMany({
        select: { id: true, muscleGroup: true }
      }),
      prisma.workoutSession.aggregate({
        where: {
          userId: auth.userId,
          sessionDate: { gte: startDate }
        },
        _sum: { totalLoadKg: true }
      }),
      prisma.workoutSession.aggregate({
        where: {
          userId: auth.userId,
          sessionDate: { gte: previousStartDate, lt: startDate }
        },
        _sum: { totalLoadKg: true }
      })
    ]);

    const exerciseToMuscleGroup = new Map(exercises.map((exercise) => [exercise.id, exercise.muscleGroup]));
    const muscleGroupLoads = new Map<string, number>();

    for (const group of groupedSets) {
      if (!group.exerciseLibraryId) continue;
      const muscleGroup = exerciseToMuscleGroup.get(group.exerciseLibraryId) ?? "Unknown";
      const load = decimalToNumber(group._sum.loadTotal) ?? 0;
      muscleGroupLoads.set(muscleGroup, (muscleGroupLoads.get(muscleGroup) ?? 0) + load);
    }

    const muscleGroupPayload = [...muscleGroupLoads.entries()]
      .map(([muscle_group, total_load_kg]) => ({ muscle_group, total_load_kg: Number(total_load_kg.toFixed(2)) }))
      .sort((a, b) => b.total_load_kg - a.total_load_kg);

    const input = loadAnalysisInputSchema.parse({
      period_days: periodDays,
      muscle_group_loads: muscleGroupPayload,
      previous_period_total_load_kg: decimalToNumber(previousPeriodTotal._sum.totalLoadKg) ?? 0
    });

    const analysis = await requestLoadAnalysis(input);
    res.status(200).json({
      input: {
        ...input,
        current_period_total_load_kg: decimalToNumber(currentPeriodTotal._sum.totalLoadKg) ?? 0
      },
      analysis
    });
  })
);

