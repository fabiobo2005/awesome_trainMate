# TrainMate

Monorepo bootstrap for the TrainMate MVP.

## Stack

- **Frontend:** React + TypeScript + Material UI + Vite PWA (`apps/frontend`)
- **Backend API:** Node.js 22 + Express + TypeScript (`apps/api`)
- **AI/Analytics:** Python + FastAPI (`apps/ai`)
- **Infrastructure as Code:** Bicep + Azure Developer CLI (`infra/`, `azure.yaml`)

## Repository layout

```text
.
|-- apps/
|   |-- frontend/
|   |-- api/
|   `-- ai/
|-- infra/
|   |-- main.bicep
|   |-- resources.bicep
|   `-- core/
|-- azure.yaml
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

- Infrastructure is defined in Bicep under `infra/` and orchestrated by `azd` (`azure.yaml`).
- Database schema, SQL migration script, and seed logic live under `apps/api/prisma`.
- Node-to-Python AI contract is implemented in `apps/api/src/ai`.
- Single-subscription dev environment (consolidated). Production split can be reintroduced later by parameterizing `main.bicep`.

## Deploy with azd

```powershell
# One-time: install azd (https://aka.ms/azd) and log in
azd auth login

# Provision and deploy in one shot (creates RG, ACR, MySQL, KV, Container Apps, SWA)
azd up

# Update apps only
azd deploy

# Destroy everything for that environment
azd down --purge
```

Required environment values when running locally:
- `AZURE_ENV_NAME` (e.g. `dev`)
- `AZURE_LOCATION` (e.g. `canadacentral`)
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_PRINCIPAL_ID` (your user object id, `az ad signed-in-user show --query id -o tsv`)

## CI/CD (Phase 7)

Workflows:

- `.github/workflows/ci-bootstrap.yml`: quality checks (build/typecheck for Node workspaces + Python compile check).
- `.github/workflows/cd-azure-oidc.yml`: runs `azd provision` and `azd deploy` against the dev subscription using OIDC login (no secrets stored).

### Repository variables required for CD

| Variable | Purpose |
|---|---|
| `AZURE_TENANT_ID` | Entra tenant containing the dev subscription |
| `AZURE_SUBSCRIPTION_ID` | Subscription where dev resources will be created |
| `AZURE_CLIENT_ID` | App registration with federated credential for this repo + Contributor on the sub |
| `AZURE_PRINCIPAL_ID` | Object ID of a human admin (granted Key Vault Secrets Officer) |

### OIDC setup (GitHub -> Azure)

1. Create one Entra application/service principal in your tenant.
2. Add a federated credential pointing at this repo (subject `repo:fabiobo2005/awesome_trainMate:ref:refs/heads/main` and `repo:fabiobo2005/awesome_trainMate:environment:dev`).
3. Grant the SP **Contributor** + **User Access Administrator** on the dev subscription (UAA is needed because the Bicep creates role assignments).
4. Set the four repo variables above.

## Security hardening (Phase 8)

### Implemented controls

- API runtime secret bootstrap from Azure Key Vault via managed identity (`DATABASE_URL`, `JWT_SECRET`).
- API global rate limiting with configurable window and request cap.
- Strict CORS allowlist policy driven by `CORS_ORIGINS`.
- Request ID propagation (`x-request-id`) with structured JSON logs in API and AI services.
- Bicep-created Key Vault with RBAC; API consumes secrets via Container App secret references.

### Threat notes

- **Credential leakage risk:** mitigated by removing hard dependency on plaintext app secrets and loading sensitive runtime values from Key Vault.
- **Abuse/DoS burst risk on public API paths:** mitigated with global API rate limiting and explicit `429` responses.
- **Cross-origin misuse risk:** mitigated through explicit CORS allowlist instead of permissive wildcard defaults.
- **Low traceability risk during incident response:** mitigated with request correlation IDs and structured logs in both API and AI services.

## Collaboration workflow

- `main` is the protected integration branch.
- New changes should be created in feature/fix/chore branches and merged via Pull Request.
- Contribution process and PR checklist: `CONTRIBUTING.md` and `.github/pull_request_template.md`.
