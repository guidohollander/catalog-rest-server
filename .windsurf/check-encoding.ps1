$files = Get-ChildItem -Path 'c:\repo\servicecatalog\_CONTINUOUS_DELIVERY\_GENERAL\DATABASE_MIGRATIONS' -Filter '*.sql' -Recurse | Select-Object -ExpandProperty FullName

foreach ($f in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($f)
    $bom = $bytes[0..2]
    $bomHex = ($bom | ForEach-Object { $_.ToString('X2') }) -join ' '
    Write-Host "File: $f"
    Write-Host "  First 3 bytes (BOM check): $bomHex"
    if ($bom[0] -eq 0xEF -and $bom[1] -eq 0xBB -and $bom[2] -eq 0xBF) {
        Write-Host "  Encoding: UTF-8 with BOM" -ForegroundColor Green
    } elseif ($bom[0] -eq 0xFF -and $bom[1] -eq 0xFE) {
        Write-Host "  Encoding: UTF-16 LE" -ForegroundColor Yellow
    } else {
        Write-Host "  Encoding: UTF-8 without BOM (or ANSI)" -ForegroundColor Red
    }
    Write-Host ""
}
