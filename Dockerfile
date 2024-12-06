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
RUN npm run build

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
ENV NODE_ENV production

# Copy necessary files from builder
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
