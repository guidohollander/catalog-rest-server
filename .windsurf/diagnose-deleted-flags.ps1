$connStr = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'
$siName = 'mbs anguilla tags/3.1.2'

$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

Write-Host "=== mvw_solution_implementation flags for SI ===" -ForegroundColor Cyan
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT name, deleted, si_in_dev, replace_for_analysis, dev_history, purpose FROM mvw_solution_implementation WHERE name = @name"
$cmd.Parameters.AddWithValue("@name", $siName) | Out-Null
$rdr = $cmd.ExecuteReader()
while ($rdr.Read()) {
    for ($i = 0; $i -lt $rdr.FieldCount; $i++) {
        Write-Host "  $($rdr.GetName($i)): $($rdr.GetValue($i))"
    }
}
$rdr.Close()

Write-Host "`n=== mvw_implementation_component deleted flags for SI ===" -ForegroundColor Cyan
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "SELECT component_name, component_version, deleted, isUpdatable FROM mvw_implementation_component WHERE implementation_name = @name ORDER BY component_name"
$cmd2.Parameters.AddWithValue("@name", $siName) | Out-Null
$rdr2 = $cmd2.ExecuteReader()
$deletedCount = 0
$activeCount = 0
while ($rdr2.Read()) {
    $del = $rdr2.GetValue(2)
    if ($del -eq 1 -or "$del" -eq "True") { $deletedCount++ } else { $activeCount++ }
}
$rdr2.Close()
Write-Host "  Active (deleted=0): $activeCount"
Write-Host "  Deleted (deleted=1): $deletedCount"

Write-Host "`n=== Check if solution_implementation has externals column with data ===" -ForegroundColor Cyan
$cmd3 = $conn.CreateCommand()
$cmd3.CommandText = "SELECT LEN(CAST(externals AS nvarchar(max))) as ext_len FROM solution_implementation WHERE name = @name"
$cmd3.Parameters.AddWithValue("@name", $siName) | Out-Null
$extLen = $cmd3.ExecuteScalar()
Write-Host "  externals column length: $extLen chars"

Write-Host "`n=== Count all SIs vs those with icp rows ===" -ForegroundColor Cyan
$cmd4 = $conn.CreateCommand()
$cmd4.CommandText = @"
SELECT
    COUNT(*) as total_si,
    SUM(CASE WHEN EXISTS (SELECT 1 FROM mvw_implementation_component ic WHERE ic.implementation_name = si.name) THEN 1 ELSE 0 END) as si_with_cvs,
    SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM mvw_implementation_component ic WHERE ic.implementation_name = si.name) THEN 1 ELSE 0 END) as si_without_cvs
FROM mvw_solution_implementation si
"@
$rdr4 = $cmd4.ExecuteReader()
if ($rdr4.Read()) {
    Write-Host "  Total SIs: $($rdr4.GetValue(0))"
    Write-Host "  SIs WITH component versions: $($rdr4.GetValue(1))"
    Write-Host "  SIs WITHOUT component versions: $($rdr4.GetValue(2))"
}
$rdr4.Close()

Write-Host "`n=== SIs without component versions ===" -ForegroundColor Cyan
$cmd5 = $conn.CreateCommand()
$cmd5.CommandText = @"
SELECT si.name, si.url, si.deleted
FROM mvw_solution_implementation si
WHERE NOT EXISTS (
    SELECT 1 FROM mvw_implementation_component ic WHERE ic.implementation_name = si.name
)
ORDER BY si.name
"@
$rdr5 = $cmd5.ExecuteReader()
$noCV = @()
while ($rdr5.Read()) {
    $row = [PSCustomObject]@{ Name = $rdr5.GetValue(0); Url = $rdr5.GetValue(1); Deleted = $rdr5.GetValue(2) }
    Write-Host "  $($row.Name) | deleted=$($row.Deleted)"
    $noCV += $row
}
$rdr5.Close()
Write-Host "  Total: $($noCV.Count)"

$conn.Close()
