# Configuration
$DOCKER_SERVER = "guido@192.168.1.152"
$AWS_SERVER = "ec2-user@ec2-44-204-81-162.compute-1.amazonaws.com"
$DOCKER_SERVER_PATH = "/srv/catalog-rest-server"
$AWS_SERVER_PATH = "/home/ec2-user/catalog-rest-server"
$AWS_PEM_PATH = "$env:USERPROFILE\.ssh\aws-key.pem"  # Update this with your actual .pem file path

# Function to check if a command was successful
function Test-LastCommand {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Last command failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}

# Commit and push changes
Write-Host "Pushing changes to git..."
git push origin main
Test-LastCommand

# Build and push to registry on Docker server
Write-Host "Building and pushing to registry..."
ssh -i "$env:USERPROFILE\.ssh\id_rsa" $DOCKER_SERVER "cd $DOCKER_SERVER_PATH && ./scripts/build-and-push.sh"
Test-LastCommand

# Deploy on AWS server
Write-Host "Deploying to AWS..."
ssh -i $AWS_PEM_PATH $AWS_SERVER "cd $AWS_SERVER_PATH && ./scripts/deploy.sh"
Test-LastCommand

Write-Host "Deployment pipeline complete!"
