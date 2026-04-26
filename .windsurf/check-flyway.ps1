$files = @(
    'c:\repo\servicecatalog\flyway-migrate-local.ps1',
    'c:\repo\servicecatalog\flyway-migrate-production.ps1'
)

foreach ($f in $files) {
    Write-Host "=== $f ===" -ForegroundColor Cyan
    $bytes = [IO.File]::ReadAllBytes($f)
    $hasHighBytes = $false
    for ($i = 0; $i -lt $bytes.Count; $i++) {
        if ($bytes[$i] -gt 0x7F) {
            $hasHighBytes = $true
            $start = [Math]::Max(0, $i - 10)
            $end = [Math]::Min($bytes.Count - 1, $i + 10)
            $context = $bytes[$start..$end] | ForEach-Object { $_.ToString('X2') }
            Write-Host "  High byte at offset $i : $($context -join ' ')" -ForegroundColor Yellow
        }
    }
    if (-not $hasHighBytes) {
        Write-Host "  No high bytes found - file is pure ASCII (no emoji)" -ForegroundColor Gray
    }
    $bom = $bytes[0..2]
    if ($bom[0] -eq 0xEF -and $bom[1] -eq 0xBB -and $bom[2] -eq 0xBF) {
        Write-Host "  Encoding: UTF-8 with BOM" -ForegroundColor Green
    } else {
        Write-Host "  Encoding: UTF-8 without BOM / ANSI (first bytes: $($bom[0].ToString('X2')) $($bom[1].ToString('X2')) $($bom[2].ToString('X2')))" -ForegroundColor Red
    }
    Write-Host ""
}
