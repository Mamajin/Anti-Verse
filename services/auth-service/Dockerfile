FROM node:18-alpine AS builder

WORKDIR /app

# Copy the entire monorepo
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY services/auth-service ./services/auth-service

# Install all dependencies (workspaces requires installing from root)
RUN npm ci

# Build the shared packages and the auth service
RUN npm run typecheck

# -------------------------
FROM node:18-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages ./packages
COPY services/auth-service/package.json ./services/auth-service/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built artifacts from frontend workspace
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/api-client/dist ./packages/api-client/dist
COPY --from=builder /app/services/auth-service/dist ./services/auth-service/dist

WORKDIR /app/services/auth-service

EXPOSE 3001

CMD ["node", "dist/server.js"]
