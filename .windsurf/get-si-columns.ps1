$connStr = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = 'SELECT TOP 0 * FROM solution_implementation'
$rdr = $cmd.ExecuteReader()
$schema = $rdr.GetSchemaTable()
$rdr.Close()
$conn.Close()
$schema.Rows | ForEach-Object { $_.ColumnName }
