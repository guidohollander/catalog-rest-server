# Check which columns are IDENTITY in the SC_UM tables
$prodConn = "Server=DCSCDBH02\DBS22,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Encrypt=True;TrustServerCertificate=True;Database=SERVICECATALOG-D;"
$conn = New-Object System.Data.SqlClient.SqlConnection($prodConn)
$conn.Open()

$tables = @('SC_UM_APPLICATIONROLE_PROPERTIES','SC_UM_APPLICATIONROLE_USERGROUP','SC_UM_USER_USERGROUP','SC_UM_USERGROUP_PROPERTIES','SC_UM_USER_PROPERTIES')
foreach ($t in $tables) {
    Write-Host "`n=== $t ===" -ForegroundColor Cyan
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
SELECT c.name AS col, c.is_identity, c.is_nullable, t.name AS type, c.max_length
FROM sys.columns c
JOIN sys.types t ON t.user_type_id = c.user_type_id
WHERE c.object_id = OBJECT_ID('$t')
ORDER BY c.column_id
"@
    $reader = $cmd.ExecuteReader()
    while ($reader.Read()) {
        $identity = if ($reader['is_identity'] -eq 1) { ' [IDENTITY]' } else { '' }
        Write-Host "  $($reader['col'])$identity  [$($reader['type'])]"
    }
    $reader.Close()
}

# Also check current state of user_managers group (was it created?)
Write-Host "`n=== Check user_managers group ===" -ForegroundColor Magenta
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "SELECT * FROM SC_UM_USERGROUP_PROPERTIES WHERE USERGROUPNAME = 'user_managers'"
$reader2 = $cmd2.ExecuteReader()
while ($reader2.Read()) {
    Write-Host "  CaseId=$($reader2['CaseId']) Name=$($reader2['USERGROUPNAME']) Deleted=$($reader2['DELETED']) Phase=$($reader2['PHASE'])"
}
$reader2.Close()

$conn.Close()
