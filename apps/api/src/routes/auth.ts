import { AuthProvider } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { verifyPassword } from "../auth/password.js";
import { requireAuth } from "../auth/middleware.js";
import { signAccessToken } from "../auth/token.js";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { serializeDecimals } from "../utils/decimal.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  provider: z.nativeEnum(AuthProvider).default(AuthProvider.LOCAL)
});

export const authRouter = Router();

authRouter.get(
  "/providers",
  asyncHandler(async (_req, res) => {
    res.status(200).json({
      providers: [
        { provider: "LOCAL", enabled: true, status: "active" },
        { provider: "GOOGLE", enabled: false, status: "planned" },
        { provider: "MICROSOFT", enabled: false, status: "planned" },
        { provider: "FACEBOOK", enabled: false, status: "planned" }
      ]
    });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    if (payload.provider !== AuthProvider.LOCAL) {
      throw new HttpError(501, `Provider ${payload.provider} is not implemented yet (auth skeleton).`);
    }

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
      include: { authIdentities: true }
    });

    if (!user || user.deletedAt) {
      throw new HttpError(401, "Invalid credentials.");
    }

    const localIdentity = user.authIdentities.find((identity) => identity.provider === AuthProvider.LOCAL);
    const passwordHash = localIdentity?.passwordHash ?? user.passwordHash;
    if (!passwordHash || !verifyPassword(payload.password, passwordHash)) {
      throw new HttpError(401, "Invalid credentials.");
    }

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    res.status(200).json({
      tokenType: "Bearer",
      accessToken,
      user: serializeDecimals({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword
      })
    });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth) throw new HttpError(401, "Unauthorized.");

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        trainerProfile: {
          include: { specialties: true }
        }
      }
    });

    if (!user || user.deletedAt) {
      throw new HttpError(404, "Authenticated user not found.");
    }

    res.status(200).json(serializeDecimals(user));
  })
);

