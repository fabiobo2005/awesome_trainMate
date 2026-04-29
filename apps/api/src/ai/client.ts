import { z } from "zod";
import { env } from "../config/env.js";
import { HttpError } from "../errors/http-error.js";
import {
  type AiHealthResponse,
  type LoadAnalysisInput,
  type LoadAnalysisResponse,
  type ProgressSummaryInput,
  type ProgressSummaryResponse,
  type RecommendationInput,
  type RecommendationResponse,
  aiHealthResponseSchema,
  loadAnalysisResponseSchema,
  progressSummaryResponseSchema,
  recommendationResponseSchema
} from "./contract.js";

const baseUrl = env.AI_SERVICE_BASE_URL.replace(/\/+$/, "");

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(502, "AI service returned non-JSON response.", {
      status: response.status,
      body: text.slice(0, 500)
    });
  }
}

async function requestAi<T>(
  path: string,
  init: RequestInit,
  schema: z.ZodSchema<T>,
  actionLabel: string
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_SERVICE_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      },
      signal: controller.signal
    });

    const payload = await parseJsonResponse(response);
    if (!response.ok) {
      throw new HttpError(502, `AI service failed while processing ${actionLabel}.`, {
        status: response.status,
        payload
      });
    }

    return schema.parse(payload);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new HttpError(502, `Invalid AI ${actionLabel} response format.`, error.issues);
    }
    throw new HttpError(502, `Unable to reach AI service for ${actionLabel}.`, {
      baseUrl,
      reason: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAiHealth(): Promise<AiHealthResponse> {
  return requestAi("/health", { method: "GET" }, aiHealthResponseSchema, "health check");
}

export async function requestRecommendation(payload: RecommendationInput): Promise<RecommendationResponse> {
  return requestAi(
    "/recommendation",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    recommendationResponseSchema,
    "recommendation"
  );
}

export async function requestProgressSummary(payload: ProgressSummaryInput): Promise<ProgressSummaryResponse> {
  return requestAi(
    "/progress-summary",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    progressSummaryResponseSchema,
    "progress summary"
  );
}

export async function requestLoadAnalysis(payload: LoadAnalysisInput): Promise<LoadAnalysisResponse> {
  return requestAi(
    "/load-analysis",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    loadAnalysisResponseSchema,
    "load analysis"
  );
}

