#!/bin/bash

# Configuration
REGISTRY_URL="registry.hollanderconsulting.nl"
IMAGE_NAME="catalog-rest-server"

# Enable BuildKit features
export DOCKER_BUILDKIT=1

# Get version from environment variable or default to latest
VERSION=${VERSION:-latest}

# Force update repository
cd /srv/catalog-rest-server
git fetch
git reset --hard origin/master

# Build the Docker image
echo "Building Docker image..."
docker build --no-cache --build-arg VERSION=$VERSION -t $REGISTRY_URL/$IMAGE_NAME:v$VERSION .

# Push the image to registry
echo "Pushing image to registry..."
docker push $REGISTRY_URL/$IMAGE_NAME:v$VERSION
