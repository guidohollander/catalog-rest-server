$prodConn = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'

$orphanUrls = @(
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

Write-Host "`n=== Removing $($orphanUrls.Count) orphaned solution_implementation records ===" -ForegroundColor Cyan

$successCount = 0
$failCount = 0

foreach ($url in $orphanUrls) {
    $conn = New-Object System.Data.SqlClient.SqlConnection $prodConn
    try {
        $conn.Open()
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "EXEC RemoveImplementation @fullUrl"
        $cmd.CommandTimeout = 300
        $cmd.Parameters.AddWithValue("@fullUrl", $url) | Out-Null
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "  [REMOVED] $url" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "  [ERROR]   $url -> $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    } finally {
        $conn.Close()
        $conn.Dispose()
    }
}

Write-Host "`n========== SUMMARY ==========" -ForegroundColor Yellow
Write-Host "Removed: $successCount" -ForegroundColor Green
if ($failCount -gt 0) {
    Write-Host "Errors:  $failCount" -ForegroundColor Red
} else {
    Write-Host "Errors:  $failCount"
}
