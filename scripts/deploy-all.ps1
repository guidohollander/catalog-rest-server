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

# Step 1: Local Build and Verification
Write-Host "Step 1: Local build and verification..." -ForegroundColor Cyan
Write-Host "Installing dependencies..."
npm ci
Test-LastCommand

Write-Host "Running build..."
npm run build
Test-LastCommand

# Step 2: Git Operations
Write-Host "`nStep 2: Git operations..." -ForegroundColor Cyan
Write-Host "Committing and pushing changes to git..."
git add .
Test-LastCommand

# Only commit and push if there are changes
$status = git status --porcelain
if ($status) {
    Write-Host "Changes detected, committing..."
    git commit -m "Deployment update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    # Don't test last command here as it might fail if nothing to commit
    
    # Push changes - ignore the main branch error as we're using master
    git push origin master 2>&1 | ForEach-Object {
        if ($_ -notmatch "src refspec main does not match any") {
            Write-Host $_
        }
    }
} else {
    Write-Host "No changes to commit"
}

# Step 3: Docker Build
Write-Host "`nStep 3: Docker build..." -ForegroundColor Cyan
Write-Host "Building and pushing Docker image..."
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
