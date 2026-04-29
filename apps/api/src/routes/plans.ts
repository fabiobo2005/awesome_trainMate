import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { serializeDecimals } from "../utils/decimal.js";

const blockIdSchema = z.object({ blockId: z.string().cuid() });
const blockIdParamsSchema = z.object({ id: z.string().cuid() });
const dayIdSchema = z.object({ dayId: z.string().cuid() });
const microcycleIdSchema = z.object({ microcycleId: z.string().cuid() });
const exerciseIdSchema = z.object({ exerciseId: z.string().cuid() });

const listBlocksQuerySchema = z.object({
  active: z.enum(["true", "false", "all"]).default("true"),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const createBlockSchema = z.object({
  name: z.string().min(2).max(120),
  monthRef: z.string().max(20).optional(),
  isTemplate: z.boolean().optional(),
  isActive: z.boolean().optional(),
  assignedUserId: z.string().cuid().optional()
});

const updateBlockSchema = createBlockSchema.partial();

const createDaySchema = z.object({
  dayName: z.string().min(1).max(40),
  dayNumber: z.number().int().min(1).max(14),
  muscleGroups: z.string().min(1).max(600)
});

const updateDaySchema = createDaySchema.partial();

const createMicrocycleSchema = z.object({
  microcycleNumber: z.number().int().min(1).max(8)
});

const updateMicrocycleSchema = createMicrocycleSchema.partial();

const createExerciseSchema = z.object({
  exerciseLibraryId: z.string().cuid(),
  trainingMethodId: z.string().cuid().optional(),
  series: z.number().int().min(1).max(12),
  reps: z.number().int().min(1).max(100),
  cadence: z.string().max(20).optional(),
  restSeconds: z.number().int().min(0).max(600).optional(),
  observations: z.string().max(4000).optional(),
  orderIndex: z.number().int().min(1).max(100)
});

const updateExerciseSchema = createExerciseSchema.partial();

const blockInclude = {
  trainingDays: {
    orderBy: { dayNumber: "asc" },
    include: {
      microcycles: {
        orderBy: { microcycleNumber: "asc" },
        include: {
          exercises: {
            orderBy: { orderIndex: "asc" },
            include: {
              exerciseLibrary: {
                select: {
                  id: true,
                  name: true,
                  muscleGroup: true,
                  equipment: true
                }
              },
              trainingMethod: {
                select: {
                  id: true,
                  name: true,
                  abbreviation: true
                }
              }
            }
          }
        }
      }
    }
  }
} as const;

function visibleBlocksWhere(userId: string): Prisma.TrainingBlockWhereInput {
  return {
    OR: [{ assignedUserId: userId }, { trainerUserId: userId }, { isTemplate: true }]
  };
}

function mergeActiveFilter(
  active: "true" | "false" | "all",
  where: Prisma.TrainingBlockWhereInput
): Prisma.TrainingBlockWhereInput {
  if (active === "all") return where;
  return {
    ...where,
    isActive: active === "true"
  };
}

function canAssignAnotherUser(role: "STUDENT" | "TRAINER" | "ADMIN"): boolean {
  return role === "TRAINER" || role === "ADMIN";
}

async function ensureBlockAccess(blockId: string, userId: string): Promise<void> {
  const block = await prisma.trainingBlock.findFirst({
    where: {
      id: blockId,
      ...visibleBlocksWhere(userId)
    },
    select: { id: true }
  });

  if (!block) {
    throw new HttpError(404, "Training block not found.");
  }
}

async function ensureDayAccess(dayId: string, userId: string): Promise<void> {
  const day = await prisma.trainingDay.findFirst({
    where: {
      id: dayId,
      block: visibleBlocksWhere(userId)
    },
    select: { id: true }
  });

  if (!day) {
    throw new HttpError(404, "Training day not found.");
  }
}

async function ensureMicrocycleAccess(microcycleId: string, userId: string): Promise<void> {
  const microcycle = await prisma.trainingMicrocycle.findFirst({
    where: {
      id: microcycleId,
      day: {
        block: visibleBlocksWhere(userId)
      }
    },
    select: { id: true }
  });

  if (!microcycle) {
    throw new HttpError(404, "Training microcycle not found.");
  }
}

async function ensureExerciseAccess(exerciseId: string, userId: string): Promise<void> {
  const exercise = await prisma.trainingExercise.findFirst({
    where: {
      id: exerciseId,
      microcycle: {
        day: {
          block: visibleBlocksWhere(userId)
        }
      }
    },
    select: { id: true }
  });

  if (!exercise) {
    throw new HttpError(404, "Training exercise not found.");
  }
}

export const plansRouter = Router();
plansRouter.use(requireAuth);

plansRouter.get(
  "/blocks",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const query = listBlocksQuerySchema.parse(req.query);

    const blocks = await prisma.trainingBlock.findMany({
      where: mergeActiveFilter(query.active, visibleBlocksWhere(auth.userId)),
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: query.limit,
      include: blockInclude
    });

    res.status(200).json(serializeDecimals(blocks));
  })
);

