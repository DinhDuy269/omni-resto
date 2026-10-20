function Test-Endpoint($url, $method = 'Get', $headers = @{}) {
    try {
        $resp = Invoke-WebRequest -Uri $url -Method $method -Headers $headers -UseBasicParsing -ErrorAction Stop
        Write-Host "[$($resp.StatusCode)] $method $url" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
            Write-Host "[$code] $method $url" -ForegroundColor Yellow
        } else {
            Write-Host "[ERR] $method ${url} - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "=== 1. TEST PUBLIC GUEST ENDPOINTS (NO AUTH) ===" -ForegroundColor Cyan
Test-Endpoint "http://localhost:8080/api/menu-items"
Test-Endpoint "http://localhost:8080/api/categories"
Test-Endpoint "http://localhost:8080/api/tables"
Test-Endpoint "http://localhost:8080/api/vouchers/available"
Test-Endpoint "http://localhost:8080/api/vouchers/validate?code=CHAOBANMOI&orderAmount=200000"
Test-Endpoint "http://localhost:8080/api/tables/reservations/track/TEST-CODE"

Write-Host "`n=== 2. TEST PROTECTED ADMIN ENDPOINTS WITHOUT AUTH (EXPECT 401) ===" -ForegroundColor Cyan
Test-Endpoint "http://localhost:8080/api/tables/reservations"
Test-Endpoint "http://localhost:8080/api/vouchers"
Test-Endpoint "http://localhost:8080/api/service-requests/active"
Test-Endpoint "http://localhost:8080/api/users"
Test-Endpoint "http://localhost:8080/api/menu-items" "Post"

Write-Host "`n=== 3. TEST PROTECTED ADMIN ENDPOINTS WITH X-Staff-Key (EXPECT 200 OK) ===" -ForegroundColor Cyan
$staffHeader = @{ "X-Staff-Key" = "STAFF_SECRET_KEY" }
Test-Endpoint "http://localhost:8080/api/tables/reservations" "Get" $staffHeader
Test-Endpoint "http://localhost:8080/api/vouchers" "Get" $staffHeader
Test-Endpoint "http://localhost:8080/api/service-requests/active" "Get" $staffHeader
Test-Endpoint "http://localhost:8080/api/users" "Get" $staffHeader
