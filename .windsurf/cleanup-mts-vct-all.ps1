# Remove ALL orphaned MTS_VCT branches from local DB
# These are test branches deleted from SVN but still in the DB due to COMP-192

$conn = New-Object System.Data.SqlClient.SqlConnection('Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Encrypt=True;TrustServerCertificate=True;Database=servicecatalog;')
$conn.Open()

# Get all MTS_VCT branches/tags still in DB
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT url FROM solution_implementation WHERE url LIKE '%mts_vct%' ORDER BY url"
$reader = $cmd.ExecuteReader()
$urls = @()
while ($reader.Read()) { $urls += $reader['url'] }
$reader.Close()

Write-Host "=== Found $($urls.Count) MTS_VCT rows to remove ===" -ForegroundColor Cyan

foreach ($url in $urls) {
    Write-Host "  Removing: $url" -NoNewline
    $cmd2 = $conn.CreateCommand()
    $cmd2.CommandText = "EXEC RemoveImplementation @fullUrl"
    $cmd2.Parameters.AddWithValue("@fullUrl", $url) | Out-Null
    $cmd2.CommandTimeout = 120
    try {
        $cmd2.ExecuteNonQuery() | Out-Null
        Write-Host " -> OK" -ForegroundColor Green
    } catch {
        Write-Host " -> ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Verify
Write-Host "`n=== Verifying removal ===" -ForegroundColor Cyan
$cmd3 = $conn.CreateCommand()
$cmd3.CommandText = "SELECT COUNT(*) FROM solution_implementation WHERE url LIKE '%mts_vct%'"
$remaining = $cmd3.ExecuteScalar()
Write-Host "  Remaining MTS_VCT rows in solution_implementation: $remaining" -ForegroundColor $(if ($remaining -eq 0) { 'Green' } else { 'Red' })

$cmd4 = $conn.CreateCommand()
$cmd4.CommandText = "SELECT COUNT(*) FROM mvw_solution_implementation WHERE name LIKE '%mts vct%'"
$mvwCount = $cmd4.ExecuteScalar()
Write-Host "  Remaining in mvw_solution_implementation: $mvwCount" -ForegroundColor $(if ($mvwCount -eq 0) { 'Green' } else { 'Red' })

$conn.Close()