plansRouter.post(
  "/blocks",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const payload = createBlockSchema.parse(req.body);
    const canAssign = canAssignAnotherUser(auth.role);
    const assignedUserId = canAssign ? payload.assignedUserId ?? auth.userId : auth.userId;

    if (payload.assignedUserId && !canAssign && payload.assignedUserId !== auth.userId) {
      throw new HttpError(403, "Only trainer/admin users can assign blocks to another user.");
    }

    const created = await prisma.trainingBlock.create({
      data: {
        name: payload.name,
        monthRef: payload.monthRef,
        isTemplate: payload.isTemplate ?? false,
        isActive: payload.isActive ?? true,
        assignedUserId,
        trainerUserId: canAssign ? auth.userId : null
      },
      include: blockInclude
    });

    res.status(201).json(serializeDecimals(created));
  })
);

plansRouter.patch(
  "/blocks/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = blockIdParamsSchema.parse(req.params);
    const payload = updateBlockSchema.parse(req.body);
    const canAssign = canAssignAnotherUser(auth.role);

    await ensureBlockAccess(id, auth.userId);

    if (payload.assignedUserId && !canAssign && payload.assignedUserId !== auth.userId) {
      throw new HttpError(403, "Only trainer/admin users can reassign blocks to another user.");
    }

    const updated = await prisma.trainingBlock.update({
      where: { id },
      data: {
        name: payload.name,
        monthRef: payload.monthRef,
        isTemplate: payload.isTemplate,
        isActive: payload.isActive,
        assignedUserId: payload.assignedUserId
      },
      include: blockInclude
    });

    res.status(200).json(serializeDecimals(updated));
  })
);

plansRouter.delete(
  "/blocks/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = blockIdParamsSchema.parse(req.params);
    await ensureBlockAccess(id, auth.userId);
    await prisma.trainingBlock.delete({ where: { id } });
    res.status(204).send();
  })
);

plansRouter.post(
  "/blocks/:blockId/days",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { blockId } = blockIdSchema.parse(req.params);
    const payload = createDaySchema.parse(req.body);
    await ensureBlockAccess(blockId, auth.userId);

    const created = await prisma.trainingDay.create({
      data: {
        blockId,
        dayName: payload.dayName,
        dayNumber: payload.dayNumber,
        muscleGroups: payload.muscleGroups
      },
      include: {
        microcycles: {
          orderBy: { microcycleNumber: "asc" },
          include: {
            exercises: {
              orderBy: { orderIndex: "asc" }
            }
          }
        }
      }
    });

    res.status(201).json(serializeDecimals(created));
  })
);

plansRouter.patch(
  "/days/:dayId",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { dayId } = dayIdSchema.parse(req.params);
    const payload = updateDaySchema.parse(req.body);
    await ensureDayAccess(dayId, auth.userId);

    const updated = await prisma.trainingDay.update({
      where: { id: dayId },
      data: {
        dayName: payload.dayName,
        dayNumber: payload.dayNumber,
        muscleGroups: payload.muscleGroups
      }
    });

    res.status(200).json(serializeDecimals(updated));
  })
);

