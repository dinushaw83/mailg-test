# Frontend build stage
FROM node:20-slim AS frontend-build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev deps for build)
RUN npm ci --include=dev

# Ensure VITE_APP_URL is available to Vite during build (optional)
ARG VITE_APP_URL
ENV VITE_APP_URL=$VITE_APP_URL

# Copy build configuration and source files
COPY vite.config.js ./
COPY index.html ./
COPY public ./public
COPY src ./src

# Build the frontend
RUN npm run build

# Production runtime stage
FROM node:20-slim

# Install system dependencies (curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

# Keep env available at runtime (for server or diagnostics)
ARG VITE_APP_URL
ENV VITE_APP_URL=$VITE_APP_URL

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Copy package files for server dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy server files and dependencies
COPY server.js ./
COPY src/api ./src/api
COPY src/data ./src/data
COPY src/lib ./src/lib

# Copy built frontend from build stage
COPY --from=frontend-build /app/dist ./dist

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/api/health || exit 1

EXPOSE 3000

# Start the Express server (serves both frontend and API)
CMD ["node", "server.js"]
