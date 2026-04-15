FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY services/log-service ./services/log-service

RUN npm ci

RUN npm run typecheck

# -------------------------
FROM node:18-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages ./packages
COPY services/log-service/package.json ./services/log-service/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/api-client/dist ./packages/api-client/dist
COPY --from=builder /app/services/log-service/dist ./services/log-service/dist

WORKDIR /app/services/log-service

EXPOSE 3003

CMD ["node", "dist/src/server.js"]
