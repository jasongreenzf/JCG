# ── Stage 1: build React frontend ────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY client/package*.json ./client/
RUN npm install --prefix client
COPY client/ ./client/
RUN npm run build --prefix client

# ── Stage 2: production server ────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Install build tools needed for better-sqlite3 native module
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev && npm rebuild better-sqlite3

COPY --from=builder /app/client/dist ./client/dist
COPY server.js db.js ./

# Persistent data lives at /data
RUN mkdir -p /data
ENV DB_PATH=/data/hunting.db
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080
CMD ["node", "server.js"]
