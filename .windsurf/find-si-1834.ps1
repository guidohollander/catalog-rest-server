$connStr = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT TOP 5 pk_solution_implementation, name, url FROM mvw_solution_implementation ORDER BY pk_solution_implementation"
$rdr = $cmd.ExecuteReader()
Write-Host "=== Sample PKs in mvw_solution_implementation ==="
while ($rdr.Read()) {
    Write-Host "  pk=$($rdr.GetValue(0)) | name=$($rdr.GetValue(1))"
}
$rdr.Close()
$conn.Close()
