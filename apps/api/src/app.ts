import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { HttpError } from "./errors/http-error.js";
import { openApiDocument } from "./docs/openapi.js";
import { apiRateLimitMiddleware } from "./middleware/rate-limit.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { errorHandler } from "./middleware/error-handler.js";
import { log } from "./observability/logger.js";
import { apiRouter } from "./routes/index.js";
import { healthRouter } from "./routes/health.js";

export const app = express();

const allowedCorsOrigins = env.CORS_ORIGINS.split(",")
  .map((value) => value.trim())
  .filter((value) => value.length > 0);
const allowAllOrigins = allowedCorsOrigins.includes("*");

app.use(helmet());
app.use(requestIdMiddleware);
app.use(express.json());
app.use(
  morgan((tokens, req, res) => {
    const status = Number(tokens.status(req, res) ?? "0");
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
      message: "http-request",
      requestId: req.requestId,
      method: tokens.method(req, res),
      path: tokens.url(req, res),
      status,
      durationMs: Number(tokens["response-time"](req, res) ?? "0"),
      contentLength: tokens.res(req, res, "content-length"),
      ip: tokens["remote-addr"](req, res)
    });
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowAllOrigins || allowedCorsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new HttpError(403, `Origin '${origin}' is not allowed by CORS policy.`));
    },
    credentials: true
  })
);

app.get("/", (_req, res) => {
  res.status(200).json({
    name: "trainmate-api",
    message: "Phase 4 backend API ready"
  });
});

app.use("/health", healthRouter);
app.get("/openapi.json", (_req, res) => {
  res.status(200).json(openApiDocument);
});
app.use("/api", apiRateLimitMiddleware, apiRouter);
app.use(errorHandler);

log("info", "api hardening configured", {
  allowedCorsOrigins: allowAllOrigins ? ["*"] : allowedCorsOrigins,
  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS
});

