param (
    [Parameter()]
    [string]$AWSHost = 'ec2-user@44.204.81.162',
    [Parameter()]
    [string]$SSHKeyPath = 'C:\Users\guido\.ssh\service-catalog-rest-api.pem'
)

# Get current version from package.json
$packageJson = Get-Content package.json | ConvertFrom-Json
$version = $packageJson.version

Write-Host "Deploying version $version to AWS..."

# Copy docker-compose file
Write-Host "`nCopying docker-compose file..." -ForegroundColor Cyan
& scp -i $SSHKeyPath docker-compose.aws.yml "${AWSHost}:/srv/catalog-rest-server/docker-compose.yml"

# Deploy on AWS
Write-Host "`nDeploying to AWS..." -ForegroundColor Cyan
& ssh -i $SSHKeyPath ${AWSHost} @"
    cd /srv/catalog-rest-server && \
    VERSION=$version docker-compose pull --no-parallel && \
    VERSION=$version docker-compose up -d --force-recreate --remove-orphans && \
    docker system prune -af --volumes
"@

Write-Host "`nAWS Deployment complete!" -ForegroundColor Green
