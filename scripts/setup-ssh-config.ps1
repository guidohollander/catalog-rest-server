# Create .ssh directory if it doesn't exist
$sshDir = "$env:USERPROFILE\.ssh"
if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir
}

# Create or append to SSH config
$configPath = "$sshDir\config"
$configContent = @"

# AWS EC2 Instance
Host aws-catalog
    HostName ec2-44-204-81-162.compute-1.amazonaws.com
    User ec2-user
    IdentityFile ~/.ssh/service-catalog-rest-api.pem

# Docker Build Server
Host docker-build
    HostName 192.168.1.152
    User guido
    IdentityFile ~/.ssh/id_rsa
"@

Add-Content -Path $configPath -Value $configContent

# Set correct permissions on the .pem file
icacls "$env:USERPROFILE\.ssh\service-catalog-rest-api.pem" /inheritance:r
icacls "$env:USERPROFILE\.ssh\service-catalog-rest-api.pem" /grant:r "$($env:USERNAME):(R)"

Write-Host "SSH config has been updated. You can now use:"
Write-Host "ssh aws-catalog    - to connect to AWS"
Write-Host "ssh docker-build   - to connect to Docker server"
