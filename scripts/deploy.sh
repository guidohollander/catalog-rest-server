#!/bin/bash

# Configuration
REGISTRY_URL="registry.hollanderconsulting.nl"  # Replace with your registry URL
IMAGE_NAME="catalog-rest-server"
CONTAINER_NAME="catalog-rest-server"
CONTAINER_PORT=3000

# Pull the latest image
docker pull $REGISTRY_URL/$IMAGE_NAME:latest

# Stop and remove the existing container
docker stop $CONTAINER_NAME || true
docker rm $CONTAINER_NAME || true

# Start the new container
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p $CONTAINER_PORT:$CONTAINER_PORT \
  --env-file .env \
  $REGISTRY_URL/$IMAGE_NAME:latest

echo "Deployment complete"
