$prodConn = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'

$removedUrls = @(
    'https://svn.blyce.com/svn/mbs_anguilla/tags/3.1.4/',
    'https://svn.blyce.com/svn/mts_grenada/branches/2.6.0/',
    'https://svn.blyce.com/svn/mts_grenada/tags/2.6.0/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.1/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.2/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.3/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.4/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.5/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.6/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.7/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.8/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.9/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.10/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.11/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.12/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.13/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.14/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.15/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.16/',
    'https://svn.blyce.com/svn/mts_vct/branches/0.0.17/'
)

$conn = New-Object System.Data.SqlClient.SqlConnection $prodConn
$conn.Open()

Write-Host "`n=== 1. Checking solution_implementation (expect 0 rows each) ===" -ForegroundColor Cyan

$siStillPresent = @()
foreach ($url in $removedUrls) {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT COUNT(*) FROM solution_implementation WHERE url = @url OR url = @urlNoSlash"
    $cmd.Parameters.AddWithValue("@url", $url) | Out-Null
    $cmd.Parameters.AddWithValue("@urlNoSlash", $url.TrimEnd('/')) | Out-Null
    $count = [int]$cmd.ExecuteScalar()
    if ($count -gt 0) {
        Write-Host "  [STILL PRESENT] $url ($count row(s))" -ForegroundColor Red
        $siStillPresent += $url
    } else {
        Write-Host "  [GONE]          $url" -ForegroundColor Green
    }
}

Write-Host "`n=== 2. Checking mvw_solution_implementation for stale rows ===" -ForegroundColor Cyan

$mvwSiStale = @()
foreach ($url in $removedUrls) {
    $cmd2 = $conn.CreateCommand()
    $cmd2.CommandText = "SELECT name, url FROM mvw_solution_implementation WHERE url = @url OR url = @urlNoSlash"
    $cmd2.Parameters.AddWithValue("@url", $url) | Out-Null
    $cmd2.Parameters.AddWithValue("@urlNoSlash", $url.TrimEnd('/')) | Out-Null
    $rdr2 = $cmd2.ExecuteReader()
    while ($rdr2.Read()) {
        $row = [PSCustomObject]@{ Name = $rdr2.GetValue(0); Url = $rdr2.GetValue(1) }
        Write-Host "  [STALE MVW_SI]  $($row.Name) | $($row.Url)" -ForegroundColor Red
        $mvwSiStale += $row
    }
    $rdr2.Close()
}
if ($mvwSiStale.Count -eq 0) {
    Write-Host "  [OK] No stale rows in mvw_solution_implementation" -ForegroundColor Green
}

Write-Host "`n=== 3. Checking mvw_implementation_component for stale rows ===" -ForegroundColor Cyan

$mvwIcStale = @()
foreach ($url in $removedUrls) {
    $cmd3 = $conn.CreateCommand()
    $cmd3.CommandText = @"
SELECT ic.fk_solution_implementation, ic.component_name, ic.component_version
FROM mvw_implementation_component ic
WHERE ic.fk_solution_implementation IN (
    SELECT pk_solution_implementation FROM mvw_solution_implementation WHERE url = @url OR url = @urlNoSlash
)
"@
    $cmd3.Parameters.AddWithValue("@url", $url) | Out-Null
    $cmd3.Parameters.AddWithValue("@urlNoSlash", $url.TrimEnd('/')) | Out-Null
    $rdr3 = $cmd3.ExecuteReader()
    while ($rdr3.Read()) {
        $row = [PSCustomObject]@{ Fk = $rdr3.GetValue(0); Component = $rdr3.GetValue(1); CvUrl = $rdr3.GetValue(2) }
        Write-Host "  [STALE MVW_IC]  fk=$($row.Fk) | $($row.Component) | $($row.CvUrl)" -ForegroundColor Red
        $mvwIcStale += $row
    }
    $rdr3.Close()
}
if ($mvwIcStale.Count -eq 0) {
    Write-Host "  [OK] No stale rows in mvw_implementation_component" -ForegroundColor Green
}

$conn.Close()

Write-Host "`n========== SUMMARY ==========" -ForegroundColor Yellow
Write-Host "solution_implementation still present: $($siStillPresent.Count)"
Write-Host "mvw_solution_implementation stale rows: $($mvwSiStale.Count)"
Write-Host "mvw_implementation_component stale rows: $($mvwIcStale.Count)"

if ($siStillPresent.Count -eq 0 -and $mvwSiStale.Count -eq 0 -and $mvwIcStale.Count -eq 0) {
    Write-Host "`nAll checks PASSED. Removals confirmed and materialized views are clean." -ForegroundColor Green
} else {
    Write-Host "`nSome issues detected. Review output above." -ForegroundColor Red
}
