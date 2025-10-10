#!/usr/bin/env pwsh
# Script to test if breakpoints are working

param(
    [Parameter()]
    [string]$Route = "/api/test-debug"
)

Write-Host "`n=== Next.js Breakpoint Testing Script ===" -ForegroundColor Cyan
Write-Host "This script helps verify that debugging is working correctly`n" -ForegroundColor Gray

# Function to check if server is running
function Test-ServerRunning {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 2 -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Function to check if debugger is attached
function Test-DebuggerAttached {
    $debugPort = Get-NetTCPConnection -LocalPort 9229 -State Listen -ErrorAction SilentlyContinue
    return $null -ne $debugPort
}

# Step 1: Check if server is running
Write-Host "Step 1: Checking if Next.js server is running..." -ForegroundColor Yellow
if (Test-ServerRunning) {
    Write-Host "   ✅ Server is running on http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "   ❌ Server is NOT running" -ForegroundColor Red
    Write-Host "   Please start the debugger:" -ForegroundColor Yellow
    Write-Host "   1. Open Debug panel (Ctrl+Shift+D)" -ForegroundColor Gray
    Write-Host "   2. Select 'Next.js: debug server-side'" -ForegroundColor Gray
    Write-Host "   3. Press F5" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Step 2: Check if debugger is attached
Write-Host "`nStep 2: Checking if debugger is attached..." -ForegroundColor Yellow
if (Test-DebuggerAttached) {
    Write-Host "   ✅ Debugger is attached on port 9229" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Debugger port 9229 is not listening" -ForegroundColor Yellow
    Write-Host "   The server might be running without debugging enabled" -ForegroundColor Gray
    Write-Host "   Try using 'Next.js: attach' configuration in Debug panel" -ForegroundColor Gray
}

# Step 3: Compile the route
Write-Host "`nStep 3: Compiling the route (first request)..." -ForegroundColor Yellow
Write-Host "   Requesting: http://localhost:3000$Route" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000$Route" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "   ✅ Route compiled successfully" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
    
    # Show response preview
    $content = $response.Content
    if ($content.Length -gt 200) {
        $content = $content.Substring(0, 200) + "..."
    }
    Write-Host "   Response: $content" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Failed to compile route: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Instructions for setting breakpoints
Write-Host "`nStep 4: Now set your breakpoints!" -ForegroundColor Yellow
Write-Host "   1. Open the route file in VS Code" -ForegroundColor Gray
Write-Host "   2. Click in the gutter (left of line numbers) to set breakpoints" -ForegroundColor Gray
Write-Host "   3. Breakpoints should now show as red dots (not gray circles)" -ForegroundColor Gray
Write-Host ""
Write-Host "   If breakpoints still show as 'Unbound':" -ForegroundColor Yellow
Write-Host "   - Wait a few seconds for source maps to load" -ForegroundColor Gray
Write-Host "   - Try reloading VS Code window (Ctrl+Shift+P -> 'Reload Window')" -ForegroundColor Gray
Write-Host ""

# Step 5: Wait for user to set breakpoints
Write-Host "Press ENTER when you've set your breakpoints..." -ForegroundColor Cyan
$null = Read-Host

# Step 6: Make second request to hit breakpoints
Write-Host "`nStep 5: Making second request (should hit breakpoints)..." -ForegroundColor Yellow
Write-Host "   If breakpoints are set correctly, execution should pause now" -ForegroundColor Gray
Write-Host "   Requesting: http://localhost:3000$Route" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000$Route" -TimeoutSec 30 -ErrorAction Stop
    Write-Host "   ✅ Request completed" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
    
    Write-Host "`n   Did the breakpoint hit?" -ForegroundColor Cyan
    Write-Host "   - YES: ✅ Debugging is working!" -ForegroundColor Green
    Write-Host "   - NO:  ❌ See troubleshooting below" -ForegroundColor Red
} catch {
    Write-Host "   Request timed out or failed" -ForegroundColor Yellow
    Write-Host "   This might mean execution is paused at a breakpoint!" -ForegroundColor Green
    Write-Host "   Check VS Code - you should see the debug controls" -ForegroundColor Gray
}

# Troubleshooting
Write-Host "`n=== Troubleshooting ===" -ForegroundColor Cyan

Write-Host "`nIf breakpoints didn't hit, try these solutions:" -ForegroundColor Yellow

Write-Host "`n1. Use debugger statement instead:" -ForegroundColor White
Write-Host "   Add this line in your code: debugger;" -ForegroundColor Gray
Write-Host "   This ALWAYS works, even if breakpoints don't" -ForegroundColor Gray

Write-Host "`n2. Check VS Code Auto-Attach:" -ForegroundColor White
Write-Host "   Ctrl+Shift+P -> 'Debug: Toggle Auto Attach' -> 'Disabled'" -ForegroundColor Gray

Write-Host "`n3. Try the Attach configuration:" -ForegroundColor White
Write-Host "   - Keep server running" -ForegroundColor Gray
Write-Host "   - In Debug panel, select 'Next.js: attach'" -ForegroundColor Gray
Write-Host "   - Press F5" -ForegroundColor Gray
Write-Host "   - Run this script again" -ForegroundColor Gray

Write-Host "`n4. Clean restart:" -ForegroundColor White
Write-Host "   taskkill /F /IM node.exe" -ForegroundColor Gray
Write-Host "   Remove-Item -Recurse -Force .next" -ForegroundColor Gray
Write-Host "   Then start debugger again (F5)" -ForegroundColor Gray

Write-Host "`n5. Use logging instead:" -ForegroundColor White
Write-Host "   The propset_ex route has comprehensive logging" -ForegroundColor Gray
Write-Host "   View logs at: http://localhost:3000/logs" -ForegroundColor Gray

Write-Host "`nFor more help, see: DEBUGGING_SOLUTION.md" -ForegroundColor Cyan
Write-Host ""
