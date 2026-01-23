# Script para configurar Render Evolution API via REST API
# Usa a API oficial do Render para atualizar configurações

Write-Host "🚀 Configurando Render Evolution API via API REST..." -ForegroundColor Cyan
Write-Host ""

# Solicitar informações necessárias
Write-Host "📝 Informações necessárias:" -ForegroundColor Yellow
Write-Host ""

# Service ID
$serviceId = Read-Host "Digite o Service ID do evolution-api (ex: srv-xxxxx)"
if (-not $serviceId) {
    Write-Host "❌ Service ID é obrigatório!" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Como encontrar o Service ID:" -ForegroundColor Yellow
    Write-Host "   1. Acesse: https://dashboard.render.com" -ForegroundColor Gray
    Write-Host "   2. Clique no serviço evolution-api" -ForegroundColor Gray
    Write-Host "   3. A URL será: https://dashboard.render.com/web/srv-xxxxx" -ForegroundColor Gray
    Write-Host "   4. O Service ID é o 'srv-xxxxx'" -ForegroundColor Gray
    exit 1
}

# API Key
$apiKey = Read-Host "Digite sua Render API Key (ou pressione Enter para usar variável de ambiente)"
if (-not $apiKey) {
    $apiKey = $env:RENDER_API_KEY
    if (-not $apiKey) {
        Write-Host "❌ API Key é obrigatória!" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Como obter a API Key:" -ForegroundColor Yellow
        Write-Host "   1. Acesse: https://dashboard.render.com/account/api-keys" -ForegroundColor Gray
        Write-Host "   2. Clique em 'New API Key'" -ForegroundColor Gray
        Write-Host "   3. Copie a chave gerada" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   OU configure a variável de ambiente:" -ForegroundColor Yellow
        Write-Host "   \$env:RENDER_API_KEY = 'sua-api-key'" -ForegroundColor Gray
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Configurações recebidas!" -ForegroundColor Green
Write-Host "   Service ID: $serviceId" -ForegroundColor Gray
Write-Host "   API Key: $($apiKey.Substring(0, [Math]::Min(10, $apiKey.Length)))..." -ForegroundColor Gray
Write-Host ""

# URL da API
$apiUrl = "https://api.render.com/v1/services/$serviceId"

# Headers
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

Write-Host "🔧 Configurando Docker Command..." -ForegroundColor Yellow

# Atualizar Docker Command
# Erro de módulos ESM - usar npm run start:prod que tem configurações corretas
$dockerCommandBody = @{
    serviceDetails = @{
        dockerCommand = "npm run start:prod"
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method PATCH -Headers $headers -Body $dockerCommandBody
    Write-Host "✅ Docker Command configurado: npm run start:prod" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  Se não funcionar, use Docker Image oficial:" -ForegroundColor Yellow
    Write-Host "   - Delete o serviço atual" -ForegroundColor Gray
    Write-Host "   - Crie novo com Docker Image: atendai/evolution-api:latest" -ForegroundColor Gray
    Write-Host "   - Docker Command: DEIXE VAZIO" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erro ao configurar Docker Command: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "⚠️  Continuando com variáveis de ambiente..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔧 Configurando variáveis de ambiente..." -ForegroundColor Yellow

# Variáveis de ambiente
$envVars = @(
    @{ key = "AUTHENTICATION_API_KEY"; value = "testdaapi2026" },
    @{ key = "CORS_ORIGIN"; value = "*" },
    @{ key = "DATABASE_ENABLED"; value = "false" },
    @{ key = "DATABASE_PROVIDER"; value = "postgresql" },
    @{ key = "REDIS_ENABLED"; value = "false" },
    @{ key = "PORT"; value = "8080" }
)

$envVarsBody = @{
    serviceDetails = @{
        envVars = $envVars
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method PATCH -Headers $headers -Body $envVarsBody
    Write-Host "✅ Variáveis de ambiente configuradas!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Variáveis configuradas:" -ForegroundColor Gray
    foreach ($var in $envVars) {
        Write-Host "   - $($var.key)=$($var.value)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erro ao configurar variáveis: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "🎉 Configuração concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "   1. Aguarde o redeploy automatico (3-5 minutos)" -ForegroundColor White
Write-Host "   2. Verifique o status em: https://dashboard.render.com" -ForegroundColor White
Write-Host "   3. Quando ficar 'Live', teste: https://evolution-api-bfri.onrender.com/health" -ForegroundColor White
Write-Host ""
Write-Host "   Execute: .\testar-evolution-render.ps1" -ForegroundColor Cyan
Write-Host ""
