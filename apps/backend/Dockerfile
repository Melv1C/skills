FROM oven/bun:1 AS base
WORKDIR /app

# ---
FROM base AS prepare
COPY . .
# Prune the monorepo for the backend app
RUN bunx turbo prune backend --docker

# ---
FROM base AS dev-deps
# Install full dependencies (needed for prisma generate)
COPY --from=prepare /app/out/json/ .
RUN bun install --frozen-lockfile

# ---
FROM base AS builder
# Copy dependencies (including dev deps for Prisma)
COPY --from=dev-deps /app/ ./
# Copy source files
COPY --from=prepare /app/out/full/ .
# Ensure shared env schema is available for varlock imports
COPY .env.shared ./.env.shared

# Build shared workspace package needed by backend at runtime
RUN bun run build --filter=backend

# ---
FROM base AS prod-deps
# Install production dependencies for runtime
COPY --from=prepare /app/out/json/ .
RUN bun install --frozen-lockfile --production --ignore-scripts

# ---
FROM base AS runner
# Don't run production as root
RUN groupadd --system --gid 1001 group && useradd --system --uid 1001 --gid group user
RUN mkdir -p /home/user/.config && chown -R user:group /home/user
ENV HOME=/home/user
USER user

WORKDIR /app

# Copy application sources (pruned)
COPY --from=builder --chown=user:group /app/apps /app/apps
# COPY --from=builder --chown=user:group /app/packages /app/packages
COPY --from=builder --chown=user:group /app/package.json /app/turbo.json /app/
COPY --from=builder --chown=user:group /app/.env.shared /app/.env.shared

# Copy production dependencies
COPY --from=prod-deps --chown=user:group /app/node_modules /app/node_modules
COPY --from=prod-deps --chown=user:group /app/bun.lock /app/

CMD ["bun", "--filter=backend", "run", "start"]
