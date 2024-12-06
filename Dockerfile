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

# Debug: List contents before build
RUN ls -la

# Explicitly build the application
RUN npm run build

# Debug: List contents after build
RUN ls -la .next

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

# Create a startup script
RUN echo '#!/bin/bash\nset -e\n\necho "=== Starting Next.js Production Server ==="\necho "Current directory: $(pwd)"\n\nif [ ! -d ".next" ]; then\n    echo "ERROR: No .next build directory found!"\n    exit 1\nfi\n\nif [ ! -f ".next/BUILD_ID" ]; then\n    echo "ERROR: No BUILD_ID found in .next directory!"\n    exit 1\nfi\n\necho "Build directory contents:"\nls -la .next\n\nnpx next start -p ${PORT}' > /app/start.sh && chmod +x /app/start.sh

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
