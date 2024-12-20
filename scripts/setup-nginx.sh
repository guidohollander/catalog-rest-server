#!/bin/bash

# Create nginx directory if it doesn't exist
mkdir -p /srv/nginx

# Copy nginx configuration
cp nginx/nginx.conf /srv/nginx/

# Create docker compose file for both services
cat > /srv/docker-compose.yml << 'EOL'
version: '3.8'

services:
  catalog-rest-server:
    image: registry.hollanderconsulting.nl/catalog-rest-server:latest
    environment:
      - NODE_ENV=production
      - NEXT_TELEMETRY_DISABLED=1
    ports:
      - "3010:3000"
    restart: unless-stopped
    networks:
      - catalog-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /srv/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - catalog-rest-server
    restart: unless-stopped
    networks:
      - catalog-network

networks:
  catalog-network:
    driver: bridge
EOL

# Stop existing containers
cd /srv
docker compose down || true

# Start the new setup
docker compose up -d
