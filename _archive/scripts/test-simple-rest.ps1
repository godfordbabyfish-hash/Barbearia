$token = "2a6175ed-03fb-41fd-8fb8-79a688e37760"
$serviceId = "b13a5d95-0e5e-41e8-b271-5a0642e45695"

Write-Host "Testando API REST do Railway..."

# Testar endpoint de restart
$url = "https://backboard.railway.app/api/v2/services/$serviceId/restart"
Write-Host "Tentando: $url"

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"}
    Write-Host "Sucesso!" -ForegroundColor Green
    Write-Host "Resposta: $response"
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# Testar endpoint de redeploy
$url2 = "https://backboard.railway.app/api/v2/services/$serviceId/redeploy"
Write-Host "`nTentando: $url2"

try {
    $response = Invoke-RestMethod -Uri $url2 -Method POST -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"}
    Write-Host "Sucesso!" -ForegroundColor Green
    Write-Host "Resposta: $response"
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
}