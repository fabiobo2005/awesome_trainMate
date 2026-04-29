import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { serializeDecimals, toDecimal } from "../utils/decimal.js";

const idParamsSchema = z.object({
  id: z.string().cuid()
});

const runCreateSchema = z.object({
  sessionDate: z.coerce.date().optional(),
  distanceKm: z.number().min(0).optional(),
  durationMinutes: z.number().int().min(1).max(600).optional(),
  pace: z.string().max(30).optional(),
  avgHeartRate: z.number().int().min(1).max(260).optional(),
  pse: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(4000).optional()
});

const runUpdateSchema = runCreateSchema.partial();

export const runsRouter = Router();
runsRouter.use(requireAuth);

runsRouter.get(
  "/sessions",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const sessions = await prisma.runningSession.findMany({
      where: { userId: auth.userId },
      orderBy: { sessionDate: "desc" }
    });

    res.status(200).json(serializeDecimals(sessions));
  })
);

runsRouter.post(
  "/sessions",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const payload = runCreateSchema.parse(req.body);

    const created = await prisma.runningSession.create({
      data: {
        userId: auth.userId,
        sessionDate: payload.sessionDate ?? new Date(),
        distanceKm: toDecimal(payload.distanceKm),
        durationMinutes: payload.durationMinutes,
        pace: payload.pace,
        avgHeartRate: payload.avgHeartRate,
        pse: payload.pse,
        notes: payload.notes
      }
    });

    res.status(201).json(serializeDecimals(created));
  })
);

runsRouter.get(
  "/sessions/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = idParamsSchema.parse(req.params);

    const session = await prisma.runningSession.findFirst({
      where: { id, userId: auth.userId }
    });
    if (!session) throw new HttpError(404, "Running session not found.");

    res.status(200).json(serializeDecimals(session));
  })
);

runsRouter.patch(
  "/sessions/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = idParamsSchema.parse(req.params);
    const payload = runUpdateSchema.parse(req.body);

    const existing = await prisma.runningSession.findFirst({
      where: { id, userId: auth.userId }
    });
    if (!existing) throw new HttpError(404, "Running session not found.");

    const updated = await prisma.runningSession.update({
      where: { id },
      data: {
        sessionDate: payload.sessionDate,
        distanceKm: payload.distanceKm !== undefined ? toDecimal(payload.distanceKm) : undefined,
        durationMinutes: payload.durationMinutes,
        pace: payload.pace,
        avgHeartRate: payload.avgHeartRate,
        pse: payload.pse,
        notes: payload.notes
      }
    });

    res.status(200).json(serializeDecimals(updated));
  })
);

runsRouter.delete(
  "/sessions/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = idParamsSchema.parse(req.params);

    const existing = await prisma.runningSession.findFirst({
      where: { id, userId: auth.userId }
    });
    if (!existing) throw new HttpError(404, "Running session not found.");

    await prisma.runningSession.delete({ where: { id } });
    res.status(204).send();
  })
);

