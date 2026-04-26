$connStr = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'
$siName = 'mbs anguilla tags/3.1.2'
$siUrl  = 'https://svn.blyce.com/svn/mbs_anguilla/tags/3.1.2'

$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

# Get SI revision
Write-Host "=== SI revision number ===" -ForegroundColor Cyan
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT revision FROM solution_implementation WHERE name = @name"
$cmd.Parameters.AddWithValue("@name", $siName) | Out-Null
$siRevision = $cmd.ExecuteScalar()
Write-Host "  revision: $siRevision"

# Check revision_externals by revision number
Write-Host "`n=== revision_externals by revision=$siRevision ===" -ForegroundColor Cyan
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "SELECT TOP 5 url, external_url, component_name, component_version, revision FROM revision_externals WHERE revision = @rev"
$cmd2.Parameters.AddWithValue("@rev", $siRevision) | Out-Null
$rdr2 = $cmd2.ExecuteReader()
$cnt = 0
while ($rdr2.Read()) {
    Write-Host "  url=$($rdr2.GetValue(0)) | comp=$($rdr2.GetValue(2)) | ver=$($rdr2.GetValue(3)) | rev=$($rdr2.GetValue(4))"
    $cnt++
}
$rdr2.Close()
Write-Host "  Total for this revision: $cnt"

# Get sample revisions from revision_externals to understand URL format
Write-Host "`n=== Sample revision_externals rows (any) ===" -ForegroundColor Cyan
$cmd3 = $conn.CreateCommand()
$cmd3.CommandText = "SELECT TOP 5 url, external_url, component_name, component_version, revision FROM revision_externals ORDER BY revision DESC"
$rdr3 = $cmd3.ExecuteReader()
while ($rdr3.Read()) {
    Write-Host "  url=$($rdr3.GetValue(0))"
    Write-Host "  ext=$($rdr3.GetValue(1)) comp=$($rdr3.GetValue(2)) ver=$($rdr3.GetValue(3)) rev=$($rdr3.GetValue(4))"
}
$rdr3.Close()

# Count total revision_externals rows for mbs_anguilla
Write-Host "`n=== revision_externals rows for mbs_anguilla (any) ===" -ForegroundColor Cyan
$cmd4 = $conn.CreateCommand()
$cmd4.CommandText = "SELECT COUNT(*) FROM revision_externals WHERE url LIKE '%mbs_anguilla%'"
$cnt4 = [int]$cmd4.ExecuteScalar()
Write-Host "  Count: $cnt4"

# Check vw_implementation_component to understand what it joins on
Write-Host "`n=== vw_implementation_component for this SI (first 3 rows) ===" -ForegroundColor Cyan
$cmd5 = $conn.CreateCommand()
$cmd5.CommandText = "SELECT TOP 3 implementation_name, component_name, component_version, deleted FROM vw_implementation_component WHERE implementation_name = @name"
$cmd5.Parameters.AddWithValue("@name", $siName) | Out-Null
$rdr5 = $cmd5.ExecuteReader()
$vcnt = 0
while ($rdr5.Read()) {
    Write-Host "  [$($rdr5.GetValue(1))] $($rdr5.GetValue(2)) | deleted=$($rdr5.GetValue(3))"
    $vcnt++
}
$rdr5.Close()
if ($vcnt -eq 0) {
    Write-Host "  [NONE] vw_implementation_component returns 0 rows for this SI" -ForegroundColor Red
}

$conn.Close()
