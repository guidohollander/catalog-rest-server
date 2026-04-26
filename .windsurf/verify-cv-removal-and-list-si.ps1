$prodConn = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'

$removedUrls = @(
    'https://svn.blyce.com^/solutioncomponents/solutiondevelopment/tags/4.2.1/',
    'https://svn.blyce.com^/solutioncomponents/solutiondevelopment/tags/3.3.0/',
    'https://svn.blyce.com^/solutioncomponents/solutiondevelopment/tags/2.1.0/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Batch_processing/branches/24.2.6_hotfix/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Berichtenbox_Feeder_Wrapper/branches/24.2.6_hotfix/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Financial_Application_Parameters/branches/24.2.6_hotfix/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Financial_Balance/branches/3.4.0/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Financial_Balance/tags/3.3.2/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Integration/branches/24.2.6_hotfix/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Integration/tags/5.0.2_24.2.6/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Library/branches/24.2.6_hotfix/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Message_Broker/branches/24.2.6_hotfix/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Message_Broker/tags/3.0.0_24.2.6/',
    'https://svn.blyce.com/svn/MTS_ANGLO/MTS_Interaction/tags/trunk/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Payment_Obligation/tags/3.4.0/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Period/tags/0.0.1/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Person_Registration/branches/3.7.2/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Person_Registration/branches/3.8.2/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Property_Registration/tags/3.9.0_23.2.9/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Return_Period/tags/3.54.0/',
    'https://svn.blyce.com/svn/FRONT-END-PUBLIC/SL_ANGLO/tags/23.1.0/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Stamp_Duty/tags/2.2.1/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/User_Assignment/branches/24.2.6_hotfix/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/User_Management/branches/24.2.6_hotfix/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Work_Items/branches/24.2.6_hotfix/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Work_Items/tags/4.0.0/'
)

$conn = New-Object System.Data.SqlClient.SqlConnection $prodConn
$conn.Open()

# --- 1. Verify component_version rows are gone ---
Write-Host "`n=== 1. Verifying component_version removals ===" -ForegroundColor Cyan
$cvStillPresent = @()
foreach ($url in $removedUrls) {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT COUNT(*) FROM component_version WHERE url = @url OR url = @urlNoSlash"
    $cmd.Parameters.AddWithValue("@url", $url) | Out-Null
    $cmd.Parameters.AddWithValue("@urlNoSlash", $url.TrimEnd('/')) | Out-Null
    $count = [int]$cmd.ExecuteScalar()
    if ($count -gt 0) {
        Write-Host "  [STILL PRESENT] $url ($count row(s))" -ForegroundColor Red
        $cvStillPresent += $url
    } else {
        Write-Host "  [GONE]          $url" -ForegroundColor Green
    }
}

# --- 2. Verify mvw_component_version is clean ---
Write-Host "`n=== 2. Checking mvw_component_version for stale rows ===" -ForegroundColor Cyan
$mvwCvStale = @()
foreach ($url in $removedUrls) {
    $cmd2 = $conn.CreateCommand()
    $cmd2.CommandText = "SELECT component_name, version, url FROM mvw_component_version WHERE url = @url OR url = @urlNoSlash"
    $cmd2.Parameters.AddWithValue("@url", $url) | Out-Null
    $cmd2.Parameters.AddWithValue("@urlNoSlash", $url.TrimEnd('/')) | Out-Null
    $rdr2 = $cmd2.ExecuteReader()
    while ($rdr2.Read()) {
        $row = [PSCustomObject]@{ Component = $rdr2.GetValue(0); Version = $rdr2.GetValue(1); Url = $rdr2.GetValue(2) }
        Write-Host "  [STALE] [$($row.Component)] $($row.Version) -> $($row.Url)" -ForegroundColor Red
        $mvwCvStale += $row
    }
    $rdr2.Close()
}
if ($mvwCvStale.Count -eq 0) {
    Write-Host "  [OK] No stale rows in mvw_component_version" -ForegroundColor Green
}

# --- 3. List solution implementations with NO component versions ---
Write-Host "`n=== 3. Solution implementations with NO component versions ===" -ForegroundColor Cyan
$cmd3 = $conn.CreateCommand()
$cmd3.CommandText = @"
SELECT si.name, si.url
FROM solution_implementation si
WHERE NOT EXISTS (
    SELECT 1
    FROM implementation_component_project icp
    WHERE icp.implementation_name = si.name
)
ORDER BY si.name
"@
$rdr3 = $cmd3.ExecuteReader()
$siNoCV = @()
while ($rdr3.Read()) {
    $row = [PSCustomObject]@{ Name = $rdr3.GetValue(0); Url = $rdr3.GetValue(1) }
    Write-Host "  [NO CVs] $($row.Name) | $($row.Url)" -ForegroundColor Yellow
    $siNoCV += $row
}
$rdr3.Close()
if ($siNoCV.Count -eq 0) {
    Write-Host "  [OK] All solution implementations have at least one component version" -ForegroundColor Green
}

$conn.Close()

Write-Host "`n========== SUMMARY ==========" -ForegroundColor Yellow
Write-Host "component_version still present: $($cvStillPresent.Count)"
Write-Host "mvw_component_version stale rows: $($mvwCvStale.Count)"
Write-Host "SIs with no component versions:  $($siNoCV.Count)"

if ($cvStillPresent.Count -eq 0 -and $mvwCvStale.Count -eq 0) {
    Write-Host "`nCV removal verified. Materialized views are clean." -ForegroundColor Green
} else {
    Write-Host "`nSome CV issues detected - review above." -ForegroundColor Red
}
