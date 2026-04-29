import { Prisma, SessionSourceType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { serializeDecimals, toDecimal } from "../utils/decimal.js";

const sessionIdSchema = z.object({ id: z.string().cuid() });
const sessionParamsSchema = z.object({ sessionId: z.string().cuid() });
const setIdParamsSchema = z.object({ setId: z.string().cuid() });

const workoutSetInputSchema = z.object({
  exerciseLibraryId: z.string().cuid().optional(),
  trainingExerciseId: z.string().cuid().optional(),
  setNumber: z.number().int().min(1),
  repsExecuted: z.number().int().min(1),
  weightKg: z.number().min(0).optional(),
  notes: z.string().max(4000).optional()
});

const workoutSessionCreateSchema = z.object({
  trainingDayId: z.string().cuid().optional(),
  sourceType: z.nativeEnum(SessionSourceType).optional(),
  sessionDate: z.coerce.date().optional(),
  durationMinutes: z.number().int().min(1).max(600).optional(),
  pse: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(4000).optional(),
  sets: z.array(workoutSetInputSchema).optional()
});

const workoutSessionUpdateSchema = workoutSessionCreateSchema.partial().omit({ sets: true });
const workoutSetUpdateSchema = workoutSetInputSchema.partial();

function computeSetLoadTotal(repsExecuted: number, weightKg?: number): Prisma.Decimal | null {
  if (weightKg === undefined) return null;
  return new Prisma.Decimal(repsExecuted * weightKg);
}

async function ensureSessionOwnership(sessionId: string, userId: string): Promise<void> {
  const existing = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId }
  });
  if (!existing) throw new HttpError(404, "Workout session not found.");
}

async function recalculateSessionMetrics(sessionId: string): Promise<void> {
  const session = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    select: { id: true, durationMinutes: true, pse: true }
  });

  if (!session) throw new HttpError(404, "Workout session not found.");

  const aggregate = await prisma.workoutSet.aggregate({
    where: { workoutSessionId: sessionId },
    _sum: { loadTotal: true }
  });

  const totalLoadKg = aggregate._sum.loadTotal ?? new Prisma.Decimal(0);
  const arbitraryUnits =
    session.durationMinutes && session.pse
      ? new Prisma.Decimal(session.durationMinutes * session.pse)
      : null;

  await prisma.workoutSession.update({
    where: { id: sessionId },
    data: {
      totalLoadKg,
      arbitraryUnits
    }
  });
}

export const workoutsRouter = Router();
workoutsRouter.use(requireAuth);

workoutsRouter.get(
  "/sessions",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const sessions = await prisma.workoutSession.findMany({
      where: { userId: auth.userId },
      orderBy: { sessionDate: "desc" },
      include: { workoutSets: true }
    });
    res.status(200).json(serializeDecimals(sessions));
  })
);

workoutsRouter.post(
  "/sessions",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const payload = workoutSessionCreateSchema.parse(req.body);

    const created = await prisma.$transaction(async (tx) => {
      const session = await tx.workoutSession.create({
        data: {
          userId: auth.userId,
          trainingDayId: payload.trainingDayId,
          sourceType: payload.sourceType ?? SessionSourceType.PLAN,
          sessionDate: payload.sessionDate ?? new Date(),
          durationMinutes: payload.durationMinutes,
          pse: payload.pse,
          notes: payload.notes,
          totalLoadKg: new Prisma.Decimal(0),
          arbitraryUnits:
            payload.durationMinutes && payload.pse
              ? new Prisma.Decimal(payload.durationMinutes * payload.pse)
              : null
        }
      });

      if (payload.sets && payload.sets.length > 0) {
        for (const setPayload of payload.sets) {
          await tx.workoutSet.create({
            data: {
              workoutSessionId: session.id,
              exerciseLibraryId: setPayload.exerciseLibraryId,
              trainingExerciseId: setPayload.trainingExerciseId,
              setNumber: setPayload.setNumber,
              repsExecuted: setPayload.repsExecuted,
              weightKg: toDecimal(setPayload.weightKg),
              loadTotal: computeSetLoadTotal(setPayload.repsExecuted, setPayload.weightKg),
              notes: setPayload.notes
            }
          });
        }
      }

      return session;
    });

    await recalculateSessionMetrics(created.id);
    const complete = await prisma.workoutSession.findUnique({
      where: { id: created.id },
      include: { workoutSets: true }
    });

    res.status(201).json(serializeDecimals(complete));
  })
);

