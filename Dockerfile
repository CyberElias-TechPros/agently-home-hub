# Multi-stage build for frontend and backend
FROM node:18-alpine AS base

# Frontend build stage
FROM base AS frontend-builder
WORKDIR /app/frontend
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Backend stage
FROM base AS backend
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
COPY --from=frontend-builder /app/frontend/dist ./public

# Production stage
FROM node:18-alpine AS production
WORKDIR /app/server
COPY --from=backend /app/server/node_modules ./node_modules
COPY --from=backend /app/server/package*.json ./
COPY --from=backend /app/server/ ./
COPY --from=frontend-builder /app/frontend/dist ./public

EXPOSE 3002
CMD ["npm", "start"]
