# Use Ubuntu LTS as base image
FROM node:20-slim AS base

# Install system dependencies including Subversion
RUN apt-get update && apt-get install -y \
    subversion \
    git \
    openssh-client \
    tree \
    && rm -rf /var/lib/apt/lists/* \
    && echo "=== Verifying SVN tools in base image ===" \
    && svn --version \
    && which svnmucc \
    && svnmucc --version

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Build stage for production
FROM base AS builder
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Verbose build logging
RUN echo "=== Build Environment ===" && \
    echo "Node version: $(node --version)" && \
    echo "NPM version: $(npm --version)" && \
    echo "Current directory contents:" && \
    ls -la && \
    echo "=== Starting Next.js Build ===" && \
    npm run build && \
    echo "=== Build Complete ===" && \
    echo "Build directory contents:" && \
    ls -la .next && \
    cat .next/BUILD_ID || echo "No BUILD_ID found"

# Production stage
FROM node:20-slim AS production
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy build artifacts and necessary files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Install only production dependencies
RUN npm ci --only=production

# Create a comprehensive startup script
RUN <<'EOF' > /app/start.sh
#!/bin/bash
set -e

echo "=== Next.js Production Server Startup ==="
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

if [ ! -d ".next" ]; then
    echo "ERROR: No .next build directory found!"
    exit 1
fi

echo "Build directory contents:"
ls -la .next

if [ ! -f ".next/BUILD_ID" ]; then
    echo "WARNING: No BUILD_ID found in .next directory!"
    echo "Attempting to generate standalone build..."
    npx next build
fi

echo "Starting Next.js production server..."
npx next start -p ${PORT}
EOF

# Make the startup script executable
RUN chmod +x /app/start.sh

# Expose port 3000
EXPOSE 3000

# Use the startup script as the entrypoint
ENTRYPOINT ["/app/start.sh"]

# Development stage
FROM base AS development
WORKDIR /app

# Install all dependencies for development
COPY package.json package-lock.json ./
RUN npm ci

# Copy all project files
COPY . .

# Expose port 3000
EXPOSE 3000

# Default to development start command
CMD ["npm", "run", "dev"]
