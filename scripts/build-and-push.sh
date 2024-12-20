#!/bin/bash

# Configuration
REGISTRY_URL="registry.hollanderconsulting.nl"
IMAGE_NAME="catalog-rest-server"

# Enable BuildKit features
export DOCKER_BUILDKIT=1

# Get version from environment variable or default to latest
VERSION=${VERSION:-latest}

# Ensure proper permissions
chmod 755 /home/guido
chmod 700 /home/guido/.ssh
chmod 600 /home/guido/.ssh/authorized_keys

# Copy Dockerfile and necessary files
cp -r /srv/catalog-rest-server/* /tmp/
cd /srv/catalog-rest-server

# Build and push the Docker image directly with the registry URL
echo "Building and pushing Docker image version ${VERSION}..."
docker build --progress=plain \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    --build-arg VERSION=${VERSION} \
    -t $REGISTRY_URL/$IMAGE_NAME:latest \
    -t $REGISTRY_URL/$IMAGE_NAME:v${VERSION} .

# Push images to registry
echo "Pushing version ${VERSION} to registry..."
docker push $REGISTRY_URL/$IMAGE_NAME:v${VERSION}
docker push $REGISTRY_URL/$IMAGE_NAME:latest

echo "Build complete and pushed to registry"
