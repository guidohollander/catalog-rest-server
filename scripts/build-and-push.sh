#!/bin/bash

# Configuration
REGISTRY_URL="registry.hollanderconsulting.nl"  # Replace with your registry URL
IMAGE_NAME="catalog-rest-server"
GIT_BRANCH="main"  # Replace with your branch name

# Ensure proper permissions
chmod 755 /home/guido
chmod 700 /home/guido/.ssh
chmod 600 /home/guido/.ssh/authorized_keys

# Get the current date for the tag
DATE_TAG=$(date +%Y%m%d-%H%M%S)

# Get current branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Pull latest changes
git pull origin $CURRENT_BRANCH

# Build the Docker image
docker build -t $IMAGE_NAME:$DATE_TAG -t $IMAGE_NAME:latest .

# Tag images with registry URL
docker tag $IMAGE_NAME:$DATE_TAG $REGISTRY_URL/$IMAGE_NAME:$DATE_TAG
docker tag $IMAGE_NAME:latest $REGISTRY_URL/$IMAGE_NAME:latest

# Push images to registry
docker push $REGISTRY_URL/$IMAGE_NAME:$DATE_TAG
docker push $REGISTRY_URL/$IMAGE_NAME:latest

echo "Build complete and pushed to registry"
echo "Tags pushed: latest, $DATE_TAG"
