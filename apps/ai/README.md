# TrainMate AI service

## Local run

```powershell
python -m pip install -r apps\ai\requirements.txt
uvicorn apps.ai.app.main:app --reload --port 8090
```

## Endpoints (Phase 5)

- `GET /health`
- `GET /contract`
- `POST /recommendation`
- `POST /progress-summary`
- `POST /load-analysis`

## Node-to-Python contract

Node backend sends/receives typed payloads through:

- `apps/api/src/ai/contract.ts`
- `apps/api/src/ai/client.ts`

Schema version returned by Python health endpoint: `v1`.

