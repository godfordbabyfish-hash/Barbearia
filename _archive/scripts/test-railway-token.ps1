# Teste do token Railway
$token = "2a6175ed-03fb-41fd-8fb8-79a688e37760"

Write-Host "🔍 Testando token Railway..." -ForegroundColor Yellow
Write-Host "Token: $($token.Substring(0,8))...$($token.Substring($token.Length-4))" -ForegroundColor Cyan

$body = @{
    query = "query { projects { edges { node { id name services { edges { node { id name } } } } } } }"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://backboard.railway.app/graphql/v2" -Method POST -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    } -Body $body

    if ($response.errors) {
        Write-Host "❌ Erros GraphQL:" -ForegroundColor Red
        $response.errors | ForEach-Object { Write-Host "  - $($_.message)" -ForegroundColor Red }
    } else {
        Write-Host "✅ Token válido! Projetos encontrados:" -ForegroundColor Green
        foreach ($project in $response.data.projects.edges) {
            Write-Host "📁 Projeto: $($project.node.name)" -ForegroundColor White
            foreach ($service in $project.node.services.edges) {
                Write-Host "  🔧 Serviço: $($service.node.name)" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "❌ Erro na requisição: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}