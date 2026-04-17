$token = "2a6175ed-03fb-41fd-8fb8-79a688e37760"
$serviceId = "b13a5d95-0e5e-41e8-b271-5a0642e45695"

Write-Host "Testando restart direto..."

# Tentar diferentes mutations
$mutations = @(
    "mutation { serviceRestart(serviceId: `"$serviceId`") }",
    "mutation { serviceRedeploy(serviceId: `"$serviceId`") }",
    "mutation { restartService(serviceId: `"$serviceId`") }",
    "mutation { redeployService(serviceId: `"$serviceId`") }"
)

foreach ($mutation in $mutations) {
    Write-Host "Tentando: $mutation"
    $body = @{ query = $mutation } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "https://backboard.railway.app/graphql/v2" -Method POST -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"} -Body $body
        
        if ($response.errors) {
            Write-Host "  Erro: $($response.errors[0].message)" -ForegroundColor Red
        } else {
            Write-Host "  Sucesso!" -ForegroundColor Green
            Write-Host "  Resultado: $($response.data)" -ForegroundColor White
            break
        }
    } catch {
        Write-Host "  Erro HTTP: $($_.Exception.Message)" -ForegroundColor Red
    }
}