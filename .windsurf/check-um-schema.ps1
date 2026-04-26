# Check actual column names of SC_UM tables in local servicecatalog DB
$localConn = "Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Encrypt=True;TrustServerCertificate=True;"

$tables = @(
    'SC_UM_APPLICATIONROLE_PROPERTIES',
    'SC_UM_APPLICATIONROLE_USERGROUP',
    'SC_UM_USER_USERGROUP',
    'SC_UM_USERGROUP_PROPERTIES',
    'SC_UM_USER_PROPERTIES'
)

$conn = New-Object System.Data.SqlClient.SqlConnection($localConn)
$conn.Open()

foreach ($table in $tables) {
    Write-Host "`n=== $table ===" -ForegroundColor Cyan
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM servicecatalog.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '$table' ORDER BY ORDINAL_POSITION"
    $reader = $cmd.ExecuteReader()
    while ($reader.Read()) {
        Write-Host "  $($reader['COLUMN_NAME'])  [$($reader['DATA_TYPE'])$(if($reader['CHARACTER_MAXIMUM_LENGTH'] -ne [DBNull]::Value){"($($reader['CHARACTER_MAXIMUM_LENGTH']))"})]"
    }
    $reader.Close()
}

$conn.Close()
