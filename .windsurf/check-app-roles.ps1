# Compare application roles for CMFUSERID=3 across local BI databases and production

$query = @"
SELECT DISTINCT 
    A.CaseName AS ApplicationRole,
    A.DELETED,
    UG.CaseName AS UserGroup,
    UG.PHASE AS UserGroupPhase,
    U.CaseName AS UserName,
    U.CMFUSERID
FROM SC_UM_APPLICATIONROLE_PROPERTIES AS A
JOIN SC_UM_APPLICATIONROLE_USERGROUP AS AU ON A.CaseId = AU.APPLICATIONROLEID
JOIN SC_UM_USER_USERGROUP AS UUG ON AU.USERGROUPID = UUG.USERGROUPID
JOIN SC_UM_USERGROUP_PROPERTIES AS UG ON UG.CaseId = UUG.USERGROUPID
JOIN SC_UM_USER_PROPERTIES AS U ON UUG.USERID = U.CaseId
WHERE U.CMFUSERID = 3
AND UG.PHASE = 'Active'
AND A.DELETED = 0
"@

function Invoke-DbQuery {
    param([string]$Label, [string]$ConnStr, [string]$Database, [string]$Sql)
    Write-Host "`n=== $Label ===" -ForegroundColor Cyan
    try {
        $conn = New-Object System.Data.SqlClient.SqlConnection($ConnStr)
        $conn.Open()
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "USE [$Database]; $Sql"
        $cmd.CommandTimeout = 30
        $reader = $cmd.ExecuteReader()
        $rows = 0
        while ($reader.Read()) {
            $cols = @()
            for ($i = 0; $i -lt $reader.FieldCount; $i++) {
                $cols += "$($reader.GetName($i))=$($reader[$i])"
            }
            Write-Host "  $($cols -join ' | ')"
            $rows++
        }
        $reader.Close()
        $conn.Close()
        if ($rows -eq 0) { Write-Host "  (no rows - user_management role NOT present for CMFUSERID=3)" -ForegroundColor Yellow }
        else { Write-Host "  --> $rows role(s) found" -ForegroundColor Green }
    } catch {
        Write-Host "  ERROR: $_" -ForegroundColor Red
    }
}

$localConn = "Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Encrypt=True;TrustServerCertificate=True;"
$prodConn  = "Server=DCSCDBH02\DBS22,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Encrypt=True;TrustServerCertificate=True;"

# Local BI databases that have SC_UM tables
$localBiDbs = @('servicecatalog', 'gd_mts', 'gd_mbs', 'aia_mts', 'aia_mbs', 'png_mts', 'skn_mts', 'vct_mts')
foreach ($db in $localBiDbs) {
    Invoke-DbQuery -Label "LOCAL: $db" -ConnStr $localConn -Database $db -Sql $query
}

# Production SERVICECATALOG-D
Invoke-DbQuery -Label "PRODUCTION: SERVICECATALOG-D" -ConnStr $prodConn -Database "SERVICECATALOG-D" -Sql $query

# Also check production for all BI databases
Write-Host "`n=== Checking ALL production BI databases ===" -ForegroundColor Magenta
$conn = New-Object System.Data.SqlClient.SqlConnection($prodConn)
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT name FROM sys.databases WHERE state_desc = 'ONLINE' ORDER BY name"
$reader = $cmd.ExecuteReader()
$prodDbs = @()
while ($reader.Read()) { $prodDbs += $reader['name'] }
$reader.Close()

foreach ($db in $prodDbs) {
    $cmd2 = $conn.CreateCommand()
    $cmd2.CommandText = "SELECT COUNT(*) FROM [$db].INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SC_UM_APPLICATIONROLE_PROPERTIES'"
    try {
        $count = $cmd2.ExecuteScalar()
        if ($count -gt 0) {
            Invoke-DbQuery -Label "PRODUCTION: $db" -ConnStr $prodConn -Database $db -Sql $query
        }
    } catch {}
}
$conn.Close()
