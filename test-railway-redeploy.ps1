$token = "2a6175ed-03fb-41fd-8fb8-79a688e37760"
$serviceId = "b13a5d95-0e5e-41e8-b271-5a0642e45695"

Write-Host "🔄 Testando redeploy do serviço..." -ForegroundColor Yellow

# Tentar diferentes mutations de redeploy
$mutations = @(
    "mutation { serviceRedeploy(serviceId: `"$serviceId`") }",
    "mutation { serviceInstanceRedeploy(serviceId: `"$serviceId`") }",
    "mutation { deploymentRedeploy(serviceId: `"$serviceId`") }",
    "mutation { redeploy(serviceId: `"$serviceId`") }"
)

foreach ($mutation in $mutations) {
    Write-Host "`nTentando: $mutation" -ForegroundColor Cyan
    $body = @{ query = $mutation } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "https://backboard.railway.app/graphql/v2" -Method POST -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"} -Body $body
        
        if ($response.errors) {
            Write-Host "  Erro GraphQL: $($response.errors[0].message)" -ForegroundColor Red
        } else {
            Write-Host "  ✅ Sucesso!" -ForegroundColor Green
            Write-Host "  Resultado: $($response.data | ConvertTo-Json)" -ForegroundColor White
            break
        }
    } catch {
        Write-Host "  Erro HTTP: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Tentar também com variáveis
Write-Host "`n🔄 Tentando com variáveis..." -ForegroundColor Yellow

$mutationWithVars = @{
    query = "mutation serviceRedeploy(`$serviceId: String!) { serviceRedeploy(serviceId: `$serviceId) }"
    variables = @{ serviceId = $serviceId }
} | ConvertTo-Json -Depth 3

Write-Host "Mutation com variáveis: $mutationWithVars" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "https://backboard.railway.app/graphql/v2" -Method POST -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"} -Body $mutationWithVars
    
    if ($response.errors) {
        Write-Host "Erro GraphQL: $($response.errors[0].message)" -ForegroundColor Red
    } else {
        Write-Host "✅ Sucesso com variáveis!" -ForegroundColor Green
        Write-Host "Resultado: $($response.data | ConvertTo-Json)" -ForegroundColor White
    }
} catch {
    Write-Host "Erro HTTP: $($_.Exception.Message)" -ForegroundColor Red
}