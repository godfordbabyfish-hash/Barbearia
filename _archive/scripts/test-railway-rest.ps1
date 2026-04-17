$token = "2a6175ed-03fb-41fd-8fb8-79a688e37760"
$serviceId = "b13a5d95-0e5e-41e8-b271-5a0642e45695"
$projectId = "powerful-grace"

Write-Host "🔄 Testando API REST do Railway..." -ForegroundColor Yellow

# Tentar diferentes endpoints REST
$endpoints = @(
    "https://backboard.railway.app/api/v2/services/$serviceId/restart",
    "https://backboard.railway.app/api/v2/services/$serviceId/redeploy",
    "https://backboard.railway.app/api/services/$serviceId/restart",
    "https://backboard.railway.app/api/services/$serviceId/redeploy",
    "https://api.railway.app/v1/services/$serviceId/restart",
    "https://api.railway.app/v1/services/$serviceId/redeploy"
)

foreach ($endpoint in $endpoints) {
    Write-Host "`nTentando: $endpoint" -ForegroundColor Cyan
    
    try {
        $response = Invoke-WebRequest -Uri $endpoint -Method POST -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"} -ErrorAction Stop
        
        Write-Host "  ✅ Sucesso! Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "  Resposta: $($response.Content)" -ForegroundColor White
        break
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  Erro HTTP: $statusCode - $($_.Exception.Message)" -ForegroundColor Red
        
        if ($statusCode -eq 404) {
            Write-Host "    (Endpoint não existe)" -ForegroundColor Gray
        } elseif ($statusCode -eq 401) {
            Write-Host "    (Não autorizado)" -ForegroundColor Gray
        } elseif ($statusCode -eq 403) {
            Write-Host "    (Proibido)" -ForegroundColor Gray
        } elseif ($statusCode -eq 405) {
            Write-Host "    (Método não permitido)" -ForegroundColor Gray
        }
    }
}

# Tentar também com GET para ver se o endpoint existe
Write-Host "`n🔍 Verificando se endpoints existem (GET)..." -ForegroundColor Yellow

$getEndpoints = @(
    "https://backboard.railway.app/api/v2/services/$serviceId",
    "https://api.railway.app/v1/services/$serviceId"
)

foreach ($endpoint in $getEndpoints) {
    Write-Host "`nTentando GET: $endpoint" -ForegroundColor Cyan
    
    try {
        $response = Invoke-WebRequest -Uri $endpoint -Method GET -Headers @{"Authorization" = "Bearer $token"} -ErrorAction Stop
        
        Write-Host "  ✅ Endpoint existe! Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "  Resposta: $($response.Content.Substring(0, [Math]::Min(200, $response.Content.Length)))..." -ForegroundColor White
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  Status: $statusCode" -ForegroundColor Red
    }
}