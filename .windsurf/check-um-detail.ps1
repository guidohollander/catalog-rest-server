# Deep comparison: user_management role and user_managers group on local vs production

$localConn = "Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Encrypt=True;TrustServerCertificate=True;"
$prodConn  = "Server=DCSCDBH02\DBS22,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Encrypt=True;TrustServerCertificate=True;"

function Exec-Query {
    param([string]$Label, [string]$ConnStr, [string]$Database, [string]$Sql)
    Write-Host "`n--- $Label ---" -ForegroundColor Cyan
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
                $cols += "$($reader.GetName($i))=[$($reader[$i])]"
            }
            Write-Host "  $($cols -join ' | ')"
            $rows++
        }
        $reader.Close()
        $conn.Close()
        if ($rows -eq 0) { Write-Host "  (no rows)" -ForegroundColor Yellow }
    } catch {
        Write-Host "  ERROR: $_" -ForegroundColor Red
    }
}

# 1. Does the user_management role exist?
$q1 = "SELECT CaseId, APPLICATIONROLENAME, DELETED, PHASE FROM SC_UM_APPLICATIONROLE_PROPERTIES WHERE APPLICATIONROLENAME = 'user_management'"
Exec-Query "LOCAL servicecatalog: user_management role" $localConn "servicecatalog" $q1
Exec-Query "PROD SERVICECATALOG-D: user_management role" $prodConn "SERVICECATALOG-D" $q1

# 2. Does the user_managers usergroup exist?
$q2 = "SELECT CaseId, USERGROUPNAME, DELETED, PHASE FROM SC_UM_USERGROUP_PROPERTIES WHERE USERGROUPNAME = 'user_managers'"
Exec-Query "LOCAL servicecatalog: user_managers group" $localConn "servicecatalog" $q2
Exec-Query "PROD SERVICECATALOG-D: user_managers group" $prodConn "SERVICECATALOG-D" $q2

# 3. Is guido a member of user_managers locally?
$q3 = @"
SELECT UUG.*, UG.USERGROUPNAME, U.USERNAME, U.CMFUSERID
FROM SC_UM_USER_USERGROUP UUG
JOIN SC_UM_USERGROUP_PROPERTIES UG ON UG.CaseId = UUG.USERGROUPID
JOIN SC_UM_USER_PROPERTIES U ON U.CaseId = UUG.USERID
WHERE UG.USERGROUPNAME = 'user_managers' AND U.CMFUSERID = 3
"@
Exec-Query "LOCAL servicecatalog: guido in user_managers?" $localConn "servicecatalog" $q3
Exec-Query "PROD SERVICECATALOG-D: guido in user_managers?" $prodConn "SERVICECATALOG-D" $q3

# 4. All roles that exist on local but NOT on production
$q4 = @"
SELECT APPLICATIONROLENAME, DELETED, PHASE
FROM SC_UM_APPLICATIONROLE_PROPERTIES
ORDER BY APPLICATIONROLENAME
"@
Exec-Query "LOCAL servicecatalog: ALL roles" $localConn "servicecatalog" $q4
Exec-Query "PROD SERVICECATALOG-D: ALL roles" $prodConn "SERVICECATALOG-D" $q4
