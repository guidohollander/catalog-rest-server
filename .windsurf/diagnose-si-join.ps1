$connStr = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'
$siName = 'mbs anguilla tags/3.1.2'

$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

# Get PK from mvw_solution_implementation
Write-Host "=== mvw_solution_implementation PK for SI ===" -ForegroundColor Cyan
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT pk_solution_implementation, cid_solution_implementation, fk_solution, name FROM mvw_solution_implementation WHERE name = @name"
$cmd.Parameters.AddWithValue("@name", $siName) | Out-Null
$rdr = $cmd.ExecuteReader()
$pk = $null
$cid = $null
if ($rdr.Read()) {
    $pk = $rdr.GetValue(0)
    $cid = $rdr.GetValue(1)
    Write-Host "  pk=$pk"
    Write-Host "  cid=$cid"
    Write-Host "  fk_solution=$($rdr.GetValue(2))"
}
$rdr.Close()

# Check mvw_implementation_component by fk_solution_implementation
Write-Host "`n=== mvw_implementation_component by fk_solution_implementation ===" -ForegroundColor Cyan
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "SELECT COUNT(*) FROM mvw_implementation_component WHERE fk_solution_implementation = @pk"
$cmd2.Parameters.AddWithValue("@pk", $pk) | Out-Null
$cnt = $cmd2.ExecuteScalar()
Write-Host "  Rows by fk: $cnt"

# Check mvw_implementation_component by implementation_name
$cmd3 = $conn.CreateCommand()
$cmd3.CommandText = "SELECT COUNT(*) FROM mvw_implementation_component WHERE implementation_name = @name"
$cmd3.Parameters.AddWithValue("@name", $siName) | Out-Null
$cnt2 = $cmd3.ExecuteScalar()
Write-Host "  Rows by name: $cnt2"

# Check sample rows and their fk_solution_implementation
Write-Host "`n=== Sample rows from mvw_implementation_component (first 5) ===" -ForegroundColor Cyan
$cmd4 = $conn.CreateCommand()
$cmd4.CommandText = "SELECT TOP 5 fk_solution_implementation, cid_solution_implementation, implementation_name, component_name, component_version FROM mvw_implementation_component WHERE implementation_name = @name"
$cmd4.Parameters.AddWithValue("@name", $siName) | Out-Null
$rdr4 = $cmd4.ExecuteReader()
while ($rdr4.Read()) {
    Write-Host "  fk=$($rdr4.GetValue(0)) | cid=$($rdr4.GetValue(1)) | impl=$($rdr4.GetValue(2)) | comp=$($rdr4.GetValue(3)) | ver=$($rdr4.GetValue(4))"
}
$rdr4.Close()

# Check if the mvw_implementation_component cid matches mvw_solution_implementation cid
Write-Host "`n=== CID match check ===" -ForegroundColor Cyan
$cmd5 = $conn.CreateCommand()
$cmd5.CommandText = "SELECT TOP 1 cid_solution_implementation FROM mvw_implementation_component WHERE implementation_name = @name"
$cmd5.Parameters.AddWithValue("@name", $siName) | Out-Null
$mvwIcCid = $cmd5.ExecuteScalar()
Write-Host "  mvw_solution_implementation cid: $cid"
Write-Host "  mvw_implementation_component cid: $mvwIcCid"
if ($cid -eq $mvwIcCid) {
    Write-Host "  [MATCH] CIDs match - join should work" -ForegroundColor Green
} else {
    Write-Host "  [MISMATCH] CIDs differ - this would break the BeInformed join!" -ForegroundColor Red
}

$conn.Close()
