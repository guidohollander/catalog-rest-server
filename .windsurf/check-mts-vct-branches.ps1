# Check if MTS_VCT branches 0.0.1/0.0.2/0.0.3 are still in the local DB
$conn = New-Object System.Data.SqlClient.SqlConnection('Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Encrypt=True;TrustServerCertificate=True;Database=servicecatalog;')
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = @"
SELECT name, version, url
FROM solution_implementation
WHERE name LIKE '%vct%' OR name LIKE '%mts_vct%' OR name LIKE '%mts vct%'
ORDER BY name, version
"@
$reader = $cmd.ExecuteReader()
$rows = 0
Write-Host "=== MTS VCT implementations in local DB ===" -ForegroundColor Cyan
while ($reader.Read()) {
    Write-Host "  name=[$($reader['name'])] version=[$($reader['version'])] url=[$($reader['url'])]"
    $rows++
}
$reader.Close()

if ($rows -eq 0) {
    Write-Host "  (none found)" -ForegroundColor Yellow
}

# Also check if 0.0.x branches specifically exist
Write-Host "`n=== Checking for 0.0.x branches specifically ===" -ForegroundColor Cyan
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = @"
SELECT name, version, url
FROM solution_implementation
WHERE url LIKE '%MTS_VCT%' OR url LIKE '%mts_vct%'
ORDER BY name, version
"@
$reader2 = $cmd2.ExecuteReader()
$rows2 = 0
while ($reader2.Read()) {
    Write-Host "  name=[$($reader2['name'])] version=[$($reader2['version'])] url=[$($reader2['url'])]"
    $rows2++
}
$reader2.Close()
if ($rows2 -eq 0) {
    Write-Host "  (none found)" -ForegroundColor Yellow
}

$conn.Close()
