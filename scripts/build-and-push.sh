#!/bin/bash

# Configuration
REGISTRY_URL="registry.hollanderconsulting.nl"
IMAGE_NAME="catalog-rest-server"

# Enable BuildKit features
export DOCKER_BUILDKIT=1

# Ensure proper permissions
chmod 755 /home/guido
chmod 700 /home/guido/.ssh
chmod 600 /home/guido/.ssh/authorized_keys

# Update repository only if there are changes
if [ -n "$(git status --porcelain)" ]; then
    echo "Updating repository..."
    git fetch origin
    git checkout master
    git reset --hard origin/master
fi

# Build and push the Docker image directly with the registry URL
echo "Building and pushing Docker image..."
docker build --progress=plain \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    -t $REGISTRY_URL/$IMAGE_NAME:latest .

# Push image to registry
docker push $REGISTRY_URL/$IMAGE_NAME:latest

echo "Build complete and pushed to registry"
