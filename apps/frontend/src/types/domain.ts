export type UserRole = "STUDENT" | "TRAINER" | "ADMIN";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: string;
  mustChangePassword: boolean;
};

export type LoginResponse = {
  tokenType: string;
  accessToken: string;
  user: AuthUser;
};

export type WorkoutSet = {
  id: string;
  workoutSessionId: string;
  exerciseLibraryId: string | null;
  trainingExerciseId: string | null;
  setNumber: number;
  repsExecuted: number;
  weightKg: number | null;
  loadTotal: number | null;
  notes: string | null;
  exerciseLibrary?: {
    id: string;
    name: string;
    muscleGroup: string;
  } | null;
};

export type WorkoutSession = {
  id: string;
  userId: string;
  trainingDayId: string | null;
  sourceType: "PLAN" | "CUSTOM";
  sessionDate: string;
  durationMinutes: number | null;
  pse: number | null;
  arbitraryUnits: number | null;
  totalLoadKg: number | null;
  notes: string | null;
  workoutSets: WorkoutSet[];
};

export type RunningSession = {
  id: string;
  userId: string;
  sessionDate: string;
  distanceKm: number | null;
  durationMinutes: number | null;
  pace: string | null;
  avgHeartRate: number | null;
  pse: number | null;
  notes: string | null;
};

export type ProgressSummary = {
  periodDays: number;
  startedAt: string;
  workouts: {
    sessions: number;
    totalLoadKg: number | null;
    avgPse: number | null;
    avgDurationMinutes: number | null;
  };
  runs: {
    sessions: number;
    totalDistanceKm: number | null;
    totalDurationMinutes: number | null;
    avgPse: number | null;
  };
  metrics: {
    entries: number;
  };
};

export type Metric = {
  id: string;
  userId: string;
  workoutSessionId: string | null;
  runningSessionId: string | null;
  weekStart: string | null;
  monthRef: string | null;
  avgPse: number | null;
  totalLoadKg: number | null;
  totalCardioMinutes: number | null;
  totalDistanceKm: number | null;
  notes: string | null;
  createdAt: string;
};

export type AiProgressSummary = {
  input: {
    period_days: number;
    workout_sessions: number;
    running_sessions: number;
    total_load_kg: number;
    total_distance_km: number;
    avg_workout_pse: number | null;
    avg_run_pse: number | null;
    adherence_rate: number;
  };
  summary: {
    period_days: number;
    status: "on-track" | "watch" | "at-risk";
    adherence_rate: number;
    highlights: string[];
    risks: string[];
    recommended_actions: string[];
  };
};

export type AiRecommendation = {
  input: {
    objective: "hypertrophy" | "strength" | "weight_loss" | "running";
    recent_pse_avg: number;
    last_session_total_load_kg: number;
    sessions_last_14_days: number;
    days_since_last_session: number;
    cycle_day: number;
    preferred_split?: string;
  };
  recommendation: {
    objective: "hypertrophy" | "strength" | "weight_loss" | "running";
    recommendation: string;
    volume_adjustment_pct: number;
    intensity_adjustment_pct: number;
    next_focus: string;
    cycle_stage: string;
    rationale: string[];
    recovery_priority: "low" | "moderate" | "high";
  };
};

export type AiLoadAnalysis = {
  input: {
    period_days: number;
    muscle_group_loads: Array<{
      muscle_group: string;
      total_load_kg: number;
    }>;
    previous_period_total_load_kg?: number;
    current_period_total_load_kg: number;
  };
  analysis: {
    period_days: number;
    top_muscle_groups: Array<{
      muscle_group: string;
      total_load_kg: number;
    }>;
    imbalance_flags: string[];
    recommendations: string[];
    delta_vs_previous_period_pct: number | null;
  };
};

export type TrainingMethod = {
  id: string;
  name: string;
  abbreviation: string | null;
  description: string;
};

export type CatalogExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  instructions: string | null;
  methodLinks: Array<{
    trainingMethod: {
      id: string;
      name: string;
      abbreviation: string | null;
    };
  }>;
};

export type Goal = {
  id: string;
  userId: string;
  type: "HYPERTROPHY" | "STRENGTH" | "WEIGHT_LOSS" | "RUN_5K" | "RUN_10K" | "RUN_21K" | "RUN_42K" | "OTHER";
  description: string | null;
  targetValue: number | null;
  targetDate: string | null;
  isActive: boolean;
  createdAt: string;
};

export type Anamnesis = {
  id: string;
  userId: string;
  trainingLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  bodyFatPct: number | null;
  injuries: string | null;
  limitations: string | null;
  medicalNotes: string | null;
  isCurrent: boolean;
  recordedAt: string;
};

export type TrainingExercise = {
  id: string;
  microcycleId: string;
  exerciseLibraryId: string;
  trainingMethodId: string | null;
  series: number;
  reps: number;
  cadence: string | null;
  restSeconds: number | null;
  observations: string | null;
  orderIndex: number;
  exerciseLibrary: {
    id: string;
    name: string;
    muscleGroup: string;
    equipment?: string | null;
  };
  trainingMethod: {
    id: string;
    name: string;
    abbreviation: string | null;
  } | null;
};

export type TrainingMicrocycle = {
  id: string;
  dayId: string;
  microcycleNumber: number;
  exercises: TrainingExercise[];
};

export type TrainingDay = {
  id: string;
  blockId: string;
  dayName: string;
  dayNumber: number;
  muscleGroups: string;
  microcycles: TrainingMicrocycle[];
};

export type TrainingBlock = {
  id: string;
  name: string;
  monthRef: string | null;
  assignedUserId: string | null;
  trainerUserId: string | null;
  isTemplate: boolean;
  isActive: boolean;
  trainingDays: TrainingDay[];
  updatedAt: string;
};