workoutsRouter.get(
  "/sessions/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = sessionIdSchema.parse(req.params);
    await ensureSessionOwnership(id, auth.userId);

    const session = await prisma.workoutSession.findUnique({
      where: { id },
      include: { workoutSets: true }
    });

    res.status(200).json(serializeDecimals(session));
  })
);

workoutsRouter.patch(
  "/sessions/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = sessionIdSchema.parse(req.params);
    const payload = workoutSessionUpdateSchema.parse(req.body);
    await ensureSessionOwnership(id, auth.userId);

    const updated = await prisma.workoutSession.update({
      where: { id },
      data: {
        trainingDayId: payload.trainingDayId,
        sourceType: payload.sourceType,
        sessionDate: payload.sessionDate,
        durationMinutes: payload.durationMinutes,
        pse: payload.pse,
        notes: payload.notes
      },
      include: { workoutSets: true }
    });

    await recalculateSessionMetrics(updated.id);
    const complete = await prisma.workoutSession.findUnique({
      where: { id: updated.id },
      include: { workoutSets: true }
    });

    res.status(200).json(serializeDecimals(complete));
  })
);

workoutsRouter.delete(
  "/sessions/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = sessionIdSchema.parse(req.params);
    await ensureSessionOwnership(id, auth.userId);
    await prisma.workoutSession.delete({ where: { id } });
    res.status(204).send();
  })
);

workoutsRouter.get(
  "/sessions/:sessionId/sets",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { sessionId } = sessionParamsSchema.parse(req.params);
    await ensureSessionOwnership(sessionId, auth.userId);

    const sets = await prisma.workoutSet.findMany({
      where: { workoutSessionId: sessionId },
      orderBy: { setNumber: "asc" }
    });

    res.status(200).json(serializeDecimals(sets));
  })
);

workoutsRouter.post(
  "/sessions/:sessionId/sets",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { sessionId } = sessionParamsSchema.parse(req.params);
    const payload = workoutSetInputSchema.parse(req.body);
    await ensureSessionOwnership(sessionId, auth.userId);

    const set = await prisma.workoutSet.create({
      data: {
        workoutSessionId: sessionId,
        exerciseLibraryId: payload.exerciseLibraryId,
        trainingExerciseId: payload.trainingExerciseId,
        setNumber: payload.setNumber,
        repsExecuted: payload.repsExecuted,
        weightKg: toDecimal(payload.weightKg),
        loadTotal: computeSetLoadTotal(payload.repsExecuted, payload.weightKg),
        notes: payload.notes
      }
    });

    await recalculateSessionMetrics(sessionId);
    res.status(201).json(serializeDecimals(set));
  })
);

workoutsRouter.patch(
  "/sets/:setId",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { setId } = setIdParamsSchema.parse(req.params);
    const payload = workoutSetUpdateSchema.parse(req.body);

    const existing = await prisma.workoutSet.findUnique({
      where: { id: setId },
      include: {
        workoutSession: {
          select: { userId: true }
        }
      }
    });

    if (!existing || existing.workoutSession.userId !== auth.userId) {
      throw new HttpError(404, "Workout set not found.");
    }

    const repsExecuted = payload.repsExecuted ?? existing.repsExecuted;
    const weightKg = payload.weightKg !== undefined ? payload.weightKg : existing.weightKg ? Number(existing.weightKg.toString()) : undefined;

    const updated = await prisma.workoutSet.update({
      where: { id: setId },
      data: {
        exerciseLibraryId: payload.exerciseLibraryId,
        trainingExerciseId: payload.trainingExerciseId,
        setNumber: payload.setNumber,
        repsExecuted: payload.repsExecuted,
        weightKg: payload.weightKg !== undefined ? toDecimal(payload.weightKg) : undefined,
        loadTotal: computeSetLoadTotal(repsExecuted, weightKg),
        notes: payload.notes
      }
    });

    await recalculateSessionMetrics(existing.workoutSessionId);
    res.status(200).json(serializeDecimals(updated));
  })
);

workoutsRouter.delete(
  "/sets/:setId",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { setId } = setIdParamsSchema.parse(req.params);

    const existing = await prisma.workoutSet.findUnique({
      where: { id: setId },
      include: {
        workoutSession: {
          select: { userId: true }
        }
      }
    });

    if (!existing || existing.workoutSession.userId !== auth.userId) {
      throw new HttpError(404, "Workout set not found.");
    }

    await prisma.workoutSet.delete({ where: { id: setId } });
    await recalculateSessionMetrics(existing.workoutSessionId);
    res.status(204).send();
  })
);

