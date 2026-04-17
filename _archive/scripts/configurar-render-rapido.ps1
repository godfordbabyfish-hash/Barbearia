# Script rápido para configurar Render Evolution API
# Service ID já configurado: srv-d5ogsj14tr6s73eor11g

$serviceId = "srv-d5ogsj14tr6s73eor11g"
$apiUrl = "https://api.render.com/v1/services/$serviceId"

Write-Host "Configurando Render Evolution API..." -ForegroundColor Cyan
Write-Host "Service ID: $serviceId" -ForegroundColor Gray
Write-Host ""

# Solicitar API Key
$apiKey = Read-Host "Digite sua Render API Key (ou pressione Enter se ja configurou RENDER_API_KEY)"
if (-not $apiKey) {
    $apiKey = $env:RENDER_API_KEY
    if (-not $apiKey) {
        Write-Host "ERRO: API Key e obrigatoria!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Como obter:" -ForegroundColor Yellow
        Write-Host "1. Acesse: https://dashboard.render.com/account/api-keys" -ForegroundColor Gray
        Write-Host "2. Clique em 'New API Key'" -ForegroundColor Gray
        Write-Host "3. Copie a chave gerada" -ForegroundColor Gray
        Write-Host ""
        Write-Host "OU configure: `$env:RENDER_API_KEY = 'sua-api-key'" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "Configuracoes recebidas!" -ForegroundColor Green
Write-Host "API Key: $($apiKey.Substring(0, [Math]::Min(10, $apiKey.Length)))..." -ForegroundColor Gray
Write-Host ""

# Headers
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

Write-Host "Configurando Docker Command..." -ForegroundColor Yellow

# Atualizar Docker Command
# Tentar sobrescrever entrypoint para pular migrations
# Vamos tentar diferentes comandos que podem pular migrations
$dockerCommands = @(
    "node ./dist/src/main.js",
    "node dist/main.js",
    "sh -c 'node ./dist/src/main.js'",
    "sh -c 'npm run start:prod'"
)

Write-Host "Tentando comandos para pular migrations..." -ForegroundColor Yellow
$success = $false

foreach ($cmd in $dockerCommands) {
    Write-Host "Tentando: $cmd" -ForegroundColor Gray
    
    $dockerCommandBody = @{
        serviceDetails = @{
            dockerCommand = $cmd
        }
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Method PATCH -Headers $headers -Body $dockerCommandBody
        Write-Host "OK: Docker Command configurado: $cmd" -ForegroundColor Green
        $success = $true
        break
    } catch {
        Write-Host "Erro com $cmd : $($_.Exception.Message)" -ForegroundColor Yellow
        # Continua para o proximo
    }
}

if (-not $success) {
    Write-Host "ERRO: Nenhum comando funcionou via API." -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUCAO ALTERNATIVA:" -ForegroundColor Yellow
    Write-Host "1. Delete o servico atual" -ForegroundColor Gray
    Write-Host "2. Crie novo com Docker Image: atendai/evolution-api:v2.1.1" -ForegroundColor Gray
    Write-Host "3. Docker Command: sh -c 'node dist/main'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "OU migre para FLY.IO (veja: SOLUCAO_DEFINITIVA_MIGRATIONS.md)" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "Configurando variaveis de ambiente..." -ForegroundColor Yellow

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
    Write-Host "OK: Variaveis de ambiente configuradas!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Variaveis configuradas:" -ForegroundColor Gray
    foreach ($var in $envVars) {
        Write-Host "  - $($var.key)=$($var.value)" -ForegroundColor Gray
    }
} catch {
    Write-Host "ERRO ao configurar variaveis: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Configuracao concluida!" -ForegroundColor Green
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Aguarde o redeploy automatico (3-5 minutos)" -ForegroundColor White
Write-Host "2. Verifique o status em: https://dashboard.render.com" -ForegroundColor White
Write-Host "3. Quando ficar 'Live', teste: https://evolution-api-bfri.onrender.com/health" -ForegroundColor White
Write-Host ""
Write-Host "Execute: .\testar-evolution-render.ps1" -ForegroundColor Cyan
Write-Host ""
