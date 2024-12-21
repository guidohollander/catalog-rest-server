# Use Node.js LTS image
FROM node:20-slim

# Install SVN
RUN apt-get update && \
    apt-get install -y subversion ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Configure SVN
RUN mkdir -p ~/.subversion && \
    echo '[global]' > ~/.subversion/servers && \
    echo 'ssl-trust-default-ca = yes' >> ~/.subversion/servers && \
    echo '[groups]' >> ~/.subversion/servers && \
    echo 'hollanderconsulting = svn.hollanderconsulting.nl' >> ~/.subversion/servers && \
    echo '[hollanderconsulting]' >> ~/.subversion/servers && \
    echo 'ssl-trust-default-ca = yes' >> ~/.subversion/servers && \
    echo 'ssl-verify-server-cert = no' >> ~/.subversion/servers

WORKDIR /app

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && \
    chown -R node:node /app/logs

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy application files
COPY . .

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ARG VERSION
ENV NEXT_PUBLIC_APP_VERSION=${VERSION}

# Add a build-time check for the version
RUN echo "Building with version: ${NEXT_PUBLIC_APP_VERSION}"
RUN npm run build

# Copy necessary files for standalone server
RUN cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

# Cleanup dev dependencies
RUN rm -rf node_modules && \
    npm ci --only=production

# Ensure runtime has access to the version
ENV NEXT_PUBLIC_APP_VERSION=${VERSION}

# Start the application
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
