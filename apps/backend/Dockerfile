# syntax=docker/dockerfile:1
# Build konteksti — repo ildizi:  docker build -f apps/backend/Dockerfile .
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
# Prisma engine'lari OpenSSL'ga muhtoj.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g corepack@latest && corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/web/package.json apps/web/
COPY packages/shared-types/package.json packages/shared-types/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter backend...
COPY apps/backend apps/backend
RUN pnpm --filter backend exec prisma generate && pnpm --filter backend build
# Mustaqil (workspace'siz) papka: package.json + prisma/ + node_modules. Dev dependency'lar ham qoladi —
# `prisma` CLI migratsiya uchun, `tsx` seed uchun runtime'da kerak.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter backend deploy --legacy /out \
  && cd /out && pnpm exec prisma generate \
  && rm -rf /out/src /out/test /out/dist && cp -r /repo/apps/backend/dist /out/dist

FROM base AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/v1').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/main.js"]
