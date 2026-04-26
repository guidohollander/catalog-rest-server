$connStr = 'Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Database=servicecatalog'
$conn = New-Object System.Data.SqlClient.SqlConnection $connStr
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = @"
SELECT component_name, version, beinformedversionnumber, dev_history
FROM mvw_component_version
WHERE component_name = 'Account'
ORDER BY semver DESC
"@
$rdr = $cmd.ExecuteReader()
$count = 0
while ($rdr.Read()) {
    $cn = $rdr.GetValue(0)
    $ver = $rdr.GetValue(1)
    $bi = $rdr.GetValue(2)
    $dh = $rdr.GetValue(3)
    Write-Host "  [$cn] $ver | bi=$bi | dev_history=$dh"
    $count++
}
$rdr.Close()
$conn.Close()
Write-Host "$count row(s)"
