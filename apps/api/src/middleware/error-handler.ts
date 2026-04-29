import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../errors/http-error.js";
import { log } from "../observability/logger.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const requestId = _req.requestId;

  if (err instanceof ZodError) {
    log("warn", "request validation failed", {
      requestId,
      issuesCount: err.issues.length
    });
    res.status(400).json({
      error: "ValidationError",
      message: "Request payload validation failed.",
      requestId,
      issues: err.issues
    });
    return;
  }

  if (err instanceof HttpError) {
    const level = err.statusCode >= 500 ? "error" : "warn";
    log(level, "http error response", {
      requestId,
      statusCode: err.statusCode,
      details: err.details
    });
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      requestId,
      details: err.details
    });
    return;
  }

  log("error", "unexpected internal error", {
    requestId,
    reason: err instanceof Error ? err.message : "Unknown error"
  });
  res.status(500).json({
    error: "InternalServerError",
    message: "An unexpected error occurred.",
    requestId
  });
}

