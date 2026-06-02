# deploy/dev.Dockerfile — development image for facebook-workflow-poc
#
# Build:  docker build -f deploy/dev.Dockerfile -t fb-workflow:dev .
# Run:    docker run --rm -p 8000:8000 --env-file .env fb-workflow:dev
#
# NOTE: This app is NOT bundled with `bun build`. Bundling firebase-admin +
# pino-pretty breaks at runtime (pino-pretty runs in a worker_thread and throws
# a DataCloneError). Running directly from source with node_modules present is
# the reliable approach here.

# ---- Stage 1: install dependencies (cached layer) ----
FROM oven/bun:1.3.13-alpine AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- Stage 2: runtime ----
FROM oven/bun:1.3.13-alpine

WORKDIR /app

# Installed dependencies
COPY --from=deps /app/node_modules ./node_modules

# App source + config. tsconfig.json is required at runtime because the `#/...`
# path aliases are resolved from its "paths" mapping.
COPY package.json bun.lock tsconfig.json ./
COPY src ./src

# DEV ONLY: bake .env into the image for convenience. For production, do NOT copy
# secrets in — pass them at runtime via `--env-file` / `-e` instead.
COPY .env ./.env

ENV NODE_ENV=development
# Bind to all interfaces so the server is reachable from outside the container.
ENV HOST=0.0.0.0
ENV PORT=8000

EXPOSE 8000

# Basic health check against the API health route.
HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8000/api/v1/health || exit 1

# Run directly from source (same as the `start` script).
CMD ["bun", "run", "src/server.ts"]
