# VPN monitoring and auto-reconnect script
$vpnName = "Your VPN Name"  # Replace with your FortiClient VPN connection name
$jenkinsIP = "192.168.10.159"  # Jenkins server IP
$checkInterval = 300  # Check every 5 minutes

function Test-VPNConnection {
    Test-Connection -ComputerName $jenkinsIP -Count 1 -Quiet
}

function Connect-FortiVPN {
    try {
        # Start FortiClient VPN connection
        & "C:\Program Files\Fortinet\FortiClient\FortiClient.exe" connect -s $vpnName
        Start-Sleep -Seconds 10  # Wait for connection to establish
        return $true
    } catch {
        Write-Host "Failed to connect to VPN: $_"
        return $false
    }
}

Write-Host "Starting VPN monitor..."
while ($true) {
    if (-not (Test-VPNConnection)) {
        Write-Host "$(Get-Date) - VPN connection lost. Attempting to reconnect..."
        if (Connect-FortiVPN) {
            Write-Host "$(Get-Date) - VPN reconnected successfully"
        } else {
            Write-Host "$(Get-Date) - Failed to reconnect VPN"
        }
    } else {
        Write-Host "$(Get-Date) - VPN connection is active"
    }
    Start-Sleep -Seconds $checkInterval
}
