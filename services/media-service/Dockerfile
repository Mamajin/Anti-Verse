FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY services/media-service ./services/media-service

RUN npm ci

RUN npm run typecheck

# -------------------------
FROM node:18-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages ./packages
COPY services/media-service/package.json ./services/media-service/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/api-client/dist ./packages/api-client/dist
COPY --from=builder /app/services/media-service/dist ./services/media-service/dist

WORKDIR /app/services/media-service

EXPOSE 3004

CMD ["node", "dist/server.js"]
