# Configuration
$EC2_HOST = "ec2-user@44.204.81.162"
$REMOTE_PATH = "/srv/catalog-rest-server"
$KEY_PATH = "C:\Users\guido\.ssh\service-catalog-rest-api.pem"

# Function to check last command status
function Test-LastCommand {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Command failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Write-Host "Deploying to AWS EC2..." -ForegroundColor Cyan

# Verify key file exists
if (-not (Test-Path $KEY_PATH)) {
    Write-Host "Error: SSH key file not found at $KEY_PATH" -ForegroundColor Red
    exit 1
}

try {
    # Create required directories on EC2
    Write-Host "Creating directories..." -ForegroundColor Cyan
    ssh -i $KEY_PATH -o StrictHostKeyChecking=no $EC2_HOST "sudo mkdir -p $REMOTE_PATH/nginx && sudo chown -R ec2-user:ec2-user $REMOTE_PATH"
    Test-LastCommand

    # Copy configuration files
    Write-Host "Copying configuration files..." -ForegroundColor Cyan
    scp -i $KEY_PATH `
        docker-compose.aws.yml `
        nginx/nginx.aws.conf `
        scripts/deploy-with-nginx.sh `
        ${EC2_HOST}:${REMOTE_PATH}/
    Test-LastCommand

    # Make the deploy script executable and run it
    Write-Host "Running deployment script..." -ForegroundColor Cyan
    ssh -i $KEY_PATH $EC2_HOST "cd $REMOTE_PATH && mv docker-compose.aws.yml docker-compose.yml && chmod +x deploy-with-nginx.sh && sudo ./deploy-with-nginx.sh"
    Test-LastCommand

    Write-Host "`nDeployment complete!" -ForegroundColor Green
    Write-Host "Your application should be accessible at: https://catalog-rest.hollanderconsulting.nl"
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
