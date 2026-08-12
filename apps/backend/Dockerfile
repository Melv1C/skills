FROM oven/bun:1 AS base
WORKDIR /app

# ---
FROM base AS prepare
COPY . .
# Prune the monorepo for the backend app
RUN bunx turbo prune backend --docker

# ---
FROM base AS builder
COPY --from=prepare /app/out/json/ .
RUN bun install --frozen-lockfile
COPY --from=prepare /app/out/full/ .
COPY .env.shared ./.env.shared

# Generate Prisma client + zod schemas (needs APP_ENV for varlock)
ENV APP_ENV=development
RUN bun run prisma:generate

# ---
FROM base AS runner
RUN groupadd --system --gid 1001 group && useradd --system --uid 1001 --gid group user
RUN mkdir -p /home/user/.config && chown -R user:group /home/user
ENV HOME=/home/user
USER user

WORKDIR /app

# Runtime needs source, generated client, and full deps (prisma CLI for migrate)
COPY --from=builder --chown=user:group /app/apps /app/apps
COPY --from=builder --chown=user:group /app/node_modules /app/node_modules
COPY --from=builder --chown=user:group /app/package.json /app/turbo.json /app/bun.lock /app/
COPY --from=builder --chown=user:group /app/.env.shared /app/.env.shared

ENV APP_ENV=development
CMD ["bun", "--filter=backend", "run", "start"]
