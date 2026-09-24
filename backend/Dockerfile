# =============================================================
# TDA Pekanbaru 9.0 — Aplikasi Next.js 16 (UI SSR + API) · MariaDB · Cloudflare R2
# Base directory di Coolify: /backend  |  Build pack: Dockerfile  |  Port: 3000
# Container ini TIDAK perlu domain publik: frontend (Nginx) memproksi semua path
# ke container ini lewat alias jaringan internal Coolify (backend-tdapku:3000).
# =============================================================
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# Coolify menyuntikkan NODE_ENV=production saat build; Yarn 1 lalu melewatkan devDependencies
# (tailwindcss, @tailwindcss/postcss, typescript) yang WAJIB ada untuk `next build`.
# Paksa NODE_ENV=development + --production=false agar semua dependensi terpasang.
ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=development YARN_PRODUCTION=false
COPY package.json yarn.lock* .npmrc ./
RUN yarn install --frozen-lockfile --non-interactive --production=false \
 || yarn install --non-interactive --production=false

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 CI=true NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Skema SQL -> modul TS, lalu build Next standalone. Tidak butuh DATABASE_URL saat build.
RUN yarn build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Jakarta \
    STORAGE_DRIVER=s3 \
    COOKIE_SECURE=auto
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends curl ca-certificates >/dev/null && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
RUN mkdir -p /app/data/uploads && chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -fsS http://127.0.0.1:${PORT}/api/health >/dev/null || exit 1
CMD ["node", "server.js"]
