# ============================================================================
# ShopSphere-DBMS · web app image
# Runs the production build with `next start` (works without standalone
# output, which needs symlink privileges unavailable on Windows dev boxes).
# ============================================================================

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm exec prisma generate && pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
