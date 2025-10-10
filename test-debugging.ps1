#!/usr/bin/env pwsh
# Test script to verify debugging setup

Write-Host "`n=== Next.js Debugging Test ===" -ForegroundColor Cyan

# Step 1: Check for running Node processes
Write-Host "`n1. Checking for running Node processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   Found $($nodeProcesses.Count) Node process(es)" -ForegroundColor Green
    $nodeProcesses | Select-Object Id, ProcessName, StartTime | Format-Table -AutoSize
} else {
    Write-Host "   No Node processes running" -ForegroundColor Red
    Write-Host "   Please start the debugger first (F5 in VS Code)" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check if debugger port is listening
Write-Host "`n2. Checking if debugger port (9229) is listening..." -ForegroundColor Yellow
$debugPort = Get-NetTCPConnection -LocalPort 9229 -State Listen -ErrorAction SilentlyContinue
if ($debugPort) {
    Write-Host "   ✅ Debugger port 9229 is listening" -ForegroundColor Green
} else {
    Write-Host "   ❌ Debugger port 9229 is NOT listening" -ForegroundColor Red
    Write-Host "   This means the debugger is not attached properly" -ForegroundColor Yellow
}

# Step 3: Check if .next folder exists
Write-Host "`n3. Checking .next folder..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Write-Host "   .next folder exists" -ForegroundColor Green
} else {
    Write-Host "   .next folder does not exist (will be created on first request)" -ForegroundColor Yellow
}

# Step 4: Check tsconfig.json
Write-Host "`n4. Checking tsconfig.json for sourceMap..." -ForegroundColor Yellow
$tsconfig = Get-Content "tsconfig.json" | ConvertFrom-Json
if ($tsconfig.compilerOptions.sourceMap) {
    Write-Host "   ✅ sourceMap is enabled" -ForegroundColor Green
} else {
    Write-Host "   ❌ sourceMap is NOT enabled" -ForegroundColor Red
}

# Step 5: Test the debug endpoint
Write-Host "`n5. Testing debug endpoint..." -ForegroundColor Yellow
Write-Host "   Attempting to call http://localhost:3000/api/test-debug" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/test-debug" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Test endpoint responded successfully" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Test endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "If the debugger port (9229) is listening and the test endpoint works," -ForegroundColor White
Write-Host "but breakpoints still don't hit, try these steps:" -ForegroundColor White
Write-Host "1. Use 'debugger;' statement instead of breakpoints" -ForegroundColor Yellow
Write-Host "2. Disable VS Code Auto Attach (Ctrl+Shift+P -> 'Debug: Toggle Auto Attach' -> Disabled)" -ForegroundColor Yellow
Write-Host "3. Use the comprehensive logging in the propset_ex route" -ForegroundColor Yellow
Write-Host "`nView logs at: http://localhost:3000/logs" -ForegroundColor Cyan
Write-Host ""
