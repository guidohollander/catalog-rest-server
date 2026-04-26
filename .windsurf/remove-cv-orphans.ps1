$prodConn = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'

$orphanUrls = @(
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
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Message_Broker/tags/https:/svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Message_Broker/SC Message broker "SC Message broker"/',
    'https://svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Message_Broker/https:/svn.blyce.com/svn/SOLUTIONCOMPONENTS/SolutionDevelopment/Message_Broker/SC Message broker "SC Message broker"/',
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

Write-Host "`n=== Removing $($orphanUrls.Count) orphaned component_version records ===" -ForegroundColor Cyan

$successCount = 0
$failCount = 0
$notFoundCount = 0

foreach ($url in $orphanUrls) {
    $conn = New-Object System.Data.SqlClient.SqlConnection $prodConn
    try {
        $conn.Open()

        $checkCmd = $conn.CreateCommand()
        $checkCmd.CommandText = "SELECT COUNT(*) FROM component_version WHERE url = @url"
        $checkCmd.Parameters.AddWithValue("@url", $url) | Out-Null
        $exists = [int]$checkCmd.ExecuteScalar()

        if ($exists -eq 0) {
            $checkCmd2 = $conn.CreateCommand()
            $checkCmd2.CommandText = "SELECT COUNT(*) FROM component_version WHERE url = @urlNoSlash"
            $checkCmd2.Parameters.AddWithValue("@urlNoSlash", $url.TrimEnd('/')) | Out-Null
            $exists2 = [int]$checkCmd2.ExecuteScalar()
            if ($exists2 -eq 0) {
                Write-Host "  [NOT FOUND] $url" -ForegroundColor Yellow
                $notFoundCount++
                continue
            }
        }

        $cmd = $conn.CreateCommand()
        $cmd.CommandText = @"
DECLARE @normalizedUrl NVARCHAR(255) = dbo.unifyurl(@fullUrl);
DECLARE @component_name NVARCHAR(255);
DECLARE @version NVARCHAR(255);
SELECT @component_name = component_name, @version = version
FROM component_version WHERE url = @normalizedUrl;
DELETE FROM component_version WHERE url = @normalizedUrl;
IF @component_name IS NOT NULL AND @version IS NOT NULL
BEGIN
    EXEC dbo.usp_delete_from_materialized_views
        @entity_type = 'component_version',
        @component_name = @component_name,
        @version = @version;
END
"@
        $cmd.CommandTimeout = 300
        $cmd.Parameters.AddWithValue("@fullUrl", $url) | Out-Null
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "  [REMOVED]   $url" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "  [ERROR]     $url -> $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    } finally {
        $conn.Close()
        $conn.Dispose()
    }
}

Write-Host "`n========== SUMMARY ==========" -ForegroundColor Yellow
Write-Host "Removed:   $successCount" -ForegroundColor Green
Write-Host "Not found: $notFoundCount" -ForegroundColor Yellow
if ($failCount -gt 0) {
    Write-Host "Errors:    $failCount" -ForegroundColor Red
} else {
    Write-Host "Errors:    $failCount"
}
