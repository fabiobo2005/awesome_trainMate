import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const headerValue = req.header("x-request-id");
  const requestId = headerValue && headerValue.trim() !== "" ? headerValue.trim().slice(0, 128) : randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  next();
}
