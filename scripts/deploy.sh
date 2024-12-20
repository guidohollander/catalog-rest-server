#!/bin/bash

# Configuration
REGISTRY_URL="registry.hollanderconsulting.nl"
IMAGE_NAME="catalog-rest-server"
CONTAINER_NAME="catalog-rest-server"
CONTAINER_PORT=3000

# Pull the latest image
docker pull $REGISTRY_URL/$IMAGE_NAME:latest

# Stop and remove any existing containers with the same name
echo "Stopping and removing existing containers..."
docker ps -q --filter "name=$CONTAINER_NAME" | xargs -r docker stop
docker ps -aq --filter "name=$CONTAINER_NAME" | xargs -r docker rm

# Wait a moment for the port to be released
sleep 2

# Ensure config directory exists
mkdir -p config

# Start the new container
echo "Starting new container..."
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p $CONTAINER_PORT:$CONTAINER_PORT \
  -v "$(pwd)/config:/app/config" \
  -v "$(pwd)/.env:/app/.env" \
  --env NODE_ENV=production \
  --env PORT=$CONTAINER_PORT \
  $REGISTRY_URL/$IMAGE_NAME:latest

# Wait for container to start
sleep 5

# Check container status
echo "Container status:"
docker ps --filter "name=$CONTAINER_NAME"

echo "Container logs:"
docker logs $CONTAINER_NAME

echo "Deployment complete"
