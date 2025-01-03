# Use Node.js slim image
FROM node:20.10-slim as builder

# Install system dependencies
RUN apt-get update && \
    apt-get install -y subversion ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Configure subversion
RUN mkdir -p ~/.subversion && \
    echo '[global]' > ~/.subversion/servers && \
    echo 'ssl-trust-default-ca = yes' >> ~/.subversion/servers && \
    echo '[groups]' >> ~/.subversion/servers && \
    echo 'hollanderconsulting = svn.hollanderconsulting.nl' >> ~/.subversion/servers && \
    echo '[hollanderconsulting]' >> ~/.subversion/servers && \
    echo 'ssl-trust-default-ca = yes' >> ~/.subversion/servers && \
    echo 'ssl-verify-server-cert = no' >> ~/.subversion/servers

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .env* ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Create logs directory with correct permissions
RUN mkdir -p .next/standalone/logs && \
    chmod 777 .next/standalone/logs

# Build application
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Final stage
FROM node:20.10-alpine

# Set working directory
WORKDIR /app

# Create logs directory with correct permissions
RUN mkdir -p .next/standalone/logs && \
    chmod 777 .next/standalone/logs

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env* ./

# Set environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOST=0.0.0.0

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
