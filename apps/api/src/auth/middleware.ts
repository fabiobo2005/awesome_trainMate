import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors/http-error.js";
import { verifyAccessToken } from "./token.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.header("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new HttpError(401, "Missing or invalid Authorization header."));
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      role: payload.role,
      email: payload.email
    };
    next();
  } catch {
    next(new HttpError(401, "Invalid access token."));
  }
}

