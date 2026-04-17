$token = "2a6175ed-03fb-41fd-8fb8-79a688e37760"
$body = '{"query":"query { projects { edges { node { id name } } } }"}'

Write-Host "Testando token Railway..."
try {
    $response = Invoke-RestMethod -Uri "https://backboard.railway.app/graphql/v2" -Method POST -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"} -Body $body
    Write-Host "Sucesso! Projetos:" -ForegroundColor Green
    $response.data.projects.edges | ForEach-Object { Write-Host "- $($_.node.name)" }
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
}