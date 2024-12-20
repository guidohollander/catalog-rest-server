#!/bin/bash

# Configuration
REGISTRY_URL="registry.hollanderconsulting.nl"  # Replace with your registry URL
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

# Start the new container
echo "Starting new container..."
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p $CONTAINER_PORT:$CONTAINER_PORT \
  --env-file .env \
  $REGISTRY_URL/$IMAGE_NAME:latest

echo "Deployment complete"
