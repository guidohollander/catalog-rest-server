# Test script for AWS authenticated routes
param(
    [string]$BaseUrl = "https://catalog-rest.hollanderconsulting.nl",
    [string]$Username = "service_catalog_api",
    [string]$Password = "service_catalog_api_local"
)

# Create Basic Auth header
$base64AuthInfo = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(("{0}:{1}" -f $Username, $Password)))
$headers = @{
    Authorization = "Basic $base64AuthInfo"
    "Content-Type" = "application/json"
}

Write-Host "Testing AWS Authentication Routes" -ForegroundColor Green
Write-Host "Base URL: $BaseUrl" -ForegroundColor Yellow
Write-Host "Username: $Username" -ForegroundColor Yellow
Write-Host ""

# Test public routes (no auth required)
Write-Host "=== Testing Public Routes (No Auth Required) ===" -ForegroundColor Cyan

$publicRoutes = @(
    "/",
    "/api/health",
    "/api/svn/health", 
    "/api/jira/health",
    "/api/jenkins/health",
    "/api/database-schema"
)

foreach ($route in $publicRoutes) {
    try {
        Write-Host "Testing: $route" -NoNewline
        $response = Invoke-RestMethod -Uri "$BaseUrl$route" -Method GET -TimeoutSec 10
        Write-Host " ✓ SUCCESS" -ForegroundColor Green
        if ($route -eq "/api/health") {
            Write-Host "  Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host " ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Testing Authenticated Routes ===" -ForegroundColor Cyan

# Test authenticated routes
$authRoutes = @(
    "/api/jira/projects",
    "/api/svn/repositories", 
    "/api/jenkins/jobs"
)

foreach ($route in $authRoutes) {
    try {
        Write-Host "Testing: $route" -NoNewline
        $response = Invoke-RestMethod -Uri "$BaseUrl$route" -Headers $headers -Method GET -TimeoutSec 10
        Write-Host " ✓ SUCCESS" -ForegroundColor Green
        Write-Host "  Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401) {
            Write-Host " ✗ UNAUTHORIZED (401) - Check credentials" -ForegroundColor Red
        }
        elseif ($statusCode -eq 404) {
            Write-Host " ⚠ NOT FOUND (404) - Route may not exist" -ForegroundColor Yellow
        }
        else {
            Write-Host " ✗ FAILED ($statusCode): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== Testing Authentication Failure ===" -ForegroundColor Cyan

# Test with wrong credentials
$wrongHeaders = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("wrong:credentials"))
}

try {
    Write-Host "Testing with wrong credentials..." -NoNewline
    Invoke-RestMethod -Uri "$BaseUrl/api/jira/health" -Headers $wrongHeaders -Method GET -TimeoutSec 10
    Write-Host " ✗ UNEXPECTED SUCCESS - Auth should have failed!" -ForegroundColor Red
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host " ✓ CORRECTLY REJECTED (401)" -ForegroundColor Green
    }
    else {
        Write-Host " ⚠ UNEXPECTED ERROR ($statusCode)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Test completed!" -ForegroundColor Green
