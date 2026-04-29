import { z } from "zod";

export const aiObjectiveSchema = z.enum(["hypertrophy", "strength", "weight_loss", "running"]);

export const recommendationInputSchema = z.object({
  objective: aiObjectiveSchema,
  recent_pse_avg: z.number().min(0).max(10),
  last_session_total_load_kg: z.number().min(0),
  sessions_last_14_days: z.number().int().min(0).max(28),
  days_since_last_session: z.number().int().min(0).max(60),
  cycle_day: z.number().int().min(1).max(120).default(1),
  preferred_split: z.string().max(120).optional()
});

export const recommendationResponseSchema = z.object({
  objective: aiObjectiveSchema,
  recommendation: z.string(),
  volume_adjustment_pct: z.number(),
  intensity_adjustment_pct: z.number(),
  next_focus: z.string(),
  cycle_stage: z.string(),
  rationale: z.array(z.string()),
  recovery_priority: z.enum(["low", "moderate", "high"])
});

export const progressSummaryInputSchema = z.object({
  period_days: z.number().int().min(7).max(365),
  workout_sessions: z.number().int().min(0),
  running_sessions: z.number().int().min(0),
  total_load_kg: z.number().min(0),
  total_distance_km: z.number().min(0),
  avg_workout_pse: z.number().min(0).max(10).nullable(),
  avg_run_pse: z.number().min(0).max(10).nullable(),
  adherence_rate: z.number().min(0).max(100)
});

export const progressSummaryResponseSchema = z.object({
  period_days: z.number().int(),
  status: z.enum(["on-track", "watch", "at-risk"]),
  adherence_rate: z.number(),
  highlights: z.array(z.string()),
  risks: z.array(z.string()),
  recommended_actions: z.array(z.string())
});

export const muscleGroupLoadSchema = z.object({
  muscle_group: z.string().min(1),
  total_load_kg: z.number().min(0)
});

export const loadAnalysisInputSchema = z.object({
  period_days: z.number().int().min(7).max(365),
  muscle_group_loads: z.array(muscleGroupLoadSchema).max(50),
  previous_period_total_load_kg: z.number().min(0).optional()
});

export const loadAnalysisResponseSchema = z.object({
  period_days: z.number().int(),
  top_muscle_groups: z.array(muscleGroupLoadSchema),
  imbalance_flags: z.array(z.string()),
  recommendations: z.array(z.string()),
  delta_vs_previous_period_pct: z.number().nullable()
});

export const aiHealthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("trainmate-ai"),
  schema_version: z.string(),
  timestamp: z.string()
});

export type RecommendationInput = z.infer<typeof recommendationInputSchema>;
export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>;
export type ProgressSummaryInput = z.infer<typeof progressSummaryInputSchema>;
export type ProgressSummaryResponse = z.infer<typeof progressSummaryResponseSchema>;
export type LoadAnalysisInput = z.infer<typeof loadAnalysisInputSchema>;
export type LoadAnalysisResponse = z.infer<typeof loadAnalysisResponseSchema>;
export type AiHealthResponse = z.infer<typeof aiHealthResponseSchema>;

