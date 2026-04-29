import "dotenv/config";
import { z } from "zod";

const optionalUrlSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().url().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must have at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  AI_SERVICE_BASE_URL: z.string().url().default("http://localhost:8090"),
  AI_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  KEY_VAULT_URI: optionalUrlSchema,
  KEY_VAULT_DATABASE_URL_SECRET_NAME: z.string().default("trainmate-database-url"),
  KEY_VAULT_JWT_SECRET_SECRET_NAME: z.string().default("trainmate-jwt-secret"),
  KEY_VAULT_AI_SERVICE_BASE_URL_SECRET_NAME: z.string().default("trainmate-ai-service-base-url")
});

export const env = envSchema.parse(process.env);

