# Use Ubuntu LTS as base image
FROM node:20-slim AS base

# Install system dependencies including Subversion
RUN apt-get update && apt-get install -y \
    subversion \
    git \
    openssh-client \
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

# Build stage
FROM base AS builder
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN echo "=== Building Next.js application ===" && \
    echo "Current directory contents:" && \
    ls -la && \
    echo "\nStarting build..." && \
    npm run build && \
    echo "\nBuild complete. Checking .next directory:" && \
    ls -la .next/ && \
    echo "\nChecking standalone directory:" && \
    ls -la .next/standalone/

# Production stage
FROM node:20-slim AS runner

# Install system dependencies and verify installation
RUN apt-get update && apt-get install -y \
    subversion \
    git \
    openssh-client \
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

# Copy standalone build and required files
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Verify Next.js build exists
RUN echo "=== Verifying Next.js build ===" && \
    echo "Contents of app directory:" && \
    ls -la && \
    echo "\nContents of server directory:" && \
    ls -la server.js

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
