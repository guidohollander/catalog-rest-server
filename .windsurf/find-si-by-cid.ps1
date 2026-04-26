$connStr = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

Write-Host "=== Looking for SI with cid_solution_implementation = '1834' ==="
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT name, version, url, cid_solution_implementation FROM mvw_solution_implementation WHERE cid_solution_implementation = '1834'"
$rdr = $cmd.ExecuteReader()
$found = $false
while ($rdr.Read()) {
    Write-Host "  name=$($rdr.GetValue(0)) | version=$($rdr.GetValue(1)) | cid=$($rdr.GetValue(3))"
    Write-Host "  url=$($rdr.GetValue(2))"
    $found = $true
}
$rdr.Close()
if (-not $found) { Write-Host "  [NOT FOUND] No SI with cid=1834" -ForegroundColor Yellow }

Write-Host "`n=== Sample cid values in mvw_solution_implementation ==="
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "SELECT TOP 5 name, cid_solution_implementation FROM mvw_solution_implementation"
$rdr2 = $cmd2.ExecuteReader()
while ($rdr2.Read()) {
    Write-Host "  name=$($rdr2.GetValue(0)) | cid=$($rdr2.GetValue(1))"
}
$rdr2.Close()

$conn.Close()
