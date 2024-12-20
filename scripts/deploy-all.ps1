# Enable BuildKit for faster Docker builds
$env:DOCKER_BUILDKIT = 1

# Configuration
$DOCKER_SERVER = "docker-build"
$AWS_SERVER = "aws-catalog"
$DOCKER_SERVER_PATH = "/srv/catalog-rest-server"
$AWS_SERVER_PATH = "/home/ec2-user/catalog-rest-server"

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

# Step 3: Docker Build
Write-Host "`nStep 3: Docker build..." -ForegroundColor Cyan
Write-Host "Building and pushing Docker image..."

# Only reset and clean if there are changes
$changes = ssh $DOCKER_SERVER "cd $DOCKER_SERVER_PATH && git status --porcelain"
if ($changes) {
    ssh $DOCKER_SERVER "cd $DOCKER_SERVER_PATH && git reset --hard && git clean -fd && git checkout $currentBranch && git pull"
    Test-LastCommand
}

# Make scripts executable
ssh $DOCKER_SERVER "cd $DOCKER_SERVER_PATH && chmod +x scripts/*.sh"
Test-LastCommand

# Now run the build
$dockerBuildOutput = ssh $DOCKER_SERVER "cd $DOCKER_SERVER_PATH && DOCKER_BUILDKIT=1 ./scripts/build-and-push.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed:`n$dockerBuildOutput"
    exit $LASTEXITCODE
}
Write-Host $dockerBuildOutput

# Start parallel deployments
Write-Host "`nStarting parallel deployments..." -ForegroundColor Cyan

# AWS Deployment Job
$awsJob = Start-Job -ScriptBlock {
    param($AWS_SERVER, $AWS_SERVER_PATH)
    
    # Create directory structure on AWS if it doesn't exist
    ssh $AWS_SERVER "mkdir -p $AWS_SERVER_PATH/scripts"
    
    # Copy deployment files
    scp ./scripts/deploy.sh $AWS_SERVER":$AWS_SERVER_PATH/scripts/"
    
    # Copy .env file if it exists
    if (Test-Path .env) {
        scp ./.env $AWS_SERVER":$AWS_SERVER_PATH/.env"
    }
    
    # Make script executable and deploy
    ssh $AWS_SERVER "chmod +x $AWS_SERVER_PATH/scripts/deploy.sh && cd $AWS_SERVER_PATH && ./scripts/deploy.sh"
} -ArgumentList $AWS_SERVER, $AWS_SERVER_PATH

# Docker Server Deployment Job
$dockerServerJob = Start-Job -ScriptBlock {
    param($DOCKER_SERVER_IP)
    ssh $DOCKER_SERVER_IP "docker stop catalog-rest-server-dev || true && docker rm catalog-rest-server-dev || true && docker run -d --name catalog-rest-server-dev -p 3010:3000 registry.hollanderconsulting.nl/catalog-rest-server:latest"
} -ArgumentList "192.168.1.152"

# Wait for both jobs to complete
Write-Host "Waiting for deployments to complete..."
$awsResult = Receive-Job -Job $awsJob -Wait
$dockerServerResult = Receive-Job -Job $dockerServerJob -Wait

# Check for any errors in the jobs
if ($awsJob.State -eq 'Failed') {
    Write-Error "AWS deployment failed:`n$awsResult"
    exit 1
}
if ($dockerServerJob.State -eq 'Failed') {
    Write-Error "Docker server deployment failed:`n$dockerServerResult"
    exit 1
}

# Clean up jobs
Remove-Job -Job $awsJob, $dockerServerJob

Write-Host "`nDeployment complete!" -ForegroundColor Green
