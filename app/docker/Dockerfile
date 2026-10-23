# syntax=docker/dockerfile:1

# ---------- deps: ALL dependencies (TypeScript compiler needs devDependencies)
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------- prod-deps: runtime dependencies only
FROM node:24-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# ---------- build: compile TypeScript
FROM node:24-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- runner: small, non-root, code is read-only to the app user
FROM node:24-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

# Code and dependencies stay root-owned: the runtime user can read but never modify them.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/views ./dist/views
COPY public ./public
COPY schema.sql ./dist/schema.sql
COPY certs ./certs
# Only these two paths are writable by the app user.
RUN mkdir -p /app/uploads /app/data && chown node:node /app/uploads /app/data

# Built-in "node" user, fixed UID/GID 1000. Compose tmpfs mounts use the same IDs.
USER node

EXPOSE 1234

# Single source of truth for health: compose and any plain "docker run" on EC2 both use it.
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD ["node", "-e", "require('http').get('http://127.0.0.1:1234/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]

CMD ["node", "dist/index.js"]