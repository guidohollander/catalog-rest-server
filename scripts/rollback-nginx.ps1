# Stop the current containers
docker-compose down

# Restore the original docker-compose file
Copy-Item -Path "docker-compose.yml.bak" -Destination "docker-compose.yml" -Force

# Restart with the original configuration
docker-compose up -d

Write-Host "Rollback complete. The service should now be running on port 3010 only."
