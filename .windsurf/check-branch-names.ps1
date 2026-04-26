$conn = New-Object System.Data.SqlClient.SqlConnection('Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Encrypt=True;TrustServerCertificate=True;Database=servicecatalog;')
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT name, version, url FROM solution_implementation WHERE version LIKE 'branches/%' ORDER BY name, version"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host "version=[$($reader['version'])]  url=[$($reader['url'])]"
}
$reader.Close()
$conn.Close()
