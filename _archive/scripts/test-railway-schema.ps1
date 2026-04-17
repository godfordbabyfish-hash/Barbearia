$token = "2a6175ed-03fb-41fd-8fb8-79a688e37760"

Write-Host "🔍 Descobrindo mutations disponíveis no Railway..." -ForegroundColor Yellow

$introspectionQuery = '{"query":"query IntrospectionQuery { __schema { mutationType { fields { name description args { name type { name } } } } } }"}'

try {
    $response = Invoke-RestMethod -Uri "https://backboard.railway.app/graphql/v2" -Method POST -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"} -Body $introspectionQuery
    
    Write-Host "Mutations disponíveis:" -ForegroundColor Green
    $response.data.__schema.mutationType.fields | Where-Object { $_.name -like "*service*" } | ForEach-Object {
        Write-Host "  - $($_.name): $($_.description)" -ForegroundColor Cyan
        if ($_.args) {
            $_.args | ForEach-Object {
                Write-Host "    Arg: $($_.name) ($($_.type.name))" -ForegroundColor Gray
            }
        }
    }
    
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
}