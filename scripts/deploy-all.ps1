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

# Get current branch name
$CURRENT_BRANCH = git rev-parse --abbrev-ref HEAD

# Commit and push changes to git
Write-Host "Committing and pushing changes to git..."
git add .
Test-LastCommand

# Only commit and push if there are changes
$status = git status --porcelain
if ($status) {
    Write-Host "Changes detected, committing..."
    git commit -m "Deployment update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Test-LastCommand
    git push origin $CURRENT_BRANCH
    Test-LastCommand
} else {
    Write-Host "No changes to commit"
}

# Build and push to registry on Docker server
Write-Host "Building and pushing Docker image..."
ssh $DOCKER_SERVER "cd $DOCKER_SERVER_PATH && ./scripts/build-and-push.sh"
Test-LastCommand

# Create directory structure on AWS if it doesn't exist
Write-Host "Setting up directories on AWS..."
ssh $AWS_SERVER "mkdir -p $AWS_SERVER_PATH/scripts"
Test-LastCommand

# Copy deployment scripts to AWS
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

# Deploy on AWS server
Write-Host "Deploying to AWS..."
ssh $AWS_SERVER "cd $AWS_SERVER_PATH && ./scripts/deploy.sh"
Test-LastCommand

Write-Host "Deployment complete!"
