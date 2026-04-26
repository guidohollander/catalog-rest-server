$connStr = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

Write-Host "=== Looking for SI with revision=1834 ==="
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT name, version, url, revision FROM solution_implementation WHERE revision = 1834"
$rdr = $cmd.ExecuteReader()
$found = $false
while ($rdr.Read()) {
    Write-Host "  name=$($rdr.GetValue(0)) | version=$($rdr.GetValue(1)) | revision=$($rdr.GetValue(3))"
    Write-Host "  url=$($rdr.GetValue(2))"
    $found = $true
}
$rdr.Close()
if (-not $found) { Write-Host "  [NOT FOUND] No SI with revision=1834" -ForegroundColor Yellow }

Write-Host "`n=== Looking in mvw_solution_implementation for revision=1834 ==="
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "SELECT name, version, url, revision FROM mvw_solution_implementation WHERE revision = 1834"
$rdr2 = $cmd2.ExecuteReader()
$found2 = $false
while ($rdr2.Read()) {
    Write-Host "  name=$($rdr2.GetValue(0)) | version=$($rdr2.GetValue(1)) | revision=$($rdr2.GetValue(3))"
    Write-Host "  url=$($rdr2.GetValue(2))"
    $found2 = $true
}
$rdr2.Close()
if (-not $found2) { Write-Host "  [NOT FOUND]" -ForegroundColor Yellow }

Write-Host "`n=== Sample revisions in solution_implementation ==="
$cmd3 = $conn.CreateCommand()
$cmd3.CommandText = "SELECT TOP 10 name, revision FROM solution_implementation ORDER BY revision DESC"
$rdr3 = $cmd3.ExecuteReader()
while ($rdr3.Read()) {
    Write-Host "  name=$($rdr3.GetValue(0)) | revision=$($rdr3.GetValue(1))"
}
$rdr3.Close()

$conn.Close()
