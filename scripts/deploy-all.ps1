# Configuration
$DOCKER_SERVER = "docker-build"
$AWS_SERVER = "aws-catalog"
$DOCKER_SERVER_PATH = "/srv/catalog-rest-server"
$AWS_SERVER_PATH = "/home/ec2-user/catalog-rest-server"

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

# First, clean up any changes on Docker server
ssh $DOCKER_SERVER "cd $DOCKER_SERVER_PATH && git reset --hard && git clean -fd && git checkout $currentBranch && git pull"
Test-LastCommand

# Make scripts executable
ssh $DOCKER_SERVER "cd $DOCKER_SERVER_PATH && chmod +x scripts/*.sh"
Test-LastCommand

# Now run the build
$dockerBuildOutput = ssh $DOCKER_SERVER "cd $DOCKER_SERVER_PATH && ./scripts/build-and-push.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed:`n$dockerBuildOutput"
    exit $LASTEXITCODE
}
Write-Host $dockerBuildOutput

# Step 4: AWS Deployment
Write-Host "`nStep 4: AWS deployment..." -ForegroundColor Cyan

# Create directory structure on AWS if it doesn't exist
Write-Host "Setting up directories on AWS..."
ssh $AWS_SERVER "mkdir -p $AWS_SERVER_PATH/scripts"
Test-LastCommand

# Copy deployment scripts and config to AWS
Write-Host "Copying deployment files to AWS..."
scp ./scripts/deploy.sh $AWS_SERVER":$AWS_SERVER_PATH/scripts/"
Test-LastCommand

# Copy .env file
Write-Host "Copying .env file..."
if (Test-Path .env) {
    scp ./.env $AWS_SERVER":$AWS_SERVER_PATH/.env"
    Test-LastCommand
} else {
    Write-Warning ".env file not found. Make sure to create one on the AWS server."
}

# Make the script executable
Write-Host "Setting execute permissions..."
ssh $AWS_SERVER "chmod +x $AWS_SERVER_PATH/scripts/deploy.sh"
Test-LastCommand

# Run deploy.sh on AWS server
Write-Host "Deploying to AWS..."
$awsDeployOutput = ssh $AWS_SERVER "cd $AWS_SERVER_PATH && ./scripts/deploy.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Error "AWS deployment failed:`n$awsDeployOutput"
    exit $LASTEXITCODE
}
Write-Host $awsDeployOutput

Write-Host "`nDeployment complete!" -ForegroundColor Green
