$prodConn = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'
$svnUser = 'ext-guido.hollander'
$svnPass = 'DlfoGVdElIbs8Oz9DTqv'

$conn = New-Object System.Data.SqlClient.SqlConnection $prodConn
$conn.Open()

# --- 1. Get SI 1834 details ---
Write-Host "`n=== 1. Solution Implementation 1834 ===" -ForegroundColor Cyan
$cmd1 = $conn.CreateCommand()
$cmd1.CommandText = "SELECT pk_solution_implementation, name, url FROM solution_implementation WHERE pk_solution_implementation = 1834"
$rdr1 = $cmd1.ExecuteReader()
$siName = $null
$siUrl = $null
if ($rdr1.Read()) {
    $siName = $rdr1.GetValue(1)
    $siUrl = $rdr1.GetValue(2)
    Write-Host "  pk: 1834"
    Write-Host "  name: $siName"
    Write-Host "  url:  $siUrl"
} else {
    Write-Host "  [NOT FOUND] No SI with pk=1834" -ForegroundColor Red
}
$rdr1.Close()

if ($siName -eq $null) { $conn.Close(); exit 1 }

# --- 2. Check implementation_component_project ---
Write-Host "`n=== 2. implementation_component_project rows for '$siName' ===" -ForegroundColor Cyan
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "SELECT implementation_name, component_name, component_version, component_project_name, url FROM implementation_component_project WHERE implementation_name = @name"
$cmd2.Parameters.AddWithValue("@name", $siName) | Out-Null
$rdr2 = $cmd2.ExecuteReader()
$icpCount = 0
while ($rdr2.Read()) {
    Write-Host "  [$($rdr2.GetValue(1))] $($rdr2.GetValue(2)) | project=$($rdr2.GetValue(3)) | url=$($rdr2.GetValue(4))"
    $icpCount++
}
$rdr2.Close()
if ($icpCount -eq 0) {
    Write-Host "  [NONE] No rows in implementation_component_project for '$siName'" -ForegroundColor Yellow
}

# --- 3. Check mvw_implementation_component ---
Write-Host "`n=== 3. mvw_implementation_component rows for '$siName' ===" -ForegroundColor Cyan
$cmd3 = $conn.CreateCommand()
$cmd3.CommandText = "SELECT implementation_name, component_name, component_version FROM mvw_implementation_component WHERE implementation_name = @name"
$cmd3.Parameters.AddWithValue("@name", $siName) | Out-Null
$rdr3 = $cmd3.ExecuteReader()
$mvwCount = 0
while ($rdr3.Read()) {
    Write-Host "  [$($rdr3.GetValue(1))] $($rdr3.GetValue(2))"
    $mvwCount++
}
$rdr3.Close()
if ($mvwCount -eq 0) {
    Write-Host "  [NONE] No rows in mvw_implementation_component for '$siName'" -ForegroundColor Yellow
}

# --- 4. Check revision_externals for this SI ---
Write-Host "`n=== 4. revision_externals rows for SI url ===" -ForegroundColor Cyan
$cmd4 = $conn.CreateCommand()
$cmd4.CommandText = "SELECT TOP 10 url, external_url, component_name, component_version FROM revision_externals WHERE url LIKE @urlPattern ORDER BY url"
$cmd4.Parameters.AddWithValue("@urlPattern", $siUrl.TrimEnd('/') + '%') | Out-Null
$rdr4 = $cmd4.ExecuteReader()
$revExtCount = 0
while ($rdr4.Read()) {
    Write-Host "  url=$($rdr4.GetValue(0)) | ext=$($rdr4.GetValue(1)) | comp=$($rdr4.GetValue(2)) | ver=$($rdr4.GetValue(3))"
    $revExtCount++
}
$rdr4.Close()
if ($revExtCount -eq 0) {
    Write-Host "  [NONE] No revision_externals rows for this SI URL" -ForegroundColor Yellow
}

$conn.Close()

# --- 5. Check SVN externals property ---
Write-Host "`n=== 5. SVN svn:externals on SI URL ===" -ForegroundColor Cyan
Write-Host "  URL: $siUrl"
$svnOutput = svn propget svn:externals $siUrl.TrimEnd('/') --username $svnUser --password $svnPass --no-auth-cache --non-interactive 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] svn propget failed: $svnOutput" -ForegroundColor Red
} elseif ([string]::IsNullOrWhiteSpace($svnOutput)) {
    Write-Host "  [EMPTY] No svn:externals property set on this URL" -ForegroundColor Yellow
} else {
    Write-Host "  [FOUND] svn:externals:" -ForegroundColor Green
    $svnOutput | ForEach-Object { Write-Host "    $_" }
}

Write-Host "`n========== DIAGNOSIS ==========" -ForegroundColor Yellow
Write-Host "implementation_component_project rows: $icpCount"
Write-Host "mvw_implementation_component rows:     $mvwCount"
Write-Host "revision_externals rows:               $revExtCount"
