$connStr = 'Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Database=servicecatalog'
$conn = New-Object System.Data.SqlClient.SqlConnection $connStr
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT component_name, version, url FROM component_version WHERE url LIKE '%Account/branches/0.0.%' ORDER BY version"
$rdr = $cmd.ExecuteReader()
$count = 0
while ($rdr.Read()) {
    $cn = $rdr.GetValue(0)
    $ver = $rdr.GetValue(1)
    $url = $rdr.GetValue(2)
    Write-Host "  [$cn] $ver -> $url"
    $count++
}
$rdr.Close()
$conn.Close()
Write-Host "$count row(s) found"
