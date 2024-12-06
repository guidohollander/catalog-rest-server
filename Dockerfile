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

# Explicitly run build and verify
RUN echo "=== Building Next.js application ===" && \
    npm run build && \
    echo "\n=== Verifying build contents ===" && \
    ls -la .next && \
    test -d .next/standalone && \
    echo "Build successful with standalone output"

# Production stage
FROM node:20-slim AS production
# Install system dependencies and verify installation
RUN apt-get update && apt-get install -y \
    subversion \
    git \
    openssh-client \
    tree \
    && rm -rf /var/lib/apt/lists/* \
    && echo "\n=== Verifying SVN tools in production image ===" \
    && echo "SVN Version:" \
    && svn --version | head -n 2 \
    && echo "\nSVNMUCC Location:" \
    && which svnmucc \
    && echo "\nSVNMUCC Version:" \
    && svnmucc --version \
    && echo "=== Verification Complete ==="

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy all necessary files for production
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/.next/standalone/ ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

# Install production dependencies
RUN npm ci --only=production

# Verify build contents
RUN echo "=== Verifying Next.js Production Build ===" && \
    echo "Contents of current directory:" && \
    ls -la && \
    echo "\nContents of .next directory:" && \
    ls -la .next && \
    echo "\nChecking for server.js:" && \
    ls -la server.js || echo "server.js not found"

# Expose port 3000
EXPOSE 3000

# Use node to start the standalone server
CMD ["node", "server.js"]

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
