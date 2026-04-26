$connStr = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

Write-Host "=== SIs without component versions (from mvw_implementation_component) ===" -ForegroundColor Cyan
$cmd = $conn.CreateCommand()
$cmd.CommandText = @"
SELECT si.name, si.url, si.cid_solution_implementation, si.deleted, si.externals, si.solution_name
FROM mvw_solution_implementation si
WHERE NOT EXISTS (
    SELECT 1 FROM mvw_implementation_component ic WHERE ic.implementation_name = si.name
)
ORDER BY si.name
"@
$rdr = $cmd.ExecuteReader()
while ($rdr.Read()) {
    $extLen = [string]$rdr.GetValue(4)
    Write-Host ""
    Write-Host "  name: $($rdr.GetValue(0))"
    Write-Host "  cid:  $($rdr.GetValue(2))"
    Write-Host "  url:  $($rdr.GetValue(1))"
    Write-Host "  deleted: $($rdr.GetValue(3)) | solution: $($rdr.GetValue(5))"
    Write-Host "  externals length: $($extLen.Length) chars"
}
$rdr.Close()

Write-Host "`n=== Also check implementation_component_project for these SIs ===" -ForegroundColor Cyan
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = @"
SELECT si.name,
    (SELECT COUNT(*) FROM implementation_component_project icp WHERE icp.implementation_name = si.name) as icp_rows
FROM mvw_solution_implementation si
WHERE NOT EXISTS (
    SELECT 1 FROM mvw_implementation_component ic WHERE ic.implementation_name = si.name
)
ORDER BY si.name
"@
$rdr2 = $cmd2.ExecuteReader()
while ($rdr2.Read()) {
    Write-Host "  $($rdr2.GetValue(0)) | icp_rows=$($rdr2.GetValue(1))"
}
$rdr2.Close()

$conn.Close()
