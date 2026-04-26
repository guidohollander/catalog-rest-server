$prodConn = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'
$svnUser = 'ext-guido.hollander'
$svnPass = 'DlfoGVdElIbs8Oz9DTqv'

$conn = New-Object System.Data.SqlClient.SqlConnection $prodConn
$conn.Open()

# --- 1. solution_implementation ---
Write-Host "`n=== Checking solution_implementation ===" -ForegroundColor Cyan
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT name, url FROM solution_implementation ORDER BY url"
$rdr = $cmd.ExecuteReader()
$siRows = @()
while ($rdr.Read()) {
    $siRows += [PSCustomObject]@{ Name = $rdr.GetValue(0); Url = $rdr.GetValue(1) }
}
$rdr.Close()

Write-Host "$($siRows.Count) solution implementations found in DB"

$siOrphans = @()
foreach ($row in $siRows) {
    $url = $row.Url.TrimEnd('/')
    svn info $url --username $svnUser --password $svnPass --no-auth-cache --non-interactive 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ORPHAN] $url" -ForegroundColor Red
        $siOrphans += $row
    } else {
        Write-Host "  [OK]     $url" -ForegroundColor Green
    }
}

# --- 2. component_version ---
Write-Host "`n=== Checking component_version ===" -ForegroundColor Cyan
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "SELECT component_name, version, url FROM component_version ORDER BY component_name, version"
$rdr2 = $cmd2.ExecuteReader()
$cvRows = @()
while ($rdr2.Read()) {
    $cvRows += [PSCustomObject]@{ ComponentName = $rdr2.GetValue(0); Version = $rdr2.GetValue(1); Url = $rdr2.GetValue(2) }
}
$rdr2.Close()
$conn.Close()

Write-Host "$($cvRows.Count) component versions found in DB"

$cvOrphans = @()
foreach ($row in $cvRows) {
    $url = $row.Url.TrimEnd('/')
    svn info $url --username $svnUser --password $svnPass --no-auth-cache --non-interactive 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ORPHAN] [$($row.ComponentName)] $($row.Version) -> $url" -ForegroundColor Red
        $cvOrphans += $row
    } else {
        Write-Host "  [OK]     [$($row.ComponentName)] $($row.Version) -> $url" -ForegroundColor Green
    }
}

# --- Summary ---
Write-Host "`n========== SUMMARY ==========" -ForegroundColor Yellow
Write-Host "Solution implementation orphans: $($siOrphans.Count)"
foreach ($o in $siOrphans) {
    Write-Host "  SI:  $($o.Name)  |  $($o.Url)" -ForegroundColor Red
}

Write-Host "Component version orphans: $($cvOrphans.Count)"
foreach ($o in $cvOrphans) {
    Write-Host "  CV:  [$($o.ComponentName)] $($o.Version)  |  $($o.Url)" -ForegroundColor Red
}
