# Re-materialize all views to update emoji data from the corrected view definitions
$server = 'DCSCDBH02\DBS22,18022'
$database = 'SERVICECATALOG-D'
$user = 'guido.hollander'
$password = '1ZPwe7JvDqaFM8huvUOy'

$conn = New-Object System.Data.SqlClient.SqlConnection
$conn.ConnectionString = "Server=$server;Database=$database;User Id=$user;Password=$password;Encrypt=True;TrustServerCertificate=True;"
$conn.Open()

Write-Host "Running usp_catalog_update to refresh all materialized views..." -ForegroundColor Cyan
$cmd = $conn.CreateCommand()
$cmd.CommandText = "EXEC dbo.usp_catalog_update"
$cmd.CommandTimeout = 300
$cmd.ExecuteNonQuery() | Out-Null
Write-Host "Done." -ForegroundColor Green

# Verify result
Write-Host "`nVerifying mvw_solution_implementation.isupdatable_ui..." -ForegroundColor Cyan
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "SELECT TOP 5 isupdatable_ui, CONVERT(varbinary(10), isupdatable_ui) as hex_val FROM mvw_solution_implementation WHERE isupdatable_ui IS NOT NULL AND isupdatable_ui != '-'"
$reader = $cmd2.ExecuteReader()
while ($reader.Read()) {
    $val = $reader['isupdatable_ui']
    $hexStr = (($reader['hex_val']) | ForEach-Object { $_.ToString('X2') }) -join ' '
    Write-Host "  [$val]  hex: $hexStr"
}
$reader.Close()

Write-Host "`nVerifying mvw_implementation_component.isUpdatable_ui..." -ForegroundColor Cyan
$cmd3 = $conn.CreateCommand()
$cmd3.CommandText = "SELECT TOP 3 isUpdatable_ui FROM mvw_implementation_component WHERE isUpdatable_ui IS NOT NULL AND isUpdatable_ui != '-' AND isUpdatable_ui != ''"
$reader3 = $cmd3.ExecuteReader()
while ($reader3.Read()) {
    Write-Host "  [$($reader3['isUpdatable_ui'])]"
}
$reader3.Close()

$conn.Close()
