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

# Get current version and increment patch number
$packageJson = Get-Content package.json | ConvertFrom-Json
$versionParts = $packageJson.version.Split('.')
$newPatch = [int]$versionParts[2] + 1
$newVersion = "$($versionParts[0]).$($versionParts[1]).$newPatch"

# Update version in package.json
$packageJson.version = $newVersion
$packageJson | ConvertTo-Json -Depth 100 | Set-Content package.json

Write-Host "Deploying version $newVersion..."

# Function to check if a command was successful
function Test-LastCommand {
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Command failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}

# Kill any running Node.js processes first
taskkill /F /IM node.exe 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Killed running Node.js processes"
} else {
    Write-Host "No Node.js processes were running"
}

# Function to run npm commands and check for errors
function Run-NpmCommand {
    param(
        [Parameter(Mandatory=$true, Position=0)]
        [string]$Command,
        [Parameter(Position=1)]
        [string]$Argument
    )
    
    if ($Argument) {
        Write-Host "Running: npm $Command $Argument"
        npm $Command $Argument
    } else {
        Write-Host "Running: npm $Command"
        npm $Command
    }
    Test-LastCommand
}

# Function to deploy to AWS
function Deploy-ToAWS {
    Write-Host "`nDeploying to AWS..." -ForegroundColor Cyan
    
    Write-Host "Copying files to AWS..."
    & scp -i $SSHKeyPath docker-compose.aws.yml "${AWSHost}:/srv/catalog-rest-server/docker-compose.yml"
    Test-LastCommand

    Write-Host "Running deployment script..." -ForegroundColor Cyan
    & ssh -i $SSHKeyPath ${AWSHost} @"
        cd /srv/catalog-rest-server && \
        VERSION=$newVersion docker-compose pull --no-parallel && \
        VERSION=$newVersion docker-compose up -d --force-recreate --remove-orphans && \
        docker system prune -af --volumes
"@
    Test-LastCommand

    Write-Host "`nAWS Deployment complete!" -ForegroundColor Green
}

# Function to deploy to Docker server
function Deploy-ToDockerServer {
    Write-Host "`nDeploying to Docker server..."
    
    # Copy files to Docker server
    Write-Host "Copying files..."
    ssh -o StrictHostKeyChecking=no $DockerServer "mkdir -p /srv/nginx"
    scp -o StrictHostKeyChecking=no docker-compose.docker.yml "${DockerServer}:/srv/docker-compose.yml"
    scp -o StrictHostKeyChecking=no -r nginx/nginx.conf "${DockerServer}:/srv/nginx/"
    scp -o StrictHostKeyChecking=no .env "${DockerServer}:/srv/.env"
    
    # Deploy services
    Write-Host "Deploying services..."
    ssh -o StrictHostKeyChecking=no $DockerServer "cd /srv && VERSION=v$newVersion docker compose up -d --force-recreate"
}

# Main deployment logic
Write-Host "Step 1: Local build and verification..." -ForegroundColor Cyan
Write-Host "Installing dependencies..."
Run-NpmCommand "install"

Write-Host "Running build..."
Run-NpmCommand "run" "build"

Write-Host "`nStep 2: Git operations..." -ForegroundColor Cyan
Write-Host "Checking for uncommitted changes..."
$changes = git status --porcelain
if ($changes) {
    Write-Host "Found uncommitted changes:"
    Write-Host $changes
    Write-Host "Committing changes..."
    
    # Add and commit all changes
    git add .
    git commit --no-verify -m "Deployment update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Version $newVersion"
    
    Write-Host "Pushing changes..."
    git push origin master
} else {
    Write-Host "No changes to commit"
}

Write-Host "`nStep 3: Docker build and push..." -ForegroundColor Cyan
& ssh ${DockerServer} "cd /srv/catalog-rest-server && git pull && VERSION=$newVersion docker build --build-arg VERSION=$newVersion -t registry.hollanderconsulting.nl/catalog-rest-server:v$newVersion -t registry.hollanderconsulting.nl/catalog-rest-server:latest . && docker push registry.hollanderconsulting.nl/catalog-rest-server:v$newVersion && docker push registry.hollanderconsulting.nl/catalog-rest-server:latest"

Write-Host "`nStep 4: Deployment..." -ForegroundColor Cyan

if ($Environment -eq 'aws' -or $Environment -eq 'both') {
    Deploy-ToAWS
}

if ($Environment -eq 'local' -or $Environment -eq 'both') {
    Deploy-ToDockerServer
}

Write-Host "`nDeployment complete!" -ForegroundColor Green
