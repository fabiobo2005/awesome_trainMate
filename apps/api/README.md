# TrainMate API (Phases 3, 4, 5 and 6)

## Phase 4/5 endpoints

- `GET /health`
- `GET /openapi.json`
- `GET /api/auth/providers`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/ai/health`
- `POST /api/ai/recommendation`
- `POST /api/ai/progress-summary`
- `POST /api/ai/load-analysis`
- `GET /api/catalog/exercises`
- `GET /api/catalog/exercises/:id`
- `GET /api/catalog/methods`
- `GET /api/catalog/muscle-groups`
- `GET|POST /api/plans/blocks`
- `PATCH|DELETE /api/plans/blocks/:id`
- `POST /api/plans/blocks/:blockId/days`
- `PATCH|DELETE /api/plans/days/:dayId`
- `POST /api/plans/days/:dayId/microcycles`
- `PATCH|DELETE /api/plans/microcycles/:microcycleId`
- `POST /api/plans/microcycles/:microcycleId/exercises`
- `PATCH|DELETE /api/plans/exercises/:exerciseId`
- `GET|PATCH /api/profile/me`
- `GET|POST /api/profile/me/anamnesis`
- `GET|PATCH|DELETE /api/profile/me/anamnesis/:id`
- `GET|POST /api/profile/me/goals`
- `GET|PATCH|DELETE /api/profile/me/goals/:id`
- `GET|POST /api/workouts/sessions`
- `GET|PATCH|DELETE /api/workouts/sessions/:id`
- `GET|POST /api/workouts/sessions/:sessionId/sets`
- `PATCH|DELETE /api/workouts/sets/:setId`
- `GET|POST /api/runs/sessions`
- `GET|PATCH|DELETE /api/runs/sessions/:id`
- `GET /api/progress/summary`
- `GET|POST /api/progress/metrics`
- `GET|PATCH|DELETE /api/progress/metrics/:id`

## Database (Prisma + MySQL)

### Environment

Use `.env` with:

```env
DATABASE_URL=mysql://trainmateadmin:REPLACE_WITH_SECURE_PASSWORD@127.0.0.1:3306/trainmate
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=8h
AI_SERVICE_BASE_URL=http://localhost:8090
AI_SERVICE_TIMEOUT_MS=5000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=120
KEY_VAULT_URI=
KEY_VAULT_DATABASE_URL_SECRET_NAME=trainmate-database-url
KEY_VAULT_JWT_SECRET_SECRET_NAME=trainmate-jwt-secret
KEY_VAULT_AI_SERVICE_BASE_URL_SECRET_NAME=trainmate-ai-service-base-url
```

When `KEY_VAULT_URI` is configured, the API resolves missing `DATABASE_URL` and `JWT_SECRET` at startup using managed identity and Azure Key Vault secrets.

### Prisma commands

```powershell
npm run prisma:format -w apps/api
npm run prisma:validate -w apps/api
npm run prisma:generate -w apps/api
```

### Generate SQL migration from schema (without DB connection)

```powershell
npm run db:migrate:diff -w apps/api
```

### Seed

```powershell
npm run db:seed -w apps/api
```

The seed creates:

- default users: `admin`, `trainer`, `aluno` (all with forced password change),
- local auth identities,
- trainer profile/specialties and student-trainer association,
- 20 training methods,
- 136 exercises extracted from the tagged training plan Excel files.

