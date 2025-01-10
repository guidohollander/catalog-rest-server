# Use Node.js slim image
FROM node:20-slim as builder

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

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Set version for build
ARG VERSION=0.1.68
ENV NEXT_PUBLIC_APP_VERSION=${VERSION}

# Build the application
RUN echo "Building with version: ${NEXT_PUBLIC_APP_VERSION}"
RUN npm run build

# Create logs directory in builder stage
RUN mkdir -p .next/standalone/logs && \
    chmod -R 777 .next/standalone/logs

# Copy files for standalone server
RUN cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

# Remove development dependencies
RUN npm prune --production

# Final stage
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache subversion ca-certificates && \
    mkdir -p ~/.subversion && \
    echo '[global]' > ~/.subversion/servers && \
    echo 'ssl-trust-default-ca = yes' >> ~/.subversion/servers && \
    echo '[groups]' >> ~/.subversion/servers && \
    echo 'hollanderconsulting = svn.hollanderconsulting.nl' >> ~/.subversion/servers && \
    echo '[hollanderconsulting]' >> ~/.subversion/servers && \
    echo 'ssl-trust-default-ca = yes' >> ~/.subversion/servers && \
    echo 'ssl-verify-server-cert = no' >> ~/.subversion/servers

# Set working directory
WORKDIR /app

# Copy standalone server and dependencies
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Create logs directory
RUN mkdir -p logs && \
    mkdir -p .next/standalone/logs && \
    chown -R node:node /app && \
    chmod -R 777 /app

# Switch to non-root user
USER node

# Set environment variables
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
ENV NODE_ENV production
ENV NEXT_PUBLIC_APP_VERSION 0.1.68
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
