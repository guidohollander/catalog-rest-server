param (
    [Parameter()]
    [ValidateSet('aws', 'local', 'both')]
    [string]$Environment = 'both',
    [Parameter()]
    [string]$AWSHost = 'ec2-user@44.204.81.162',
    [Parameter()]
    [string]$DockerServer = '192.168.1.152',
    [Parameter()]
    [string]$SSHKeyPath = 'C:\Users\guido\.ssh\service-catalog-rest-api.pem'
)

# Enable BuildKit for faster Docker builds
$env:DOCKER_BUILDKIT = 1

# Get version from package.json
$version = (Get-Content package.json | ConvertFrom-Json).version
Write-Host "Deploying version $version..."

# Function to check if a command was successful
function Test-LastCommand {
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Command failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}

# Function to run npm commands
function Run-NpmCommand {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Command,
        [string]$Script = ""
    )
    if ($Script) {
        Write-Host "Running: npm $Command $Script"
        & npm $Command $Script
    } else {
        Write-Host "Running: npm $Command"
        & npm $Command
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm command failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}

# Function to clean .next directory
function Clean-NextBuild {
    if (Test-Path .next) {
        Write-Host "Cleaning .next directory..."
        Remove-Item -Recurse -Force .next
    }
}

# Function to deploy to AWS
function Deploy-ToAWS {
    Write-Host "`nDeploying to AWS..." -ForegroundColor Cyan
    
    # Create required directories on EC2
    Write-Host "Creating directories..." -ForegroundColor Cyan
    & ssh -i $SSHKeyPath -o StrictHostKeyChecking=no ${AWSHost} "sudo mkdir -p /srv/catalog-rest-server/nginx && sudo chown -R ec2-user:ec2-user /srv/catalog-rest-server"
    Test-LastCommand

    # Copy configuration files and build artifacts
    Write-Host "Copying configuration files..." -ForegroundColor Cyan
    & scp -i $SSHKeyPath -r `
        docker-compose.aws.yml `
        nginx/nginx.aws.conf `
        scripts/deploy-with-nginx.sh `
        .env `
        Dockerfile `
        .next `
        "${AWSHost}:/srv/catalog-rest-server/"
    Test-LastCommand

    # Make the deploy script executable and run it with version
    Write-Host "Running deployment script..." -ForegroundColor Cyan
    & ssh -i $SSHKeyPath ${AWSHost} "cd /srv/catalog-rest-server && mv docker-compose.aws.yml docker-compose.yml && chmod +x deploy-with-nginx.sh && VERSION=$version sudo -E ./deploy-with-nginx.sh"
    Test-LastCommand

    Write-Host "`nAWS Deployment complete!" -ForegroundColor Green
    Write-Host "Your application should be accessible at: https://catalog-rest.hollanderconsulting.nl"
}

# Function to deploy to Docker server
function Deploy-ToDockerServer {
    Write-Host "`nDeploying to Docker server..." -ForegroundColor Cyan
    
    Write-Host "Cleaning up and cloning fresh repository..."
    & ssh ${DockerServer} "rm -rf /srv/catalog-rest-server && cd /srv && git clone https://github.com/guidohollander/catalog-rest-server.git"
    Test-LastCommand

    # Create backup of current deployment if it doesn't exist
    & ssh ${DockerServer} "if [ ! -f /srv/docker-compose.yml.bak ]; then cp /srv/docker-compose.yml /srv/docker-compose.yml.bak 2>/dev/null || true; fi"

    # Copy files
    Write-Host "Copying configuration files..."
    & scp docker-compose.local.yml "${DockerServer}:/srv/docker-compose.yml"

    # Deploy with version
    Write-Host "Deploying services..."
    & ssh ${DockerServer} "cd /srv && VERSION=$version docker compose down && VERSION=$version docker compose up -d"

    Write-Host "`nDocker Server Deployment complete!" -ForegroundColor Green
    Write-Host "The service is now available at:"
    Write-Host "http://${DockerServer}:3000"
}

# Function to test connectivity
function Test-Connectivity {
    Write-Host "`nTesting connectivity..." -ForegroundColor Cyan

    Write-Host "Docker server environment:"
    try {
        $response = Invoke-WebRequest -Uri "http://${DockerServer}:3000" -UseBasicParsing -TimeoutSec 5
        Write-Host "- Port 3000 is accessible" -ForegroundColor Green
    }
    catch {
        Write-Host "- Port 3000 is not accessible" -ForegroundColor Red
    }

    Write-Host "`nAWS environment:"
    try {
        $response = Invoke-WebRequest -Uri "http://catalog-rest.hollanderconsulting.nl" -UseBasicParsing -TimeoutSec 5
        Write-Host "- Port 80 is accessible" -ForegroundColor Green
    }
    catch {
        Write-Host "- Port 80 is not accessible" -ForegroundColor Red
    }
}

# Main deployment logic
Write-Host "Step 1: Local build and verification..." -ForegroundColor Cyan
Write-Host "Installing dependencies..."
Run-NpmCommand "install"

Write-Host "Cleaning .next directory..."
Clean-NextBuild

Write-Host "Running build..."
Run-NpmCommand "run" "build"

Write-Host "`nStep 2: Git operations..." -ForegroundColor Cyan
Write-Host "Committing and pushing changes to git..."

# Get current branch name
$currentBranch = git rev-parse --abbrev-ref HEAD

# Check if there are changes
$status = git status --porcelain
if ($status) {
    Write-Host "Changes detected, committing..."
    git add .
    git commit -m "Deployment update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
    Write-Host "Pushing to $currentBranch branch..."
    git push origin $currentBranch
    
    # Only create tag if it doesn't exist
    $tagExists = git tag -l "v$version"
    if (-not $tagExists) {
        git tag -a "v$version" -m "Version $version"
        git push origin "v$version"
    }
}

Write-Host "`nStep 3: Docker build and push on Docker server..." -ForegroundColor Cyan
Write-Host "Copying build script..."
& scp -r scripts/build-and-push.sh Dockerfile .next "${DockerServer}:/tmp/"
& ssh ${DockerServer} "cd /tmp && chmod +x build-and-push.sh && VERSION=$version ./build-and-push.sh"

Write-Host "`nStep 4: Deployment..." -ForegroundColor Cyan

if ($Environment -eq 'aws' -or $Environment -eq 'both') {
    Deploy-ToAWS
}

if ($Environment -eq 'local' -or $Environment -eq 'both') {
    Deploy-ToDockerServer
}

Test-Connectivity
