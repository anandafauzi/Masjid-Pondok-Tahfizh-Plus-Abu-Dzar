# syntax=docker/dockerfile:1

# ---------- Base ----------
FROM node:20-alpine AS base
WORKDIR /app
# Prisma membutuhkan OpenSSL di Alpine.
RUN apk add --no-cache openssl libc6-compat
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- Dependencies ----------
FROM base AS deps
# Schema disalin lebih dulu agar `postinstall: prisma generate` berhasil.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --include=dev

# ---------- Builder ----------
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- Runner ----------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Beri lokasi cache yang writable untuk Prisma/Node saat berjalan non-root.
ENV HOME=/tmp

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Prisma CLI + generated client disertakan agar `db push` dan seed bisa
# dijalankan di dalam container produksi (lihat DEPLOYMENT.md).
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Entrypoint: sinkronkan skema + seed (idempotent) sebelum server start.
# Bisa dilewati dengan RUN_MIGRATIONS=false / RUN_SEED=false.
RUN printf '%s\n' \
    '#!/bin/sh' \
    'set -e' \
    'if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then' \
    '  echo "[entrypoint] Sinkronisasi skema database..."' \
    '  node node_modules/prisma/build/index.js db push --skip-generate' \
    '  if [ "${RUN_SEED:-true}" = "true" ]; then' \
    '    echo "[entrypoint] Menjalankan seed..."' \
    '    node prisma/seed.js' \
    '  fi' \
    'fi' \
    'exec "$@"' \
    > /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
