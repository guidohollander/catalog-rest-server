# Rematerialize local DB by running usp_catalog_update
$conn = New-Object System.Data.SqlClient.SqlConnection('Server=localhost,1433;User Id=sa;Password=s@Fy4884#;Encrypt=True;TrustServerCertificate=True;Database=servicecatalog;')
$conn.Open()
Write-Host "Running usp_catalog_update..." -ForegroundColor Cyan
$cmd = $conn.CreateCommand()
$cmd.CommandText = "EXEC usp_catalog_update"
$cmd.CommandTimeout = 600
try {
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "usp_catalog_update completed OK" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
$conn.Close()
Write-Host "Done." -ForegroundColor Green
