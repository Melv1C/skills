FROM oven/bun:1 AS base
WORKDIR /app

# ---
FROM base AS prepare
COPY . .
# Prune the monorepo for the frontend app
RUN bunx turbo prune frontend --docker

# ---
FROM base AS installer
# First install the dependencies (as they change less often)
COPY --from=prepare /app/out/json/ .
# Remove package-lock.json to avoid conflicts
RUN rm -f package-lock.json
# Install dependencies
RUN bun install --frozen-lockfile

# ---
FROM base AS builder
# Copy dependencies
COPY --from=installer /app/ .
# Copy source files
COPY --from=prepare /app/out/full/ .
# Ensure shared env schema is available for varlock imports
COPY .env.shared ./.env.shared

ARG APP_ENV=production

# Build the frontend
RUN APP_ENV=${APP_ENV} bun run build --filter=frontend

# ---
FROM nginx:alpine AS runner
# Copy built static files to nginx
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
