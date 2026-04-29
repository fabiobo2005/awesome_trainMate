import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../errors/http-error.js";

export const apiRateLimitMiddleware = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req: Request, _res: Response, next: NextFunction, options) => {
    next(
      new HttpError(429, "Rate limit exceeded. Try again later.", {
        windowMs: options.windowMs,
        limit: options.limit
      })
    );
  }
});
