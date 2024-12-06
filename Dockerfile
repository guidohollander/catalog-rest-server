# Use Node.js LTS image
FROM node:20-slim

# Install system dependencies including SVN
RUN apt-get update && \
    apt-get install -y subversion ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Configure SVN to trust the server certificate
RUN mkdir -p ~/.subversion && \
    echo '[global]' > ~/.subversion/servers && \
    echo 'ssl-authority-files = /etc/ssl/certs/ca-certificates.crt' >> ~/.subversion/servers && \
    echo 'store-plaintext-passwords = yes' >> ~/.subversion/servers && \
    echo 'ssl-trust-default-ca = yes' >> ~/.subversion/servers && \
    echo '[groups]' >> ~/.subversion/servers && \
    echo 'hollanderconsulting = svn.hollanderconsulting.nl' >> ~/.subversion/servers && \
    echo '[hollanderconsulting]' >> ~/.subversion/servers && \
    echo 'ssl-trust-default-ca = yes' >> ~/.subversion/servers && \
    echo 'ssl-verify-server-cert = no' >> ~/.subversion/servers

# Set working directory
WORKDIR /app

# Install global dependencies
RUN npm install -g npm@latest

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max_old_space_size=8192"

# Build the application
RUN npm run build || (echo "Build failed. Showing .next directory contents:" && ls -la .next && cat .next/build-manifest.json)

# Set up the standalone build
RUN cp -r .next/standalone/* ./
RUN mkdir -p public
RUN cp -r .next/static public/
RUN rm -rf .next/standalone

# Start the application
CMD ["node", "server.js"]
