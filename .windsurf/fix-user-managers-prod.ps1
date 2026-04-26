# Create user_managers group on production, link to user_management role, add guido
# Mirror of local servicecatalog setup

$prodConn = "Server=DCSCDBH02\DBS22,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Encrypt=True;TrustServerCertificate=True;Database=SERVICECATALOG-D;"

$conn = New-Object System.Data.SqlClient.SqlConnection($prodConn)
$conn.Open()

function Exec-NonQuery {
    param([string]$Label, [string]$Sql)
    Write-Host "`n--- $Label ---" -ForegroundColor Cyan
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $Sql
    $cmd.CommandTimeout = 30
    $rows = $cmd.ExecuteNonQuery()
    Write-Host "  Rows affected: $rows" -ForegroundColor $(if ($rows -gt 0) { 'Green' } else { 'Yellow' })
}

function Get-Scalar {
    param([string]$Sql)
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $Sql
    return $cmd.ExecuteScalar()
}

# Step 1: Check/create user_managers group
Write-Host "`n=== Step 1: Create user_managers group ===" -ForegroundColor Magenta
$existingGroup = Get-Scalar "SELECT CaseId FROM SC_UM_USERGROUP_PROPERTIES WHERE USERGROUPNAME = 'user_managers'"
if ($existingGroup -ne $null -and $existingGroup -ne [DBNull]::Value) {
    Write-Host "  user_managers already exists with CaseId=$existingGroup" -ForegroundColor Yellow
    $groupId = $existingGroup
} else {
    # Get next CaseId (max + 1)
    $newGroupId = [long](Get-Scalar "SELECT ISNULL(MAX(CaseId), 0) + 1 FROM SC_UM_USERGROUP_PROPERTIES")
    Exec-NonQuery "Insert user_managers group (CaseId=$newGroupId)" @"
INSERT INTO SC_UM_USERGROUP_PROPERTIES (CaseId, USERGROUPNAME, USERGROUPDESCRIPTION, DELETED, PHASE)
VALUES ($newGroupId, N'user_managers', N'User managers group', 0, N'Active')
"@
    $groupId = $newGroupId
    Write-Host "  Created user_managers with CaseId=$groupId" -ForegroundColor Green
}

# Step 2: Get the user_management role CaseId on production
Write-Host "`n=== Step 2: Get user_management role CaseId ===" -ForegroundColor Magenta
$roleId = Get-Scalar "SELECT CaseId FROM SC_UM_APPLICATIONROLE_PROPERTIES WHERE APPLICATIONROLENAME = 'user_management' AND DELETED = 0"
if ($roleId -eq $null -or $roleId -eq [DBNull]::Value) {
    Write-Host "  ERROR: user_management role not found on production!" -ForegroundColor Red
    $conn.Close()
    exit 1
}
Write-Host "  user_management role CaseId=$roleId" -ForegroundColor Green

# Step 3: Link user_management role to user_managers group
Write-Host "`n=== Step 3: Link role to group ===" -ForegroundColor Magenta
$existingRoleLink = Get-Scalar "SELECT COUNT(*) FROM SC_UM_APPLICATIONROLE_USERGROUP WHERE APPLICATIONROLEID = $roleId AND USERGROUPID = $groupId AND DELETED = 0"
if ($existingRoleLink -gt 0) {
    Write-Host "  Link already exists" -ForegroundColor Yellow
} else {
    $newLinkId = [long](Get-Scalar "SELECT ISNULL(MAX(LINKID), 0) + 1 FROM SC_UM_APPLICATIONROLE_USERGROUP")
    Exec-NonQuery "Insert role-group link (LINKID=$newLinkId)" @"
INSERT INTO SC_UM_APPLICATIONROLE_USERGROUP (LINKID, APPLICATIONROLEID, USERGROUPID, DELETED)
VALUES ($newLinkId, $roleId, $groupId, 0)
"@
}

# Step 4: Get guido's CaseId (user with CMFUSERID=3)
Write-Host "`n=== Step 4: Get guido's CaseId ===" -ForegroundColor Magenta
$guidoCaseId = Get-Scalar "SELECT CaseId FROM SC_UM_USER_PROPERTIES WHERE CMFUSERID = 3"
if ($guidoCaseId -eq $null -or $guidoCaseId -eq [DBNull]::Value) {
    Write-Host "  ERROR: User with CMFUSERID=3 not found!" -ForegroundColor Red
    $conn.Close()
    exit 1
}
Write-Host "  guido CaseId=$guidoCaseId" -ForegroundColor Green

# Step 5: Add guido to user_managers group
Write-Host "`n=== Step 5: Add guido to user_managers ===" -ForegroundColor Magenta
$existingUserLink = Get-Scalar "SELECT COUNT(*) FROM SC_UM_USER_USERGROUP WHERE USERID = $guidoCaseId AND USERGROUPID = $groupId AND DELETED = 0"
if ($existingUserLink -gt 0) {
    Write-Host "  guido already in user_managers" -ForegroundColor Yellow
} else {
    $newUserLinkId = [long](Get-Scalar "SELECT ISNULL(MAX(LINKID), 0) + 1 FROM SC_UM_USER_USERGROUP")
    Exec-NonQuery "Insert user-group link (LINKID=$newUserLinkId)" @"
INSERT INTO SC_UM_USER_USERGROUP (LINKID, USERID, USERGROUPID, DELETED)
VALUES ($newUserLinkId, $guidoCaseId, $groupId, 0)
"@
}

# Step 6: Verify
Write-Host "`n=== Step 6: Verification ===" -ForegroundColor Magenta
$cmd = $conn.CreateCommand()
$cmd.CommandText = @"
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
$reader = $cmd.ExecuteReader()
$found = $false
while ($reader.Read()) {
    $role = $reader['ApplicationRole']
    $group = $reader['UserGroup']
    Write-Host "  Role=[$role] Group=[$group]" -ForegroundColor $(if ($role -eq 'user_management') { 'Green' } else { 'White' })
    if ($role -eq 'user_management') { $found = $true }
}
$reader.Close()

if ($found) {
    Write-Host "`n✅ SUCCESS: user_management role is now present for guido on production" -ForegroundColor Green
} else {
    Write-Host "`n❌ FAILED: user_management role still not found" -ForegroundColor Red
}

$conn.Close()
