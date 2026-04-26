# Restore mts vct tags/1.0.2 by re-running ProcessRevision for the commit that created it
# First check what's currently in the DB for mts_vct
$conn = New-Object System.Data.SqlClient.SqlConnection('Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Encrypt=True;TrustServerCertificate=True;Database=servicecatalog;')
$conn.Open()

Write-Host "=== Current mts_vct state ===" -ForegroundColor Cyan
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT name, version, url FROM solution_implementation WHERE url LIKE '%mts_vct%' ORDER BY version"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host "  [$($reader['version'])] $($reader['url'])"
}
$reader.Close()

# Re-insert tags/1.0.2 by calling usp_insert_or_update_solution_implementation if it exists
# Otherwise use direct insert - but we need the externals data from SVN
Write-Host "`n=== Checking what proc can restore an implementation ===" -ForegroundColor Cyan
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "SELECT name FROM sys.procedures WHERE name LIKE '%implementation%' OR name LIKE '%Implementation%' ORDER BY name"
$reader2 = $cmd2.ExecuteReader()
while ($reader2.Read()) {
    Write-Host "  $($reader2['name'])"
}
$reader2.Close()

$conn.Close()
