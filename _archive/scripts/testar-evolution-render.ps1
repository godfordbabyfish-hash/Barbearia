# Script para testar se a Evolution API no Render está respondendo

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTAR EVOLUTION API NO RENDER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Solicitar URL
$url = Read-Host "Digite a URL da Evolution API no Render (ex: https://evolution-api-barbearia.onrender.com)"

if ([string]::IsNullOrWhiteSpace($url)) {
    Write-Host "❌ URL não pode estar vazia!" -ForegroundColor Red
    exit 1
}

$url = $url.TrimEnd('/')

# Solicitar API Key
$apiKey = Read-Host "Digite a API_KEY configurada no Render (ex: testdaapi2026)"

if ([string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Host "❌ API Key não pode estar vazia!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Testando: $url" -ForegroundColor Yellow
Write-Host ""

# Teste 1: Health check
Write-Host "1. Testando endpoint /health..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri "$url/health" -Method GET -TimeoutSec 30
    Write-Host "   ✅ Health check OK" -ForegroundColor Green
    $healthResponse | ConvertTo-Json -Depth 3 | Write-Host
} catch {
    Write-Host "   ⚠️  Health check falhou ou endpoint não existe (pode ser normal)" -ForegroundColor Yellow
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# Teste 2: Listar instâncias
Write-Host "2. Testando endpoint /instance/fetchInstances..." -ForegroundColor Cyan
try {
    $headers = @{
        "apikey" = $apiKey
        "Content-Type" = "application/json"
    }
    
    $instancesResponse = Invoke-RestMethod -Uri "$url/instance/fetchInstances" -Method GET -Headers $headers -TimeoutSec 30
    Write-Host "   ✅ Listagem de instâncias OK" -ForegroundColor Green
    $instancesResponse | ConvertTo-Json -Depth 3 | Write-Host
} catch {
    Write-Host "   ❌ Erro ao listar instâncias" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "   Mensagem: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails) {
        Write-Host "   Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se ambos os testes passaram, a API está funcionando!" -ForegroundColor Green
Write-Host "Agora você pode atualizar EVOLUTION_API_URL no Supabase." -ForegroundColor Yellow
Write-Host ""
