$connStr = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'
$svnUser = 'ext-guido.hollander'
$svnPass = 'DlfoGVdElIbs8Oz9DTqv'

$siName = 'mbs anguilla tags/3.1.2'
$siUrl  = 'https://svn.blyce.com/svn/mbs_anguilla/tags/3.1.2'

$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

# 1. solution_implementation row
Write-Host "=== 1. solution_implementation row ===" -ForegroundColor Cyan
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT name, version, url, revision, externals FROM solution_implementation WHERE name = @name"
$cmd.Parameters.AddWithValue("@name", $siName) | Out-Null
$rdr = $cmd.ExecuteReader()
if ($rdr.Read()) {
    Write-Host "  name:     $($rdr.GetValue(0))"
    Write-Host "  version:  $($rdr.GetValue(1))"
    Write-Host "  url:      $($rdr.GetValue(2))"
    Write-Host "  revision: $($rdr.GetValue(3))"
    Write-Host "  externals (truncated): $([string]$rdr.GetValue(4) | Select-Object -First 1)"
} else {
    Write-Host "  [NOT FOUND]" -ForegroundColor Red
}
$rdr.Close()

# 2. implementation_component_project rows
Write-Host "`n=== 2. implementation_component_project rows ===" -ForegroundColor Cyan
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "SELECT implementation_name, component_name, component_version, component_project_name, url FROM implementation_component_project WHERE implementation_name = @name"
$cmd2.Parameters.AddWithValue("@name", $siName) | Out-Null
$rdr2 = $cmd2.ExecuteReader()
$icpCount = 0
while ($rdr2.Read()) {
    Write-Host "  [$($rdr2.GetValue(1))] $($rdr2.GetValue(2)) | proj=$($rdr2.GetValue(3)) | url=$($rdr2.GetValue(4))"
    $icpCount++
}
$rdr2.Close()
if ($icpCount -eq 0) { Write-Host "  [NONE]" -ForegroundColor Yellow }

# 3. mvw_implementation_component rows
Write-Host "`n=== 3. mvw_implementation_component rows ===" -ForegroundColor Cyan
$cmd3 = $conn.CreateCommand()
$cmd3.CommandText = "SELECT implementation_name, component_name, component_version, deleted FROM mvw_implementation_component WHERE implementation_name = @name"
$cmd3.Parameters.AddWithValue("@name", $siName) | Out-Null
$rdr3 = $cmd3.ExecuteReader()
$mvwCount = 0
while ($rdr3.Read()) {
    Write-Host "  [$($rdr3.GetValue(1))] $($rdr3.GetValue(2)) | deleted=$($rdr3.GetValue(3))"
    $mvwCount++
}
$rdr3.Close()
if ($mvwCount -eq 0) { Write-Host "  [NONE]" -ForegroundColor Yellow }

# 4. revision_externals
Write-Host "`n=== 4. revision_externals for this SI URL ===" -ForegroundColor Cyan
$cmd4 = $conn.CreateCommand()
$cmd4.CommandText = "SELECT TOP 20 url, external_url, component_name, component_version FROM revision_externals WHERE url LIKE @urlPat ORDER BY url"
$cmd4.Parameters.AddWithValue("@urlPat", $siUrl + '%') | Out-Null
$rdr4 = $cmd4.ExecuteReader()
$revExtCount = 0
while ($rdr4.Read()) {
    Write-Host "  url=$($rdr4.GetValue(0))"
    Write-Host "  ext=$($rdr4.GetValue(1)) comp=$($rdr4.GetValue(2)) ver=$($rdr4.GetValue(3))"
    $revExtCount++
}
$rdr4.Close()
if ($revExtCount -eq 0) { Write-Host "  [NONE] No revision_externals rows" -ForegroundColor Yellow }

$conn.Close()

# 5. SVN externals
Write-Host "`n=== 5. SVN svn:externals on $siUrl ===" -ForegroundColor Cyan
$svnOut = svn propget svn:externals $siUrl --username $svnUser --password $svnPass --no-auth-cache --non-interactive 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [SVN ERROR] $svnOut" -ForegroundColor Red
} elseif ([string]::IsNullOrWhiteSpace("$svnOut")) {
    Write-Host "  [EMPTY] No svn:externals set" -ForegroundColor Yellow
} else {
    Write-Host "  [FOUND]" -ForegroundColor Green
    $svnOut | ForEach-Object { Write-Host "    $_" }
}

Write-Host "`n========== DIAGNOSIS ==========" -ForegroundColor Yellow
Write-Host "implementation_component_project rows: $icpCount"
Write-Host "mvw_implementation_component rows:     $mvwCount"
Write-Host "revision_externals rows:               $revExtCount"
