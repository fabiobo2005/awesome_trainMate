import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { decimalToNumber, serializeDecimals, toDecimal } from "../utils/decimal.js";

const idParamsSchema = z.object({ id: z.string().cuid() });

const summaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30)
});

const metricCreateSchema = z.object({
  workoutSessionId: z.string().cuid().optional(),
  runningSessionId: z.string().cuid().optional(),
  weekStart: z.coerce.date().optional(),
  monthRef: z.string().max(20).optional(),
  avgPse: z.number().min(0).max(10).optional(),
  totalLoadKg: z.number().min(0).optional(),
  totalCardioMinutes: z.number().int().min(0).optional(),
  totalDistanceKm: z.number().min(0).optional(),
  notes: z.string().max(4000).optional()
});

const metricUpdateSchema = metricCreateSchema.partial();

export const progressRouter = Router();
progressRouter.use(requireAuth);

progressRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { days } = summaryQuerySchema.parse(req.query);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [workoutAgg, runningAgg, metricAgg] = await Promise.all([
      prisma.workoutSession.aggregate({
        where: { userId: auth.userId, sessionDate: { gte: startDate } },
        _count: { _all: true },
        _sum: { totalLoadKg: true },
        _avg: { pse: true, durationMinutes: true }
      }),
      prisma.runningSession.aggregate({
        where: { userId: auth.userId, sessionDate: { gte: startDate } },
        _count: { _all: true },
        _sum: { distanceKm: true, durationMinutes: true },
        _avg: { pse: true }
      }),
      prisma.metric.aggregate({
        where: { userId: auth.userId, createdAt: { gte: startDate } },
        _count: { _all: true }
      })
    ]);

    res.status(200).json({
      periodDays: days,
      startedAt: startDate.toISOString(),
      workouts: {
        sessions: workoutAgg._count._all,
        totalLoadKg: decimalToNumber(workoutAgg._sum.totalLoadKg as Prisma.Decimal | null),
        avgPse: workoutAgg._avg.pse ?? null,
        avgDurationMinutes: workoutAgg._avg.durationMinutes ?? null
      },
      runs: {
        sessions: runningAgg._count._all,
        totalDistanceKm: decimalToNumber(runningAgg._sum.distanceKm as Prisma.Decimal | null),
        totalDurationMinutes: runningAgg._sum.durationMinutes ?? null,
        avgPse: runningAgg._avg.pse ?? null
      },
      metrics: {
        entries: metricAgg._count._all
      }
    });
  })
);

progressRouter.get(
  "/metrics",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const metrics = await prisma.metric.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" }
    });
    res.status(200).json(serializeDecimals(metrics));
  })
);

progressRouter.post(
  "/metrics",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const payload = metricCreateSchema.parse(req.body);

    const created = await prisma.metric.create({
      data: {
        userId: auth.userId,
        workoutSessionId: payload.workoutSessionId,
        runningSessionId: payload.runningSessionId,
        weekStart: payload.weekStart,
        monthRef: payload.monthRef,
        avgPse: toDecimal(payload.avgPse),
        totalLoadKg: toDecimal(payload.totalLoadKg),
        totalCardioMinutes: payload.totalCardioMinutes,
        totalDistanceKm: toDecimal(payload.totalDistanceKm),
        notes: payload.notes
      }
    });

    res.status(201).json(serializeDecimals(created));
  })
);

progressRouter.get(
  "/metrics/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = idParamsSchema.parse(req.params);

    const metric = await prisma.metric.findFirst({
      where: { id, userId: auth.userId }
    });
    if (!metric) throw new HttpError(404, "Metric not found.");

    res.status(200).json(serializeDecimals(metric));
  })
);

progressRouter.patch(
  "/metrics/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = idParamsSchema.parse(req.params);
    const payload = metricUpdateSchema.parse(req.body);

    const existing = await prisma.metric.findFirst({
      where: { id, userId: auth.userId }
    });
    if (!existing) throw new HttpError(404, "Metric not found.");

    const updated = await prisma.metric.update({
      where: { id },
      data: {
        workoutSessionId: payload.workoutSessionId,
        runningSessionId: payload.runningSessionId,
        weekStart: payload.weekStart,
        monthRef: payload.monthRef,
        avgPse: payload.avgPse !== undefined ? toDecimal(payload.avgPse) : undefined,
        totalLoadKg: payload.totalLoadKg !== undefined ? toDecimal(payload.totalLoadKg) : undefined,
        totalCardioMinutes: payload.totalCardioMinutes,
        totalDistanceKm: payload.totalDistanceKm !== undefined ? toDecimal(payload.totalDistanceKm) : undefined,
        notes: payload.notes
      }
    });

    res.status(200).json(serializeDecimals(updated));
  })
);

progressRouter.delete(
  "/metrics/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = idParamsSchema.parse(req.params);

    const existing = await prisma.metric.findFirst({
      where: { id, userId: auth.userId }
    });
    if (!existing) throw new HttpError(404, "Metric not found.");

    await prisma.metric.delete({ where: { id } });
    res.status(204).send();
  })
);

