$token = "2a6175ed-03fb-41fd-8fb8-79a688e37760"
$serviceName = "whatsapp-bot-barbearia"

Write-Host "🔄 Testando restart do serviço $serviceName..." -ForegroundColor Yellow

# Primeiro, buscar projetos e serviços
$projectsQuery = '{"query":"query { projects { edges { node { id name services { edges { node { id name } } } } } } }"}'

try {
    Write-Host "1. Buscando projetos..." -ForegroundColor Cyan
    $projectsResponse = Invoke-RestMethod -Uri "https://backboard.railway.app/graphql/v2" -Method POST -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"} -Body $projectsQuery
    
    $targetServiceId = $null
    $targetProjectId = $null
    
    foreach ($project in $projectsResponse.data.projects.edges) {
        Write-Host "   Projeto: $($project.node.name)" -ForegroundColor White
        foreach ($service in $project.node.services.edges) {
            Write-Host "     Serviço: $($service.node.name)" -ForegroundColor Gray
            if ($service.node.name -eq $serviceName) {
                $targetServiceId = $service.node.id
                $targetProjectId = $project.node.id
                Write-Host "   ✅ Serviço encontrado! ID: $targetServiceId" -ForegroundColor Green
                break
            }
        }
        if ($targetServiceId) { break }
    }
    
    if (-not $targetServiceId) {
        Write-Host "❌ Serviço $serviceName não encontrado!" -ForegroundColor Red
        exit 1
    }
    
    # Agora tentar reiniciar
    Write-Host "2. Reiniciando serviço..." -ForegroundColor Cyan
    Write-Host "   Service ID: $targetServiceId" -ForegroundColor Gray
    
    $restartMutation = @{
        query = "mutation serviceRedeploy { serviceRedeploy(serviceId: `"$targetServiceId`") }"
    } | ConvertTo-Json -Depth 3
    
    Write-Host "   Mutation: $restartMutation" -ForegroundColor Gray
    
    $restartResponse = Invoke-RestMethod -Uri "https://backboard.railway.app/graphql/v2" -Method POST -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"} -Body $restartMutation
    
    if ($restartResponse.errors) {
        Write-Host "❌ Erros GraphQL:" -ForegroundColor Red
        $restartResponse.errors | ForEach-Object { Write-Host "  - $($_.message)" -ForegroundColor Red }
    } else {
        Write-Host "✅ Serviço reiniciado com sucesso!" -ForegroundColor Green
        Write-Host "Resultado: $($restartResponse.data.serviceRestart)" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}