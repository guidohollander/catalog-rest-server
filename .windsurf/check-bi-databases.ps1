# Find BI databases locally and on production, then compare application roles for CMFUSERID=3
$query = @"
SELECT DISTINCT *
FROM SC_UM_APPLICATIONROLE_PROPERTIES AS A
JOIN SC_UM_APPLICATIONROLE_USERGROUP AS AU ON A.CaseId = AU.APPLICATIONROLEID
JOIN SC_UM_USER_USERGROUP AS UUG ON AU.USERGROUPID = UUG.USERGROUPID
JOIN  SC_UM_USERGROUP_PROPERTIES AS UG ON UG.CaseId =  UUG.USERGROUPID
JOIN SC_UM_USER_PROPERTIES AS U ON UUG.USERID = U.CaseId
WHERE U.CMFUSERID = 3
AND  UG.PHASE = 'Active'
AND A.DELETED = 0
"@

function Invoke-DbQuery {
    param([string]$Label, [string]$ConnectionString, [string]$Sql)
    Write-Host "`n=== $Label ===" -ForegroundColor Cyan
    try {
        $conn = New-Object System.Data.SqlClient.SqlConnection($ConnectionString)
        $conn.Open()
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $Sql
        $cmd.CommandTimeout = 30
        $reader = $cmd.ExecuteReader()
        $rows = 0
        while ($reader.Read()) {
            for ($i = 0; $i -lt $reader.FieldCount; $i++) {
                Write-Host "  $($reader.GetName($i)): $($reader[$i])"
            }
            Write-Host "  ---"
            $rows++
        }
        $reader.Close()
        $conn.Close()
        if ($rows -eq 0) { Write-Host "  (no rows returned)" -ForegroundColor Yellow }
    } catch {
        Write-Host "  ERROR: $_" -ForegroundColor Red
    }
}

# First: find which databases on local SQL Server have SC_UM tables
Write-Host "=== Finding BI databases on LOCAL (localhost:1433) ===" -ForegroundColor Magenta
$localConn = "Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Encrypt=True;TrustServerCertificate=True;"
try {
    $conn = New-Object System.Data.SqlClient.SqlConnection($localConn)
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT name FROM sys.databases WHERE state_desc = 'ONLINE' ORDER BY name"
    $reader = $cmd.ExecuteReader()
    $dbs = @()
    while ($reader.Read()) { $dbs += $reader['name'] }
    $reader.Close()
    Write-Host "  Online databases: $($dbs -join ', ')"
    
    foreach ($db in $dbs) {
        $cmd2 = $conn.CreateCommand()
        $cmd2.CommandText = "SELECT COUNT(*) FROM [$db].INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SC_UM_APPLICATIONROLE_PROPERTIES'"
        try {
            $count = $cmd2.ExecuteScalar()
            if ($count -gt 0) { Write-Host "  --> BI database found: $db" -ForegroundColor Green }
        } catch {}
    }
    $conn.Close()
} catch {
    Write-Host "  ERROR connecting to local: $_" -ForegroundColor Red
}

# Then run on production
$prodConn = "Server=DCSCDBH02\DBS22,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Encrypt=True;TrustServerCertificate=True;"
Write-Host "`n=== Finding BI databases on PRODUCTION (DCSCDBH02\DBS22) ===" -ForegroundColor Magenta
try {
    $conn = New-Object System.Data.SqlClient.SqlConnection($prodConn)
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT name FROM sys.databases WHERE state_desc = 'ONLINE' ORDER BY name"
    $reader = $cmd.ExecuteReader()
    $dbs = @()
    while ($reader.Read()) { $dbs += $reader['name'] }
    $reader.Close()
    Write-Host "  Online databases: $($dbs -join ', ')"
    
    foreach ($db in $dbs) {
        $cmd2 = $conn.CreateCommand()
        $cmd2.CommandText = "SELECT COUNT(*) FROM [$db].INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SC_UM_APPLICATIONROLE_PROPERTIES'"
        try {
            $count = $cmd2.ExecuteScalar()
            if ($count -gt 0) { Write-Host "  --> BI database found: $db" -ForegroundColor Green }
        } catch {}
    }
    $conn.Close()
} catch {
    Write-Host "  ERROR connecting to production: $_" -ForegroundColor Red
}
