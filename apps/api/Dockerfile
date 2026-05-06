FROM node:22-alpine AS builder
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN npm ci

COPY . .

RUN npm run prisma:generate -w apps/api && npm run build -w apps/api && npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /workspace

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /workspace/package.json ./package.json
COPY --from=builder /workspace/package-lock.json ./package-lock.json
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=builder /workspace/apps/api/dist ./apps/api/dist
COPY --from=builder /workspace/apps/api/prisma ./apps/api/prisma
COPY --from=builder /workspace/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=builder /workspace/apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
COPY --from=builder /workspace/*.xlsx ./

RUN chmod +x ./apps/api/docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/workspace/apps/api/docker-entrypoint.sh"]

