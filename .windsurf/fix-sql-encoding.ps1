# Fix SQL file encoding: re-save files containing emoji as UTF-8 with BOM
# Only processes files in DATABASE_MIGRATIONS that contain multi-byte (non-ASCII) characters

$migrationsPath = 'c:\repo\servicecatalog\_CONTINUOUS_DELIVERY\_GENERAL\DATABASE_MIGRATIONS'
$utf8Bom = [System.Text.UTF8Encoding]::new($true)

$files = Get-ChildItem -Path $migrationsPath -Filter '*.sql' -Recurse

foreach ($file in $files) {
    $bytes = [IO.File]::ReadAllBytes($file.FullName)
    
    # Check if already has UTF-8 BOM
    $hasBom = ($bytes.Count -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    
    # Check for high bytes (indicates non-ASCII / emoji content)
    $hasHighBytes = $false
    foreach ($b in $bytes) {
        if ($b -gt 0x7F) { $hasHighBytes = $true; break }
    }
    
    if ($hasHighBytes -and -not $hasBom) {
        Write-Host "Re-encoding: $($file.Name)" -ForegroundColor Yellow
        $content = [IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        [IO.File]::WriteAllText($file.FullName, $content, $utf8Bom)
        Write-Host "  -> Saved as UTF-8 with BOM" -ForegroundColor Green
    } elseif ($hasBom) {
        Write-Host "Already UTF-8 BOM: $($file.Name)" -ForegroundColor Cyan
    } else {
        Write-Host "No emoji (pure ASCII): $($file.Name)" -ForegroundColor Gray
    }
}

Write-Host "`nDone. Verifying..." -ForegroundColor Cyan

foreach ($file in $files) {
    $bytes = [IO.File]::ReadAllBytes($file.FullName)
    $hasHighBytes = $false
    foreach ($b in $bytes) { if ($b -gt 0x7F) { $hasHighBytes = $true; break } }
    if ($hasHighBytes) {
        $hasBom = ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
        if ($hasBom) {
            Write-Host "OK (UTF-8 BOM): $($file.Name)" -ForegroundColor Green
        } else {
            Write-Host "STILL MISSING BOM: $($file.Name)" -ForegroundColor Red
        }
    }
}
