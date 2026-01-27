# syntax=docker/dockerfile:1
ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest

FROM node:20-alpine AS ui-build
WORKDIR /app/ui
COPY ui/package*.json ./
RUN npm install --no-audit --no-fund
COPY ui/ ./
COPY shared/ /app/shared/
RUN npm run build

FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --no-audit --no-fund
COPY backend/ ./
COPY shared/ /app/shared/
RUN npm run build
RUN npm prune --omit=dev

FROM $BUILD_FROM
WORKDIR /app/backend
RUN apk add --no-cache nodejs
ENV NODE_ENV=production
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/package.json ./package.json
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=ui-build /app/ui/dist ./public
COPY run.sh /run.sh
RUN chmod +x /run.sh
EXPOSE 3001
CMD ["/run.sh"]
