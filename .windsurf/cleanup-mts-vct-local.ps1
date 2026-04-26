# Remove MTS_VCT branches 0.0.1 through 0.0.6 from local DB using RemoveImplementation
# These were deleted from SVN but not removed from DB due to the multi-branch deletion bug (COMP-192)

$conn = New-Object System.Data.SqlClient.SqlConnection('Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Encrypt=True;TrustServerCertificate=True;Database=servicecatalog;')
$conn.Open()

$urlsToRemove = @(
    'https://svn.hollanderconsulting.nl/svn/mts_vct/branches/0.0.1/',
    'https://svn.hollanderconsulting.nl/svn/mts_vct/branches/0.0.2/',
    'https://svn.hollanderconsulting.nl/svn/mts_vct/branches/0.0.3/',
    'https://svn.hollanderconsulting.nl/svn/mts_vct/branches/0.0.4/',
    'https://svn.hollanderconsulting.nl/svn/mts_vct/branches/0.0.5/',
    'https://svn.hollanderconsulting.nl/svn/mts_vct/branches/0.0.6/'
)

Write-Host "=== Removing orphaned MTS_VCT branches from local DB ===" -ForegroundColor Cyan

foreach ($url in $urlsToRemove) {
    Write-Host "  Removing: $url" -NoNewline
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "EXEC RemoveImplementation @fullUrl"
    $cmd.Parameters.AddWithValue("@fullUrl", $url) | Out-Null
    $cmd.CommandTimeout = 120
    try {
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host " -> OK" -ForegroundColor Green
    } catch {
        Write-Host " -> ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Verify they are gone
Write-Host "`n=== Verifying removal ===" -ForegroundColor Cyan
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "SELECT name, version FROM solution_implementation WHERE url LIKE '%mts_vct%branches/0.0.%' ORDER BY version"
$reader = $cmd2.ExecuteReader()
$remaining = 0
while ($reader.Read()) {
    Write-Host "  STILL EXISTS: [$($reader['name'])] [$($reader['version'])]" -ForegroundColor Red
    $remaining++
}
$reader.Close()
if ($remaining -eq 0) {
    Write-Host "  All 0.0.x branches removed successfully" -ForegroundColor Green
}

# Check materialized view
Write-Host "`n=== Materialized view check ===" -ForegroundColor Cyan
$cmd3 = $conn.CreateCommand()
$cmd3.CommandText = "SELECT COUNT(*) FROM mvw_solution_implementation WHERE name LIKE '%mts vct branches/0.0.%'"
$mvwCount = $cmd3.ExecuteScalar()
Write-Host "  Remaining in mvw_solution_implementation: $mvwCount" -ForegroundColor $(if ($mvwCount -eq 0) { 'Green' } else { 'Red' })

$conn.Close()
