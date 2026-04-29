import { GoalType, TrainingLevel } from "@prisma/client";
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

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(120).optional()
});

const anamnesisCreateSchema = z.object({
  trainingLevel: z.nativeEnum(TrainingLevel).optional(),
  age: z.number().int().min(10).max(120).optional(),
  heightCm: z.number().positive().max(300).optional(),
  weightKg: z.number().positive().max(500).optional(),
  bodyFatPct: z.number().min(0).max(100).optional(),
  injuries: z.string().max(4000).optional(),
  limitations: z.string().max(4000).optional(),
  medicalNotes: z.string().max(4000).optional(),
  isCurrent: z.boolean().optional()
});

const anamnesisUpdateSchema = anamnesisCreateSchema.partial();

const goalsCreateSchema = z.object({
  type: z.nativeEnum(GoalType),
  description: z.string().max(4000).optional(),
  targetValue: z.number().positive().optional(),
  targetDate: z.coerce.date().optional(),
  isActive: z.boolean().optional()
});

const goalsUpdateSchema = goalsCreateSchema.partial();

const queryCurrentSchema = z.object({
  current: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      return value === "true";
    })
});

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const profile = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        trainerProfile: {
          include: { specialties: true }
        },
        goals: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!profile || profile.deletedAt) throw new HttpError(404, "Profile not found.");
    res.status(200).json(serializeDecimals(profile));
  })
);

profileRouter.patch(
  "/me",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const payload = updateProfileSchema.parse(req.body);
    if (Object.keys(payload).length === 0) {
      throw new HttpError(400, "No profile fields provided.");
    }

    const updated = await prisma.user.update({
      where: { id: auth.userId },
      data: payload
    });

    res.status(200).json(serializeDecimals(updated));
  })
);

profileRouter.get(
  "/me/anamnesis",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { current } = queryCurrentSchema.parse(req.query);

    const entries = await prisma.anamnesis.findMany({
      where: {
        userId: auth.userId,
        ...(current !== undefined ? { isCurrent: current } : {})
      },
      orderBy: [{ isCurrent: "desc" }, { recordedAt: "desc" }]
    });

    res.status(200).json(serializeDecimals(entries));
  })
);

profileRouter.post(
  "/me/anamnesis",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const payload = anamnesisCreateSchema.parse(req.body);

    const created = await prisma.$transaction(async (tx) => {
      if (payload.isCurrent === true) {
        await tx.anamnesis.updateMany({
          where: { userId: auth.userId, isCurrent: true },
          data: { isCurrent: false }
        });
      }

      return tx.anamnesis.create({
        data: {
          userId: auth.userId,
          trainingLevel: payload.trainingLevel,
          age: payload.age,
          heightCm: toDecimal(payload.heightCm),
          weightKg: toDecimal(payload.weightKg),
          bodyFatPct: toDecimal(payload.bodyFatPct),
          injuries: payload.injuries,
          limitations: payload.limitations,
          medicalNotes: payload.medicalNotes,
          isCurrent: payload.isCurrent ?? true
        }
      });
    });

    res.status(201).json(serializeDecimals(created));
  })
);

profileRouter.get(
  "/me/anamnesis/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = idParamsSchema.parse(req.params);

    const entry = await prisma.anamnesis.findFirst({
      where: {
        id,
        userId: auth.userId
      }
    });

    if (!entry) throw new HttpError(404, "Anamnesis entry not found.");
    res.status(200).json(serializeDecimals(entry));
  })
);

profileRouter.patch(
  "/me/anamnesis/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = idParamsSchema.parse(req.params);
    const payload = anamnesisUpdateSchema.parse(req.body);

    const existing = await prisma.anamnesis.findFirst({
      where: { id, userId: auth.userId }
    });
    if (!existing) throw new HttpError(404, "Anamnesis entry not found.");

    const updated = await prisma.$transaction(async (tx) => {
      if (payload.isCurrent === true) {
        await tx.anamnesis.updateMany({
          where: { userId: auth.userId, isCurrent: true, id: { not: id } },
          data: { isCurrent: false }
        });
      }

      return tx.anamnesis.update({
        where: { id },
        data: {
          trainingLevel: payload.trainingLevel,
          age: payload.age,
          heightCm: payload.heightCm !== undefined ? toDecimal(payload.heightCm) : undefined,
          weightKg: payload.weightKg !== undefined ? toDecimal(payload.weightKg) : undefined,
          bodyFatPct: payload.bodyFatPct !== undefined ? toDecimal(payload.bodyFatPct) : undefined,
          injuries: payload.injuries,
          limitations: payload.limitations,
          medicalNotes: payload.medicalNotes,
          isCurrent: payload.isCurrent
        }
      });
    });

    res.status(200).json(serializeDecimals(updated));
  })
);

profileRouter.delete(
  "/me/anamnesis/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = idParamsSchema.parse(req.params);

    const existing = await prisma.anamnesis.findFirst({
      where: { id, userId: auth.userId }
    });
    if (!existing) throw new HttpError(404, "Anamnesis entry not found.");

    await prisma.anamnesis.delete({ where: { id } });
    res.status(204).send();
  })
);

profileRouter.get(
  "/me/goals",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const goals = await prisma.goal.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" }
    });
    res.status(200).json(serializeDecimals(goals));
  })
);

profileRouter.post(
  "/me/goals",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const payload = goalsCreateSchema.parse(req.body);

    const created = await prisma.goal.create({
      data: {
        userId: auth.userId,
        type: payload.type,
        description: payload.description,
        targetValue: toDecimal(payload.targetValue),
        targetDate: payload.targetDate,
        isActive: payload.isActive ?? true
      }
    });

    res.status(201).json(serializeDecimals(created));
  })
);

profileRouter.get(
  "/me/goals/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = idParamsSchema.parse(req.params);

    const goal = await prisma.goal.findFirst({
      where: { id, userId: auth.userId }
    });
    if (!goal) throw new HttpError(404, "Goal not found.");

    res.status(200).json(serializeDecimals(goal));
  })
);

profileRouter.patch(
  "/me/goals/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = idParamsSchema.parse(req.params);
    const payload = goalsUpdateSchema.parse(req.body);

    const existing = await prisma.goal.findFirst({
      where: { id, userId: auth.userId }
    });
    if (!existing) throw new HttpError(404, "Goal not found.");

    const updated = await prisma.goal.update({
      where: { id },
      data: {
        type: payload.type,
        description: payload.description,
        targetValue: payload.targetValue !== undefined ? toDecimal(payload.targetValue) : undefined,
        targetDate: payload.targetDate,
        isActive: payload.isActive
      }
    });

    res.status(200).json(serializeDecimals(updated));
  })
);

profileRouter.delete(
  "/me/goals/:id",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const { id } = idParamsSchema.parse(req.params);

    const existing = await prisma.goal.findFirst({
      where: { id, userId: auth.userId }
    });
    if (!existing) throw new HttpError(404, "Goal not found.");

    await prisma.goal.delete({ where: { id } });
    res.status(204).send();
  })
);