plansRouter.delete(
  "/days/:dayId",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { dayId } = dayIdSchema.parse(req.params);
    await ensureDayAccess(dayId, auth.userId);
    await prisma.trainingDay.delete({ where: { id: dayId } });
    res.status(204).send();
  })
);

plansRouter.post(
  "/days/:dayId/microcycles",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { dayId } = dayIdSchema.parse(req.params);
    const payload = createMicrocycleSchema.parse(req.body);
    await ensureDayAccess(dayId, auth.userId);

    const created = await prisma.trainingMicrocycle.create({
      data: {
        dayId,
        microcycleNumber: payload.microcycleNumber
      },
      include: {
        exercises: {
          orderBy: { orderIndex: "asc" },
          include: {
            exerciseLibrary: {
              select: {
                id: true,
                name: true,
                muscleGroup: true
              }
            },
            trainingMethod: {
              select: {
                id: true,
                name: true,
                abbreviation: true
              }
            }
          }
        }
      }
    });

    res.status(201).json(serializeDecimals(created));
  })
);

plansRouter.patch(
  "/microcycles/:microcycleId",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { microcycleId } = microcycleIdSchema.parse(req.params);
    const payload = updateMicrocycleSchema.parse(req.body);
    await ensureMicrocycleAccess(microcycleId, auth.userId);

    const updated = await prisma.trainingMicrocycle.update({
      where: { id: microcycleId },
      data: {
        microcycleNumber: payload.microcycleNumber
      }
    });

    res.status(200).json(serializeDecimals(updated));
  })
);

plansRouter.delete(
  "/microcycles/:microcycleId",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { microcycleId } = microcycleIdSchema.parse(req.params);
    await ensureMicrocycleAccess(microcycleId, auth.userId);
    await prisma.trainingMicrocycle.delete({ where: { id: microcycleId } });
    res.status(204).send();
  })
);

plansRouter.post(
  "/microcycles/:microcycleId/exercises",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { microcycleId } = microcycleIdSchema.parse(req.params);
    const payload = createExerciseSchema.parse(req.body);
    await ensureMicrocycleAccess(microcycleId, auth.userId);

    const created = await prisma.trainingExercise.create({
      data: {
        microcycleId,
        exerciseLibraryId: payload.exerciseLibraryId,
        trainingMethodId: payload.trainingMethodId,
        series: payload.series,
        reps: payload.reps,
        cadence: payload.cadence,
        restSeconds: payload.restSeconds,
        observations: payload.observations,
        orderIndex: payload.orderIndex
      },
      include: {
        exerciseLibrary: {
          select: {
            id: true,
            name: true,
            muscleGroup: true,
            equipment: true
          }
        },
        trainingMethod: {
          select: {
            id: true,
            name: true,
            abbreviation: true
          }
        }
      }
    });

    res.status(201).json(serializeDecimals(created));
  })
);

plansRouter.patch(
  "/exercises/:exerciseId",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { exerciseId } = exerciseIdSchema.parse(req.params);
    const payload = updateExerciseSchema.parse(req.body);
    await ensureExerciseAccess(exerciseId, auth.userId);

    const updated = await prisma.trainingExercise.update({
      where: { id: exerciseId },
      data: {
        exerciseLibraryId: payload.exerciseLibraryId,
        trainingMethodId: payload.trainingMethodId,
        series: payload.series,
        reps: payload.reps,
        cadence: payload.cadence,
        restSeconds: payload.restSeconds,
        observations: payload.observations,
        orderIndex: payload.orderIndex
      },
      include: {
        exerciseLibrary: {
          select: {
            id: true,
            name: true,
            muscleGroup: true
          }
        },
        trainingMethod: {
          select: {
            id: true,
            name: true,
            abbreviation: true
          }
        }
      }
    });

    res.status(200).json(serializeDecimals(updated));
  })
);

plansRouter.delete(
  "/exercises/:exerciseId",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { exerciseId } = exerciseIdSchema.parse(req.params);
    await ensureExerciseAccess(exerciseId, auth.userId);
    await prisma.trainingExercise.delete({ where: { id: exerciseId } });
    res.status(204).send();
  })
);
