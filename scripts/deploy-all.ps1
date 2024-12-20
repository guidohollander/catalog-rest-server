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
    $npmArgs = @($Command)
    if ($Script) {
        $npmArgs += $Script
    }
    Write-Host "Running: npm $($npmArgs -join ' ')"
    
    # Run npm command and filter out deprecation warnings
    $output = & npm $npmArgs 2>&1 | Where-Object { 
        $_ -notmatch "npm warn deprecated" -and
        $_ -notmatch "packages are looking for funding"
    }
    $output | ForEach-Object { Write-Host $_ }
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

    # Copy configuration files
    Write-Host "Copying configuration files..." -ForegroundColor Cyan
    & scp -i $SSHKeyPath `
        docker-compose.aws.yml `
        nginx/nginx.aws.conf `
        scripts/deploy-with-nginx.sh `
        "${AWSHost}:/srv/catalog-rest-server/"
    Test-LastCommand

    # Make the deploy script executable and run it
    Write-Host "Running deployment script..." -ForegroundColor Cyan
    & ssh -i $SSHKeyPath ${AWSHost} "cd /srv/catalog-rest-server && mv docker-compose.aws.yml docker-compose.yml && chmod +x deploy-with-nginx.sh && sudo ./deploy-with-nginx.sh"
    Test-LastCommand

    Write-Host "`nAWS Deployment complete!" -ForegroundColor Green
    Write-Host "Your application should be accessible at: https://catalog-rest.hollanderconsulting.nl"
}

# Function to deploy to Docker server
function Deploy-ToDockerServer {
    Write-Host "`nDeploying to Docker server..." -ForegroundColor Cyan
    
    # Create backup of current deployment if it doesn't exist
    & ssh ${DockerServer} "if [ ! -f /srv/docker-compose.yml.bak ]; then cp /srv/docker-compose.yml /srv/docker-compose.yml.bak 2>/dev/null || true; fi"

    # Copy files
    Write-Host "Copying configuration files..."
    & scp docker-compose.local.yml "${DockerServer}:/srv/docker-compose.yml"

    # Deploy
    Write-Host "Deploying services..."
    & ssh ${DockerServer} "cd /srv && docker compose down && docker compose up -d"

    Write-Host "`nDocker Server Deployment complete!" -ForegroundColor Green
    Write-Host "The service is now available at:"
    Write-Host "http://${DockerServer}:3000"
}

# Function to check if a port is accessible
function Test-Port {
    param(
        [string]$Server,
        [int]$Port
    )
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.ConnectAsync($Server, $Port).Wait(1000) | Out-Null
        $tcp.Close()
        return $true
    } catch {
        return $false
    }
}

# Update version before deployment
Write-Host "`nUpdating version..." -ForegroundColor Cyan
& ./scripts/update-version.ps1 -VersionType patch

# Step 1: Local Build and Verification
Write-Host "Step 1: Local build and verification..." -ForegroundColor Cyan

Write-Host "Installing dependencies..."
Run-NpmCommand "install"

Clean-NextBuild

Write-Host "Running build..."
& npm run rebuild
if ($LASTEXITCODE -ne 0) {
    Write-Error "npm run rebuild failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

# Step 2: Git Operations
Write-Host "`nStep 2: Git operations..." -ForegroundColor Cyan
Write-Host "Committing and pushing changes to git..."

# Get current branch name
$currentBranch = & git rev-parse --abbrev-ref HEAD
Test-LastCommand

& git add .
Test-LastCommand

# Only commit and push if there are changes
$status = & git status --porcelain
if ($status) {
    Write-Host "Changes detected, committing..."
    & git commit -m "Deployment update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
    Write-Host "Pushing to $currentBranch branch..."
    & git push origin $currentBranch
    Test-LastCommand
} else {
    Write-Host "No changes to commit"
}

# Step 3: Docker build and push on Docker server
Write-Host "`nStep 3: Docker build and push on Docker server..." -ForegroundColor Cyan

# Copy build script to Docker server
Write-Host "Copying build script..."
& scp scripts/build-and-push.sh "${DockerServer}:/tmp/"
& ssh ${DockerServer} "chmod +x /tmp/build-and-push.sh"

# Run build script on Docker server
Write-Host "Building and pushing Docker image..."
& ssh ${DockerServer} "cd /tmp && ./build-and-push.sh"
Test-LastCommand

# Step 4: Deployment
Write-Host "`nStep 4: Deployment..." -ForegroundColor Cyan

switch ($Environment) {
    'aws' { 
        Deploy-ToAWS
        
        # Test AWS connectivity
        $server = ($AWSHost -split '@')[1]
        if (Test-Port -Server $server -Port 80) {
            Write-Host "Port 80 is accessible" -ForegroundColor Green
        } else {
            Write-Host "Warning: Port 80 is not accessible" -ForegroundColor Yellow
            Write-Host "Make sure port 80 is open in your EC2 security group" -ForegroundColor Yellow
        }
    }
    'local' { 
        Deploy-ToDockerServer
        
        # Test Docker server connectivity
        if (Test-Port -Server $DockerServer -Port 3000) {
            Write-Host "Port 3000 is accessible" -ForegroundColor Green
        } else {
            Write-Host "Warning: Port 3000 is not accessible" -ForegroundColor Yellow
        }
    }
    'both' {
        Deploy-ToDockerServer
        Deploy-ToAWS
        
        # Test both environments
        Write-Host "`nTesting connectivity..." -ForegroundColor Cyan
        Write-Host "Docker server environment:"
        if (Test-Port -Server $DockerServer -Port 3000) {
            Write-Host "- Port 3000 is accessible" -ForegroundColor Green
        } else {
            Write-Host "- Warning: Port 3000 is not accessible" -ForegroundColor Yellow
        }
        
        Write-Host "`nAWS environment:"
        $server = ($AWSHost -split '@')[1]
        if (Test-Port -Server $server -Port 80) {
            Write-Host "- Port 80 is accessible" -ForegroundColor Green
        } else {
            Write-Host "- Warning: Port 80 is not accessible" -ForegroundColor Yellow
            Write-Host "  Make sure port 80 is open in your EC2 security group" -ForegroundColor Yellow
        }
    }
}
