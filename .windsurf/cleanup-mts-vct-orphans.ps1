# Remove orphaned MTS_VCT branches from local DB (branches deleted from SVN but still in DB)
# Preserves tags/1.0.2 which is a real tag still in SVN

$conn = New-Object System.Data.SqlClient.SqlConnection('Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Encrypt=True;TrustServerCertificate=True;Database=servicecatalog;')
$conn.Open()

$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT url FROM solution_implementation WHERE url LIKE '%mts_vct%branches%' ORDER BY url"
$reader = $cmd.ExecuteReader()
$urls = @()
while ($reader.Read()) { $urls += $reader['url'] }
$reader.Close()

Write-Host "=== Removing $($urls.Count) orphaned MTS_VCT branches ===" -ForegroundColor Cyan

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

Write-Host "`n=== Verification ===" -ForegroundColor Cyan
$cmd3 = $conn.CreateCommand()
$cmd3.CommandText = "SELECT name, version, url FROM solution_implementation WHERE url LIKE '%mts_vct%' ORDER BY url"
$reader3 = $cmd3.ExecuteReader()
$remaining = 0
while ($reader3.Read()) {
    Write-Host "  [$($reader3['version'])] $($reader3['url'])"
    $remaining++
}
$reader3.Close()
if ($remaining -eq 0) {
    Write-Host "  All orphaned branches removed (no mts_vct rows left)" -ForegroundColor Green
} else {
    Write-Host "  $remaining row(s) remain (tags/1.0.2 is expected)" -ForegroundColor Yellow
}
$conn.Close()
