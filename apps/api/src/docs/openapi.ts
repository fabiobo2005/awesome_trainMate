export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "TrainMate API",
    version: "0.6.0",
    description:
      "Phase 6 API with auth/profile/workouts/runs/progress, Node-to-Python AI contract, exercise catalog and training plans."
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  },
  paths: {
    "/health": {
      get: {
        summary: "Health check"
      }
    },
    "/api/auth/providers": {
      get: {
        summary: "List configured identity providers (skeleton)"
      }
    },
    "/api/auth/login": {
      post: {
        summary: "Login with provider identity skeleton (local email/password for MVP)"
      }
    },
    "/api/auth/me": {
      get: {
        summary: "Get current authenticated user",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/ai/health": {
      get: {
        summary: "Check Python AI service health through Node contract"
      }
    },
    "/api/ai/recommendation": {
      post: {
        summary: "Get training recommendation from AI service",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/ai/progress-summary": {
      post: {
        summary: "Get AI progress summary from aggregated user metrics",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/ai/load-analysis": {
      post: {
        summary: "Get AI load analysis by muscle group",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/catalog/exercises": {
      get: {
        summary: "List exercise library with methods",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/catalog/exercises/{id}": {
      get: {
        summary: "Get exercise library details",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/catalog/methods": {
      get: {
        summary: "List training methods",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/catalog/muscle-groups": {
      get: {
        summary: "List available muscle groups from exercise library",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/plans/blocks": {
      get: {
        summary: "List training blocks visible to the authenticated user",
        security: [{ bearerAuth: [] }]
      },
      post: {
        summary: "Create training block",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/plans/blocks/{id}": {
      patch: {
        summary: "Update training block",
        security: [{ bearerAuth: [] }]
      },
      delete: {
        summary: "Delete training block",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/plans/blocks/{blockId}/days": {
      post: {
        summary: "Create training day in block",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/plans/days/{dayId}": {
      patch: {
        summary: "Update training day",
        security: [{ bearerAuth: [] }]
      },
      delete: {
        summary: "Delete training day",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/plans/days/{dayId}/microcycles": {
      post: {
        summary: "Create microcycle in training day",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/plans/microcycles/{microcycleId}": {
      patch: {
        summary: "Update microcycle",
        security: [{ bearerAuth: [] }]
      },
      delete: {
        summary: "Delete microcycle",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/plans/microcycles/{microcycleId}/exercises": {
      post: {
        summary: "Create planned exercise in microcycle",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/plans/exercises/{exerciseId}": {
      patch: {
        summary: "Update planned exercise",
        security: [{ bearerAuth: [] }]
      },
      delete: {
        summary: "Delete planned exercise",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/profile/me": {
      get: {
        summary: "Get own profile",
        security: [{ bearerAuth: [] }]
      },
      patch: {
        summary: "Update own profile",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/profile/me/anamnesis": {
      get: {
        summary: "List own anamnesis entries",
        security: [{ bearerAuth: [] }]
      },
      post: {
        summary: "Create anamnesis entry",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/profile/me/anamnesis/{id}": {
      get: {
        summary: "Get anamnesis entry",
        security: [{ bearerAuth: [] }]
      },
      patch: {
        summary: "Update anamnesis entry",
        security: [{ bearerAuth: [] }]
      },
      delete: {
        summary: "Delete anamnesis entry",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/profile/me/goals": {
      get: {
        summary: "List own goals",
        security: [{ bearerAuth: [] }]
      },
      post: {
        summary: "Create goal",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/profile/me/goals/{id}": {
      get: {
        summary: "Get goal",
        security: [{ bearerAuth: [] }]
      },
      patch: {
        summary: "Update goal",
        security: [{ bearerAuth: [] }]
      },
      delete: {
        summary: "Delete goal",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/workouts/sessions": {
      get: {
        summary: "List workout sessions",
        security: [{ bearerAuth: [] }]
      },
      post: {
        summary: "Create workout session",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/workouts/sessions/{id}": {
      get: {
        summary: "Get workout session",
        security: [{ bearerAuth: [] }]
      },
      patch: {
        summary: "Update workout session",
        security: [{ bearerAuth: [] }]
      },
      delete: {
        summary: "Delete workout session",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/workouts/sessions/{sessionId}/sets": {
      get: {
        summary: "List workout sets of a session",
        security: [{ bearerAuth: [] }]
      },
      post: {
        summary: "Create workout set in session",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/workouts/sets/{setId}": {
      patch: {
        summary: "Update workout set",
        security: [{ bearerAuth: [] }]
      },
      delete: {
        summary: "Delete workout set",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/runs/sessions": {
      get: {
        summary: "List running sessions",
        security: [{ bearerAuth: [] }]
      },
      post: {
        summary: "Create running session",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/runs/sessions/{id}": {
      get: {
        summary: "Get running session",
        security: [{ bearerAuth: [] }]
      },
      patch: {
        summary: "Update running session",
        security: [{ bearerAuth: [] }]
      },
      delete: {
        summary: "Delete running session",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/progress/summary": {
      get: {
        summary: "Aggregate progress summary",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/progress/metrics": {
      get: {
        summary: "List progress metrics records",
        security: [{ bearerAuth: [] }]
      },
      post: {
        summary: "Create progress metric record",
        security: [{ bearerAuth: [] }]
      }
    },
    "/api/progress/metrics/{id}": {
      get: {
        summary: "Get progress metric record",
        security: [{ bearerAuth: [] }]
      },
      patch: {
        summary: "Update progress metric record",
        security: [{ bearerAuth: [] }]
      },
      delete: {
        summary: "Delete progress metric record",
        security: [{ bearerAuth: [] }]
      }
    }
  }
} as const;

