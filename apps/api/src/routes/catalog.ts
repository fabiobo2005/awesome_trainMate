import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db/prisma.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { serializeDecimals } from "../utils/decimal.js";

const exercisesQuerySchema = z.object({
  search: z.string().max(120).optional(),
  muscleGroup: z.string().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(120)
});

const exerciseIdSchema = z.object({
  id: z.string().cuid()
});

export const catalogRouter = Router();
catalogRouter.use(requireAuth);

catalogRouter.get(
  "/exercises",
  asyncHandler(async (req, res) => {
    const payload = exercisesQuerySchema.parse(req.query);
    const search = payload.search?.trim();
    const muscleGroup = payload.muscleGroup?.trim();

    const where: Prisma.ExerciseLibraryWhereInput = {
      ...(search ? { name: { contains: search } } : {}),
      ...(muscleGroup ? { muscleGroup: { contains: muscleGroup } } : {})
    };

    const exercises = await prisma.exerciseLibrary.findMany({
      where,
      orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
      take: payload.limit,
      include: {
        methodLinks: {
          include: {
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

    res.status(200).json(serializeDecimals(exercises));
  })
);

catalogRouter.get(
  "/exercises/:id",
  asyncHandler(async (req, res) => {
    const { id } = exerciseIdSchema.parse(req.params);
    const exercise = await prisma.exerciseLibrary.findUnique({
      where: { id },
      include: {
        methodLinks: {
          include: {
            trainingMethod: {
              select: {
                id: true,
                name: true,
                abbreviation: true,
                description: true
              }
            }
          }
        }
      }
    });

    res.status(200).json(serializeDecimals(exercise));
  })
);

catalogRouter.get(
  "/methods",
  asyncHandler(async (_req, res) => {
    const methods = await prisma.trainingMethod.findMany({
      orderBy: { name: "asc" }
    });
    res.status(200).json(serializeDecimals(methods));
  })
);

catalogRouter.get(
  "/muscle-groups",
  asyncHandler(async (_req, res) => {
    const groups = await prisma.exerciseLibrary.findMany({
      select: { muscleGroup: true },
      distinct: ["muscleGroup"],
      orderBy: { muscleGroup: "asc" }
    });

    res.status(200).json({
      muscleGroups: groups.map((entry) => entry.muscleGroup)
    });
  })
);
