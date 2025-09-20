param (
    [Parameter()]
    [ValidateSet('aws', 'local', 'both')]
    [string]$Environment = 'both',
    [Parameter()]
    [string]$AWSHost = 'ec2-user@ec2-13-222-238-100.compute-1.amazonaws.com',
    [Parameter()]
    [string]$DockerServer = '192.168.1.152',
    [Parameter()]
    [string]$SSHKeyPath = '.\aws\keys\service-catalog-rest-api.pem'
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
    & scp -i $SSHKeyPath .env.aws "${AWSHost}:/srv/catalog-rest-server/.env"
    Test-LastCommand
    
    # Copy cache directory if it exists
    if (Test-Path "cache") {
        Write-Host "Copying database cache to AWS..."
        & ssh -i $SSHKeyPath ${AWSHost} "mkdir -p /srv/catalog-rest-server/cache"
        Test-LastCommand
        & scp -i $SSHKeyPath -r cache/* "${AWSHost}:/srv/catalog-rest-server/cache/"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database cache copied successfully"
        } else {
            Write-Host "⚠️ No cache files to copy (this is normal for first deployment)"
        }
    } else {
        Write-Host "⚠️ No cache directory found (this is normal for first deployment)"
    }

    Write-Host "Setting up log directory permissions..." -ForegroundColor Cyan
    & ssh -i $SSHKeyPath ${AWSHost} @"
        sudo mkdir -p /var/log/catalog-rest-server && \
        sudo chown -R 1000:1000 /var/log/catalog-rest-server && \
        sudo chmod -R 755 /var/log/catalog-rest-server
"@
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
    scp -o StrictHostKeyChecking=no docker-compose.docker.yml "guido@${DockerServer}:/srv/docker-compose.yml"
    scp -o StrictHostKeyChecking=no .env "guido@${DockerServer}:/srv/.env"
    
    # Deploy services
    Write-Host "Deploying services..."
    ssh -o StrictHostKeyChecking=no guido@$DockerServer "cd /srv && docker compose down && VERSION=$newVersion PULL_POLICY=never docker compose up -d"
}

# Main deployment logic
Write-Host "Step 1: Local build and verification..." -ForegroundColor Cyan
Write-Host "Installing dependencies..."
Run-NpmCommand "install"

Write-Host "Running build..."
Run-NpmCommand "run" "build"

Write-Host "`nStep 2: Git operations..." -ForegroundColor Cyan

# Check if local and remote are synchronized
Write-Host "Checking git synchronization..."
git fetch origin
$localCommit = git rev-parse HEAD
$remoteCommit = git rev-parse origin/master
$status = git status --porcelain -b

if ($localCommit -ne $remoteCommit) {
    Write-Host "⚠️  WARNING: Local and remote branches are not synchronized!" -ForegroundColor Yellow
    Write-Host "Local commit:  $localCommit" -ForegroundColor Yellow
    Write-Host "Remote commit: $remoteCommit" -ForegroundColor Yellow
    
    # Check if we're ahead, behind, or diverged
    $ahead = git rev-list --count origin/master..HEAD
    $behind = git rev-list --count HEAD..origin/master
    
    if ($ahead -gt 0 -and $behind -gt 0) {
        Write-Host "❌ ERROR: Branches have diverged! Local is $ahead commits ahead and $behind commits behind." -ForegroundColor Red
        Write-Host "Please resolve manually with: git pull --rebase origin master" -ForegroundColor Red
        exit 1
    } elseif ($behind -gt 0) {
        Write-Host "❌ ERROR: Local branch is $behind commits behind remote." -ForegroundColor Red
        Write-Host "Please pull latest changes with: git pull origin master" -ForegroundColor Red
        exit 1
    }
    # If we're only ahead, we'll push after committing changes below
}

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
    $pushResult = git push origin master 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ERROR: Failed to push changes to remote repository!" -ForegroundColor Red
        Write-Host $pushResult -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Changes pushed successfully" -ForegroundColor Green
} else {
    Write-Host "No changes to commit"
    
    # Still need to push if we're ahead
    if ($localCommit -ne $remoteCommit) {
        Write-Host "Pushing local commits to remote..."
        $pushResult = git push origin master 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ ERROR: Failed to push to remote repository!" -ForegroundColor Red
            Write-Host $pushResult -ForegroundColor Red
            exit 1
        }
        Write-Host "✅ Local commits pushed successfully" -ForegroundColor Green
    }
}

# Final verification that local and remote are now synchronized
git fetch origin
$finalLocalCommit = git rev-parse HEAD
$finalRemoteCommit = git rev-parse origin/master
if ($finalLocalCommit -ne $finalRemoteCommit) {
    Write-Host "❌ ERROR: Git synchronization failed! Local and remote are still not synchronized." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Git repositories are synchronized" -ForegroundColor Green

Write-Host "`nStep 3: Docker build and push..." -ForegroundColor Cyan
if ($Environment -eq 'local') {
    Write-Host "Building locally with cache clearing..."
    Write-Host "Step 3a: Updating source code..."
    & ssh guido@${DockerServer} "cd /srv/catalog-rest-server && git pull"
    Write-Host "Step 3b: Clearing Docker build cache..."
    & ssh guido@${DockerServer} "docker builder prune -af"
    Write-Host "Step 3c: Building Docker image..."
    & ssh guido@${DockerServer} "cd /srv/catalog-rest-server && docker build --no-cache --build-arg VERSION=$newVersion -t registry.hollanderconsulting.nl/catalog-rest-server:v$newVersion -t registry.hollanderconsulting.nl/catalog-rest-server:$newVersion -t registry.hollanderconsulting.nl/catalog-rest-server:latest ."
} elseif ($Environment -eq 'both') {
    Write-Host "Building for both environments with registry push..."
    Write-Host "Step 3a: Updating source code..."
    & ssh guido@${DockerServer} "cd /srv/catalog-rest-server && git pull"
    Write-Host "Step 3b: Clearing Docker build cache..."
    & ssh guido@${DockerServer} "docker builder prune -af"
    Write-Host "Step 3c: Building Docker image..."
    & ssh guido@${DockerServer} "cd /srv/catalog-rest-server && docker build --no-cache --build-arg VERSION=$newVersion -t registry.hollanderconsulting.nl/catalog-rest-server:v$newVersion -t registry.hollanderconsulting.nl/catalog-rest-server:$newVersion -t registry.hollanderconsulting.nl/catalog-rest-server:latest ."
    Write-Host "Step 3d: Pushing to registry..."
    & ssh guido@${DockerServer} "docker push registry.hollanderconsulting.nl/catalog-rest-server:v$newVersion && docker push registry.hollanderconsulting.nl/catalog-rest-server:$newVersion && docker push registry.hollanderconsulting.nl/catalog-rest-server:latest"
} else {
    Write-Host "Building for AWS with registry push..."
    & ssh guido@${DockerServer} "cd /srv/catalog-rest-server && git pull && docker build --build-arg VERSION=$newVersion -t registry.hollanderconsulting.nl/catalog-rest-server:v$newVersion -t registry.hollanderconsulting.nl/catalog-rest-server:$newVersion -t registry.hollanderconsulting.nl/catalog-rest-server:latest . && docker push registry.hollanderconsulting.nl/catalog-rest-server:v$newVersion && docker push registry.hollanderconsulting.nl/catalog-rest-server:$newVersion && docker push registry.hollanderconsulting.nl/catalog-rest-server:latest"
}

Write-Host "`nStep 4: Deployment..." -ForegroundColor Cyan

if ($Environment -eq 'aws' -or $Environment -eq 'both') {
    Deploy-ToAWS
}

if ($Environment -eq 'local' -or $Environment -eq 'both') {
    Deploy-ToDockerServer
}

Write-Host "`nDeployment complete!" -ForegroundColor Green
