$token = "2a6175ed-03fb-41fd-8fb8-79a688e37760"
$body = '{"query":"query { projects { edges { node { id name services { edges { node { id name } } } } } } }"}'

Write-Host "Buscando serviços nos projetos Railway..."
try {
    $response = Invoke-RestMethod -Uri "https://backboard.railway.app/graphql/v2" -Method POST -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"} -Body $body
    
    foreach ($project in $response.data.projects.edges) {
        Write-Host "`nProjeto: $($project.node.name)" -ForegroundColor Yellow
        foreach ($service in $project.node.services.edges) {
            Write-Host "  Serviço: $($service.node.name)" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
}