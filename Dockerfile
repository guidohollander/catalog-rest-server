# Use Node.js slim image
FROM node:20-slim

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

# Create and set permissions for logs directories
RUN mkdir -p /app/logs && \
    mkdir -p /app/.next/standalone/logs && \
    chown -R node:node /app

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

# Remove development dependencies
RUN npm prune --production

# Copy necessary files for standalone server
RUN cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

# Switch to non-root user
USER node

# Set version for runtime
ENV NEXT_PUBLIC_APP_VERSION=${VERSION}

# Start the server
CMD ["node", ".next/standalone/server.js"]
