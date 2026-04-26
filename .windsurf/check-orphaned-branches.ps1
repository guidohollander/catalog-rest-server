# Find branches in solution_implementation that may be orphaned (manually deleted from SVN)
$localConn = "Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Encrypt=True;TrustServerCertificate=True;Database=servicecatalog;"
$conn = New-Object System.Data.SqlClient.SqlConnection($localConn)
$conn.Open()

# Show all branch solution_implementations
Write-Host "=== Branch solution_implementations in DB ===" -ForegroundColor Cyan
$cmd = $conn.CreateCommand()
$cmd.CommandText = @"
SELECT name, version, url, revision, release_date
FROM solution_implementation
WHERE version LIKE 'branches/%'
ORDER BY name, version
"@
$reader = $cmd.ExecuteReader()
$rows = 0
while ($reader.Read()) {
    Write-Host "  name=[$($reader['name'])] version=[$($reader['version'])] url=[$($reader['url'])]"
    $rows++
}
$reader.Close()
Write-Host "  Total branches: $rows" -ForegroundColor Yellow

# Also show total count of all solution_implementations
Write-Host "`n=== All solution_implementations count by version type ===" -ForegroundColor Cyan
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = @"
SELECT 
    CASE 
        WHEN version = 'trunk' THEN 'trunk'
        WHEN version LIKE 'branches/%' THEN 'branch'
        WHEN version LIKE 'tags/%' THEN 'tag'
        ELSE 'other'
    END as version_type,
    COUNT(*) as cnt
FROM solution_implementation
GROUP BY CASE 
    WHEN version = 'trunk' THEN 'trunk'
    WHEN version LIKE 'branches/%' THEN 'branch'
    WHEN version LIKE 'tags/%' THEN 'tag'
    ELSE 'other'
END
ORDER BY cnt DESC
"@
$reader2 = $cmd2.ExecuteReader()
while ($reader2.Read()) {
    Write-Host "  $($reader2['version_type']): $($reader2['cnt'])"
}
$reader2.Close()

# Check if implementation_component_project also has orphaned rows
Write-Host "`n=== Orphaned implementation_component_project rows (no matching solution_implementation) ===" -ForegroundColor Cyan
$cmd3 = $conn.CreateCommand()
$cmd3.CommandText = @"
SELECT COUNT(*) as orphaned_count
FROM implementation_component_project icp
WHERE NOT EXISTS (
    SELECT 1 FROM solution_implementation si 
    WHERE si.name = icp.implementation_name
)
"@
$count = $cmd3.ExecuteScalar()
Write-Host "  Orphaned implementation_component_project rows: $count" -ForegroundColor $(if ($count -gt 0) { 'Red' } else { 'Green' })

$conn.Close()
