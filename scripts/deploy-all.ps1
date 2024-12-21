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

# Function to deploy to AWS
function Deploy-ToAWS {
    Write-Host "`nDeploying to AWS..." -ForegroundColor Cyan
    
    Write-Host "Copying files to AWS..."
    & scp -i $SSHKeyPath docker-compose.aws.yml "${AWSHost}:/srv/catalog-rest-server/docker-compose.yml"
    Test-LastCommand

    Write-Host "Running deployment script..." -ForegroundColor Cyan
    & ssh -i $SSHKeyPath ${AWSHost} "cd /srv/catalog-rest-server && docker-compose pull && docker-compose up -d"
    Test-LastCommand

    Write-Host "`nAWS Deployment complete!" -ForegroundColor Green
}

# Function to deploy to Docker server
function Deploy-ToDockerServer {
    Write-Host "`nDeploying to Docker server..." -ForegroundColor Cyan
    
    Write-Host "Deploying services..."
    & ssh ${DockerServer} "cd /srv && docker compose pull && docker compose up -d"

    Write-Host "`nDocker Server Deployment complete!" -ForegroundColor Green
}

# Main deployment logic
Write-Host "Step 1: Local build and verification..." -ForegroundColor Cyan
Write-Host "Installing dependencies..."
Run-NpmCommand "install"

Write-Host "Running build..."
Run-NpmCommand "run" "build"

Write-Host "`nStep 2: Git operations..." -ForegroundColor Cyan
git add .
git commit -m "Deployment update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
git push origin master

Write-Host "`nStep 3: Docker build and push..." -ForegroundColor Cyan
& ssh ${DockerServer} "cd /srv/catalog-rest-server && git pull && VERSION=$newVersion docker build -t registry.hollanderconsulting.nl/catalog-rest-server:v$newVersion . && docker push registry.hollanderconsulting.nl/catalog-rest-server:v$newVersion"

Write-Host "`nStep 4: Deployment..." -ForegroundColor Cyan

if ($Environment -eq 'aws' -or $Environment -eq 'both') {
    Deploy-ToAWS
}

if ($Environment -eq 'local' -or $Environment -eq 'both') {
    Deploy-ToDockerServer
}
