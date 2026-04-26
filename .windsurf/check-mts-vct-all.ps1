# Check all MTS_VCT branches still in local DB after cleanup
$conn = New-Object System.Data.SqlClient.SqlConnection('Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Encrypt=True;TrustServerCertificate=True;Database=servicecatalog;')
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT name, version, url FROM solution_implementation WHERE url LIKE '%mts_vct%' ORDER BY version"
$reader = $cmd.ExecuteReader()
$rows = 0
Write-Host "=== All MTS_VCT implementations in local DB ===" -ForegroundColor Cyan
while ($reader.Read()) {
    Write-Host "  [$($reader['version'])] -> $($reader['url'])"
    $rows++
}
$reader.Close()
if ($rows -eq 0) { Write-Host "  (none found)" -ForegroundColor Yellow }
else { Write-Host "  Total: $rows" }
$conn.Close()
