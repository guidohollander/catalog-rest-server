# Get the version from package.json
$version = (Get-Content .\package.json | ConvertFrom-Json).version

Write-Host "Deploying version $version"

# Stage and commit any changes
git add .
git commit -m "Deploy version $version"
git push

# Deploy to Docker server
ssh -o StrictHostKeyChecking=no 192.168.1.152 "cd /srv/catalog-rest-server && git pull && VERSION=$version docker build --no-cache --build-arg VERSION=$version -t registry.hollanderconsulting.nl/catalog-rest-server:v$version . && docker push registry.hollanderconsulting.nl/catalog-rest-server:v$version && cd /srv && VERSION=$version docker compose pull && VERSION=$version docker compose up -d --force-recreate"

Write-Host "Deployment complete!"
