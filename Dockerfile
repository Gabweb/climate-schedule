# syntax=docker/dockerfile:1
FROM node:20-alpine AS ui-build
WORKDIR /ui
COPY ui/package*.json ./
RUN npm install --no-audit --no-fund
COPY ui/ ./
RUN npm run build

FROM node:20-alpine AS backend-build
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --no-audit --no-fund
COPY backend/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=backend-build /app/dist ./dist
COPY --from=backend-build /app/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=ui-build /ui/dist ./public
EXPOSE 3000
CMD ["node", "dist/index.js"]
