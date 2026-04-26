# Query production DB to check current emoji state in views
$server = 'DCSCDBH02\DBS22,18022'
$database = 'SERVICECATALOG-D'
$user = 'guido.hollander'
$password = '1ZPwe7JvDqaFM8huvUOy'

$query = @"
SELECT TOP 3 
    isUpdatable_ui,
    LEN(isUpdatable_ui) as len,
    CONVERT(varbinary(20), isUpdatable_ui) as hex_val
FROM mvw_implementation_component
WHERE isUpdatable_ui IS NOT NULL AND isUpdatable_ui != '-'
ORDER BY pk_implementation_component DESC
"@

try {
    $conn = New-Object System.Data.SqlClient.SqlConnection
    $conn.ConnectionString = "Server=$server;Database=$database;User Id=$user;Password=$password;Encrypt=True;TrustServerCertificate=True;"
    $conn.Open()
    
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $query
    $reader = $cmd.ExecuteReader()
    
    Write-Host "Current isUpdatable_ui values in mvw_implementation_component:" -ForegroundColor Cyan
    while ($reader.Read()) {
        $val = $reader['isUpdatable_ui']
        $len = $reader['len']
        $hex = $reader['hex_val']
        $hexStr = ($hex | ForEach-Object { $_.ToString('X2') }) -join ' '
        Write-Host "  Value: [$val]  Length: $len  Hex: $hexStr"
    }
    $reader.Close()
    $conn.Close()
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
