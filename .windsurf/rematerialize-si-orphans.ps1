$connStr = 'Server=192.168.10.52,18022;User Id=guido.hollander;Password=1ZPwe7JvDqaFM8huvUOy;Database=SERVICECATALOG-D'
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

# Check if usp_materialize_solution_implementation exists on production
$checkCmd = $conn.CreateCommand()
$checkCmd.CommandText = "SELECT COUNT(*) FROM sys.objects WHERE type = 'P' AND name = 'usp_materialize_solution_implementation'"
$exists = [int]$checkCmd.ExecuteScalar()

if ($exists -eq 0) {
    Write-Host "[MISSING] usp_materialize_solution_implementation does not exist on production!" -ForegroundColor Red
    $conn.Close()
    exit 1
}
Write-Host "[OK] usp_materialize_solution_implementation exists on production" -ForegroundColor Green

# Get the 19 SIs without mvw_implementation_component rows
$listCmd = $conn.CreateCommand()
$listCmd.CommandText = @"
SELECT si.name, si.url
FROM mvw_solution_implementation si
WHERE NOT EXISTS (
    SELECT 1 FROM mvw_implementation_component ic WHERE ic.implementation_name = si.name
)
ORDER BY si.name
"@
$rdr = $listCmd.ExecuteReader()
$siList = @()
while ($rdr.Read()) {
    $siList += [PSCustomObject]@{ Name = $rdr.GetValue(0); Url = $rdr.GetValue(1) }
}
$rdr.Close()

Write-Host "`n=== Rematerializing $($siList.Count) SIs with no component versions ===" -ForegroundColor Cyan

$successCount = 0
$failCount = 0

foreach ($si in $siList) {
    $matCmd = $conn.CreateCommand()
    $matCmd.CommandText = "EXEC usp_materialize_solution_implementation @implementation_name = @name"
    $matCmd.CommandTimeout = 600
    $matCmd.Parameters.AddWithValue("@name", $si.Name) | Out-Null
    try {
        $matCmd.ExecuteNonQuery() | Out-Null
        Write-Host "  [DONE] $($si.Name)" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "  [ERROR] $($si.Name) -> $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
}

# Verify results
Write-Host "`n=== Verifying: checking mvw_implementation_component row counts ===" -ForegroundColor Cyan
foreach ($si in $siList) {
    $verCmd = $conn.CreateCommand()
    $verCmd.CommandText = "SELECT COUNT(*) FROM mvw_implementation_component WHERE implementation_name = @name"
    $verCmd.Parameters.AddWithValue("@name", $si.Name) | Out-Null
    $cnt = [int]$verCmd.ExecuteScalar()
    if ($cnt -gt 0) {
        Write-Host "  [OK]   $($si.Name): $cnt rows" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $($si.Name): still 0 rows" -ForegroundColor Red
    }
}

$conn.Close()

Write-Host "`n========== SUMMARY ==========" -ForegroundColor Yellow
Write-Host "Rematerialized: $successCount"
if ($failCount -gt 0) {
    Write-Host "Errors:         $failCount" -ForegroundColor Red
} else {
    Write-Host "Errors:         $failCount"
}
