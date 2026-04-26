# Fix: link user_management role to user_managers group and add guido as member
# LINKID columns are IDENTITY - must omit from INSERT

$prodConn = "Server=DCSCDBH02\DBS22,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Encrypt=True;TrustServerCertificate=True;Database=SERVICECATALOG-D;"
$conn = New-Object System.Data.SqlClient.SqlConnection($prodConn)
$conn.Open()

function Get-Scalar {
    param([string]$Sql)
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $Sql
    return $cmd.ExecuteScalar()
}

# Confirm user_managers group exists (was created in previous run)
$groupId = Get-Scalar "SELECT CaseId FROM SC_UM_USERGROUP_PROPERTIES WHERE USERGROUPNAME = 'user_managers' AND DELETED = 0"
Write-Host "user_managers group CaseId: $groupId" -ForegroundColor Cyan

# Get user_management role CaseId
$roleId = Get-Scalar "SELECT CaseId FROM SC_UM_APPLICATIONROLE_PROPERTIES WHERE APPLICATIONROLENAME = 'user_management' AND DELETED = 0"
Write-Host "user_management role CaseId: $roleId" -ForegroundColor Cyan

# Get guido's CaseId
$guidoCaseId = Get-Scalar "SELECT CaseId FROM SC_UM_USER_PROPERTIES WHERE CMFUSERID = 3"
Write-Host "guido CaseId: $guidoCaseId" -ForegroundColor Cyan

# Step 1: Link role to group (omit LINKID - it's IDENTITY)
Write-Host "`n=== Step 1: Link user_management role to user_managers group ===" -ForegroundColor Magenta
$existingRoleLink = Get-Scalar "SELECT COUNT(*) FROM SC_UM_APPLICATIONROLE_USERGROUP WHERE APPLICATIONROLEID = $roleId AND USERGROUPID = $groupId AND DELETED = 0"
if ($existingRoleLink -gt 0) {
    Write-Host "  Link already exists" -ForegroundColor Yellow
} else {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "INSERT INTO SC_UM_APPLICATIONROLE_USERGROUP (APPLICATIONROLEID, USERGROUPID, DELETED) VALUES ($roleId, $groupId, 0)"
    $rows = $cmd.ExecuteNonQuery()
    Write-Host "  Inserted role-group link. Rows affected: $rows" -ForegroundColor Green
}

# Step 2: Add guido to user_managers group (omit LINKID - it's IDENTITY)
Write-Host "`n=== Step 2: Add guido to user_managers group ===" -ForegroundColor Magenta
$existingUserLink = Get-Scalar "SELECT COUNT(*) FROM SC_UM_USER_USERGROUP WHERE USERID = $guidoCaseId AND USERGROUPID = $groupId AND DELETED = 0"
if ($existingUserLink -gt 0) {
    Write-Host "  guido already in user_managers" -ForegroundColor Yellow
} else {
    $cmd2 = $conn.CreateCommand()
    $cmd2.CommandText = "INSERT INTO SC_UM_USER_USERGROUP (USERID, USERGROUPID, DELETED) VALUES ($guidoCaseId, $groupId, 0)"
    $rows2 = $cmd2.ExecuteNonQuery()
    Write-Host "  Inserted user-group link. Rows affected: $rows2" -ForegroundColor Green
}

# Step 3: Verify with original query
Write-Host "`n=== Verification ===" -ForegroundColor Magenta
$cmd3 = $conn.CreateCommand()
$cmd3.CommandText = @"
SELECT DISTINCT 
    A.APPLICATIONROLENAME AS ApplicationRole,
    UG.USERGROUPNAME AS UserGroup,
    U.USERNAME AS UserName,
    U.CMFUSERID
FROM SC_UM_APPLICATIONROLE_PROPERTIES AS A
JOIN SC_UM_APPLICATIONROLE_USERGROUP AS AU ON A.CaseId = AU.APPLICATIONROLEID
JOIN SC_UM_USER_USERGROUP AS UUG ON AU.USERGROUPID = UUG.USERGROUPID
JOIN SC_UM_USERGROUP_PROPERTIES AS UG ON UG.CaseId = UUG.USERGROUPID
JOIN SC_UM_USER_PROPERTIES AS U ON UUG.USERID = U.CaseId
WHERE U.CMFUSERID = 3
AND UG.PHASE = 'Active'
AND A.DELETED = 0
ORDER BY A.APPLICATIONROLENAME
"@
$reader = $cmd3.ExecuteReader()
$found = $false
while ($reader.Read()) {
    $role = $reader['ApplicationRole']
    $group = $reader['UserGroup']
    Write-Host "  Role=[$role] Group=[$group]" -ForegroundColor $(if ($role -eq 'user_management') { 'Green' } else { 'White' })
    if ($role -eq 'user_management') { $found = $true }
}
$reader.Close()
$conn.Close()

if ($found) {
    Write-Host "`n✅ SUCCESS: user_management role is now present for guido on production" -ForegroundColor Green
} else {
    Write-Host "`n❌ FAILED: user_management role still not found" -ForegroundColor Red
}
