# Check both the view definition source and the materialized table data
$server = 'DCSCDBH02\DBS22,18022'
$database = 'SERVICECATALOG-D'
$user = 'guido.hollander'
$password = '1ZPwe7JvDqaFM8huvUOy'

$conn = New-Object System.Data.SqlClient.SqlConnection
$conn.ConnectionString = "Server=$server;Database=$database;User Id=$user;Password=$password;Encrypt=True;TrustServerCertificate=True;"
$conn.Open()

function Run-Query {
    param([string]$Label, [string]$Sql)
    Write-Host "`n=== $Label ===" -ForegroundColor Cyan
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $Sql
    $reader = $cmd.ExecuteReader()
    $count = 0
    while ($reader.Read() -and $count -lt 3) {
        for ($i = 0; $i -lt $reader.FieldCount; $i++) {
            $name = $reader.GetName($i)
            $val = $reader[$i]
            if ($val -is [byte[]]) {
                $hexStr = ($val | ForEach-Object { $_.ToString('X2') }) -join ' '
                Write-Host "  ${name}: [hex: $hexStr]"
            } else {
                Write-Host "  ${name}: [$val]"
            }
        }
        Write-Host "  ---"
        $count++
    }
    if ($count -eq 0) { Write-Host "  (no rows)" -ForegroundColor Gray }
    $reader.Close()
}

# Check mvw_implementation_component materialized table
Run-Query "mvw_implementation_component (materialized table)" @"
SELECT TOP 3 
    isUpdatable_ui,
    CONVERT(varbinary(20), isUpdatable_ui) as hex_val
FROM mvw_implementation_component
WHERE isUpdatable_ui IS NOT NULL AND isUpdatable_ui != '-' AND isUpdatable_ui != ''
"@

# Check vw_implementation_component (live view - source of truth)
Run-Query "vw_implementation_component (live view)" @"
SELECT TOP 3 
    isUpdatable_ui,
    CONVERT(varbinary(20), isUpdatable_ui) as hex_val
FROM vw_implementation_component
WHERE isUpdatable_ui IS NOT NULL AND isUpdatable_ui != '-' AND isUpdatable_ui != ''
"@

# Check mvw_solution_implementation (other materialized table with emoji)
Run-Query "mvw_solution_implementation.isupdatable_ui" @"
SELECT TOP 3
    isupdatable_ui,
    CONVERT(varbinary(20), isupdatable_ui) as hex_val
FROM mvw_solution_implementation
WHERE isupdatable_ui IS NOT NULL AND isupdatable_ui != '-' AND isupdatable_ui != ''
"@

$conn.Close()
