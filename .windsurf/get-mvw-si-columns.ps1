$connStr = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = 'SELECT TOP 0 * FROM mvw_solution_implementation'
$rdr = $cmd.ExecuteReader()
$schema = $rdr.GetSchemaTable()
$rdr.Close()

$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = 'SELECT pk_solution_implementation, name, url FROM mvw_solution_implementation WHERE pk_solution_implementation = 1834'
$rdr2 = $cmd2.ExecuteReader()
Write-Host "=== SI with pk=1834 ==="
while ($rdr2.Read()) {
    for ($i = 0; $i -lt $rdr2.FieldCount; $i++) {
        Write-Host "  $($rdr2.GetName($i)): $($rdr2.GetValue($i))"
    }
}
$rdr2.Close()
$conn.Close()
Write-Host "=== Columns in mvw_solution_implementation ==="
$schema.Rows | ForEach-Object { $_.ColumnName }
