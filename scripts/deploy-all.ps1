# Enable BuildKit for faster Docker builds
$env:DOCKER_BUILDKIT = 1

# Configuration
$DOCKER_SERVER = "docker-build"
$DOCKER_SERVER_PATH = "/srv/catalog-rest-server"

# Update version before deployment
Write-Host "`nUpdating version..." -ForegroundColor Cyan
./scripts/update-version.ps1 -VersionType patch

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
$currentBranch = git rev-parse --abbrev-ref HEAD
Test-LastCommand

git add .
Test-LastCommand

# Only commit and push if there are changes
$status = git status --porcelain
if ($status) {
    Write-Host "Changes detected, committing..."
    git commit -m "Deployment update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
    Write-Host "Pushing to $currentBranch branch..."
    git push origin $currentBranch
    Test-LastCommand
} else {
    Write-Host "No changes to commit"
}

# Step 2: Docker build and push
Write-Host "`nStep 2: Docker build and push..." -ForegroundColor Cyan

# Build and push Docker image
./scripts/build-and-push.sh

# Step 3: Docker server deployment
Write-Host "`nStep 3: Docker server deployment..." -ForegroundColor Cyan

# Create backup of current deployment if it doesn't exist
ssh 192.168.1.152 "if [ ! -f /srv/docker-compose.yml.bak ]; then cp /srv/docker-compose.yml /srv/docker-compose.yml.bak 2>/dev/null || true; fi"

# Copy Nginx configuration and setup script
Write-Host "Copying Nginx configuration..."
scp -r ./nginx 192.168.1.152:/srv/
scp ./scripts/setup-nginx.sh 192.168.1.152:/srv/
ssh 192.168.1.152 "chmod +x /srv/setup-nginx.sh"

# Run the setup script
Write-Host "Setting up Nginx and deploying services..."
ssh 192.168.1.152 "cd /srv && ./setup-nginx.sh"

Write-Host "`nDeployment complete!" -ForegroundColor Green
Write-Host "The service is now available at:"
Write-Host "- Original port: http://192.168.1.152:3010"
Write-Host "- New HTTP port: http://192.168.1.152:80"
Write-Host "- New HTTPS port: https://192.168.1.152:443 (once SSL is configured)"

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

# Test the ports
Write-Host "`nTesting connectivity..."
if (Test-Port -Server "192.168.1.152" -Port 3010) {
    Write-Host "Port 3010 is accessible" -ForegroundColor Green
} else {
    Write-Host "Warning: Port 3010 is not accessible" -ForegroundColor Yellow
}

if (Test-Port -Server "192.168.1.152" -Port 80) {
    Write-Host "Port 80 is accessible" -ForegroundColor Green
} else {
    Write-Host "Warning: Port 80 is not accessible" -ForegroundColor Yellow
}

Write-Host "`nTo rollback to the previous configuration, run:"
Write-Host "ssh 192.168.1.152 'cd /srv && docker compose down && cp docker-compose.yml.bak docker-compose.yml && docker compose up -d'" -ForegroundColor Cyan
