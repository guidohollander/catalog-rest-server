# Restore mts_vct tags/1.0.2 by calling ProcessImplementationExternals with live SVN externals

$externals = svn propget svn:externals https://svn.hollanderconsulting.nl/svn/mts_vct/tags/1.0.2 --username guido --no-auth-cache 2>&1 | Out-String
$fullUrl = 'https://svn.hollanderconsulting.nl/svn/mts_vct/tags/1.0.2/'
$revision = 66

Write-Host "Externals length: $($externals.Length)" -ForegroundColor Cyan
Write-Host "Restoring: $fullUrl at revision $revision" -ForegroundColor Cyan

$conn = New-Object System.Data.SqlClient.SqlConnection('Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Encrypt=True;TrustServerCertificate=True;Database=servicecatalog;')
$conn.Open()

$cmd = $conn.CreateCommand()
$cmd.CommandText = "EXEC ProcessImplementationExternals @Revision, @Externals, @FullUrl"
$cmd.CommandTimeout = 300
$cmd.Parameters.AddWithValue("@Revision", $revision) | Out-Null
$cmd.Parameters.AddWithValue("@Externals", $externals) | Out-Null
$cmd.Parameters.AddWithValue("@FullUrl", $fullUrl) | Out-Null

try {
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "ProcessImplementationExternals completed OK" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Verify it's back
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "SELECT name, version, url FROM solution_implementation WHERE url LIKE '%mts_vct%tags%'"
$reader = $cmd2.ExecuteReader()
Write-Host "`n=== Verification ===" -ForegroundColor Cyan
$found = 0
while ($reader.Read()) {
    Write-Host "  RESTORED: [$($reader['name'])] [$($reader['version'])] $($reader['url'])" -ForegroundColor Green
    $found++
}
$reader.Close()
if ($found -eq 0) { Write-Host "  NOT FOUND - restore failed" -ForegroundColor Red }

$conn.Close()
