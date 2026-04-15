FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY services/colony-service ./services/colony-service

RUN npm ci

RUN npm run typecheck

# -------------------------
FROM node:18-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages ./packages
COPY services/colony-service/package.json ./services/colony-service/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/api-client/dist ./packages/api-client/dist
COPY --from=builder /app/services/colony-service/dist ./services/colony-service/dist

WORKDIR /app/services/colony-service

EXPOSE 3002

CMD ["node", "dist/src/server.js"]
