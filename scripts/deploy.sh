#!/bin/bash

# Configuration
REGISTRY_URL="registry.hollanderconsulting.nl"
IMAGE_NAME="catalog-rest-server"
APP_CONTAINER_NAME="catalog-rest-server"
NGINX_CONTAINER_NAME="catalog-nginx"
APP_PORT=3000
HTTP_PORT=80
HTTPS_PORT=443

# Show current status
echo "Current container status:"
docker ps -a

# Clean up Docker system
echo "Cleaning up Docker system..."
docker system prune -af

# Pull the latest image
echo "Pulling latest image..."
docker pull $REGISTRY_URL/$IMAGE_NAME:latest

# Stop and remove any existing containers
echo "Stopping and removing existing containers..."
docker ps -q --filter "name=$APP_CONTAINER_NAME" | xargs -r docker stop
docker ps -q --filter "name=$NGINX_CONTAINER_NAME" | xargs -r docker stop
docker ps -aq --filter "name=$APP_CONTAINER_NAME" | xargs -r docker rm
docker ps -aq --filter "name=$NGINX_CONTAINER_NAME" | xargs -r docker rm

# Wait a moment for the ports to be released
sleep 2

# Create Docker network if it doesn't exist
echo "Setting up Docker network..."
docker network create catalog-network 2>/dev/null || true

# Start the application container
echo "Starting application container..."
docker run -d \
  --name $APP_CONTAINER_NAME \
  --restart unless-stopped \
  --network catalog-network \
  -p $APP_PORT:$APP_PORT \
  -v "$(pwd)/config:/app/config" \
  -v "$(pwd)/.env:/app/.env" \
  --env NODE_ENV=production \
  --env PORT=$APP_PORT \
  $REGISTRY_URL/$IMAGE_NAME:latest

# Verify app container is running
echo "Verifying app container..."
if ! docker ps --filter "name=$APP_CONTAINER_NAME" --format '{{.Status}}' | grep -q "Up"; then
    echo "Error: Application container failed to start. Logs:"
    docker logs $APP_CONTAINER_NAME
    exit 1
fi

# Start Nginx container
echo "Starting Nginx container..."
docker run -d \
  --name $NGINX_CONTAINER_NAME \
  --restart unless-stopped \
  --network catalog-network \
  -p $HTTP_PORT:80 \
  -p $HTTPS_PORT:443 \
  -v "$(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" \
  nginx:alpine

# Verify nginx container is running
echo "Verifying nginx container..."
if ! docker ps --filter "name=$NGINX_CONTAINER_NAME" --format '{{.Status}}' | grep -q "Up"; then
    echo "Error: Nginx container failed to start. Logs:"
    docker logs $NGINX_CONTAINER_NAME
    exit 1
fi

# Wait for containers to start
sleep 5

# Check container status
echo "Final container status:"
docker ps --filter "name=$APP_CONTAINER_NAME"
docker ps --filter "name=$NGINX_CONTAINER_NAME"

echo "Application container logs:"
docker logs $APP_CONTAINER_NAME

echo "Nginx container logs:"
docker logs $NGINX_CONTAINER_NAME

# Test connectivity
echo "Testing connectivity..."
if curl -s http://localhost:$APP_PORT/api/health > /dev/null; then
    echo "Application endpoint is responding"
else
    echo "Warning: Application endpoint is not responding"
fi

if curl -s http://localhost:$HTTP_PORT > /dev/null; then
    echo "Nginx endpoint is responding"
else
    echo "Warning: Nginx endpoint is not responding"
fi

echo "Deployment complete"
