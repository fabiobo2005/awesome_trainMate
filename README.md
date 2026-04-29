# TrainMate

Monorepo bootstrap for the TrainMate MVP.

## Stack

- **Frontend:** React + TypeScript + Material UI + Vite PWA (`apps/frontend`)
- **Backend API:** Node.js 22 + Express + TypeScript (`apps/api`)
- **AI/Analytics:** Python + FastAPI (`apps/ai`)
- **Infrastructure as Code:** Terraform (`infra`)

## Repository layout

```text
.
|-- apps/
|   |-- frontend/
|   |-- api/
|   `-- ai/
|-- infra/
|   |-- envs/dev/
|   `-- modules/
`-- .github/workflows/
```

## Quick start

```powershell
# Node workspaces
npm install
npm run build

# API local run
npm run dev:api

# Frontend local run
# copy apps/frontend/.env.example to apps/frontend/.env if needed
npm run dev:frontend

# Python service local run
python -m pip install -r apps\ai\requirements.txt
uvicorn apps.ai.app.main:app --reload --port 8090

# API OpenAPI
# http://localhost:8080/openapi.json
```

## Database bootstrap (Phase 3)

```powershell
# Prisma schema and client
npm run prisma:format -w apps/api
npm run prisma:validate -w apps/api
npm run prisma:generate -w apps/api

# Generate SQL migration from schema (no DB required)
npm run db:migrate:diff -w apps/api

# Seed (requires DATABASE_URL pointing to MySQL)
npm run db:seed -w apps/api
```

## Notes

- Infrastructure is defined in Terraform under `infra/envs/dev` for multi-subscription deployment.
- Database schema, SQL migration script, and seed logic live under `apps/api/prisma`.
- Node-to-Python AI contract is implemented in `apps/api/src/ai`.
- Azure subscription IDs and tenant IDs are parameterized in Terraform variables/examples.

## CI/CD (Phase 7)

Workflows:

- `.github/workflows/ci-bootstrap.yml`: quality checks (build/typecheck for Node workspaces + Python compile check).
- `.github/workflows/cd-azure-oidc.yml`: build/publish API+AI container images, deploy ACI API/AI, and deploy frontend to SWA using Azure OIDC login.

### Repository variables required for CD

- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID_FRONTEND`
- `AZURE_SUBSCRIPTION_ID_FRONTEND`
- `AZURE_CLIENT_ID_BACKEND`
- `AZURE_SUBSCRIPTION_ID_BACKEND`
- `AZURE_CLIENT_ID_DATA_AI`
- `AZURE_SUBSCRIPTION_ID_DATA_AI`
- `ACR_NAME`
- `ACI_API_RESOURCE_GROUP`
- `ACI_API_CONTAINER_GROUP`
- `ACI_AI_RESOURCE_GROUP`
- `ACI_AI_CONTAINER_GROUP`
- `SWA_RESOURCE_GROUP`
- `SWA_NAME`
- `FRONTEND_API_BASE_URL` (used at frontend build time)

### OIDC setup (GitHub -> Azure)

1. Create one Entra application/service principal per tier (frontend, backend, data-ai).
2. Add a federated credential in each app for this repository/workflow.
3. Grant least-privilege RBAC to each service principal in its subscription/resource groups.
4. Save the corresponding client IDs and subscription IDs as repository variables listed above.

## Security hardening (Phase 8)

### Implemented controls

- API runtime secret bootstrap from Azure Key Vault via managed identity (`DATABASE_URL`, `JWT_SECRET`).
- API global rate limiting with configurable window and request cap.
- Strict CORS allowlist policy driven by `CORS_ORIGINS`.
- Request ID propagation (`x-request-id`) with structured JSON logs in API and AI services.
- Terraform-created Key Vault secrets for API database URL and JWT secret.

### Threat notes

- **Credential leakage risk:** mitigated by removing hard dependency on plaintext app secrets and loading sensitive runtime values from Key Vault.
- **Abuse/DoS burst risk on public API paths:** mitigated with global API rate limiting and explicit `429` responses.
- **Cross-origin misuse risk:** mitigated through explicit CORS allowlist instead of permissive wildcard defaults.
- **Low traceability risk during incident response:** mitigated with request correlation IDs and structured logs in both API and AI services.

## Collaboration workflow

- `main` is the protected integration branch.
- New changes should be created in feature/fix/chore branches and merged via Pull Request.
- Contribution process and PR checklist: `CONTRIBUTING.md` and `.github/pull_request_template.md`.

