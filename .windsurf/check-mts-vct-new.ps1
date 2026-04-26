# Check which MTS_VCT branches are still in local DB after the latest test deletions
$conn = New-Object System.Data.SqlClient.SqlConnection('Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Encrypt=True;TrustServerCertificate=True;Database=servicecatalog;')
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT name, version, url FROM solution_implementation WHERE url LIKE '%mts_vct%' ORDER BY url"
$reader = $cmd.ExecuteReader()
$rows = 0
Write-Host "=== MTS_VCT rows still in solution_implementation ===" -ForegroundColor Cyan
while ($reader.Read()) {
    Write-Host "  [$($reader['version'])] $($reader['url'])"
    $rows++
}
$reader.Close()
Write-Host "  Total: $rows" -ForegroundColor $(if ($rows -eq 0) { 'Green' } else { 'Yellow' })
$conn.Close()
