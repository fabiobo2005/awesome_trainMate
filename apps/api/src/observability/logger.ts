import { env } from "../config/env.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const severityOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function shouldLog(level: LogLevel): boolean {
  return severityOrder[level] >= severityOrder[env.LOG_LEVEL];
}

function writeLog(payload: Record<string, unknown>): void {
  const line = JSON.stringify(payload);
  const level = payload.level;
  if (level === "warn") {
    console.warn(line);
    return;
  }
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
}

export function log(level: LogLevel, message: string, context: Record<string, unknown> = {}): void {
  if (!shouldLog(level)) return;

  writeLog({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  });
}
