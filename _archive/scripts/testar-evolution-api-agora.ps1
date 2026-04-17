# Script para testar se a Evolution API está respondendo

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTAR EVOLUTION API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "https://whatsapp-bot-barbearia-production.up.railway.app"
$apiKey = "testdaapi2026"

Write-Host "URL da API: $apiUrl" -ForegroundColor Yellow
Write-Host "API Key: $apiKey" -ForegroundColor Yellow
Write-Host ""

# Teste 1: Health check básico
Write-Host "1. Testando conexão básica..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 10 -Method GET -ErrorAction Stop
    Write-Host "   ✅ API está respondendo!" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ API não está respondendo" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   A API pode estar offline ou reiniciando." -ForegroundColor Yellow
    Write-Host "   Verifique o Railway Dashboard." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Teste 2: Listar instâncias
Write-Host "2. Testando listagem de instâncias..." -ForegroundColor Cyan
try {
    $headers = @{
        "apikey" = $apiKey
        "Content-Type" = "application/json"
    }
    
    $startTime = Get-Date
    $instancesResponse = Invoke-RestMethod -Uri "$apiUrl/instance/fetchInstances" -Method GET -Headers $headers -TimeoutSec 30
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "   ✅ Listagem OK (demorou $([math]::Round($duration, 2)) segundos)" -ForegroundColor Green
    Write-Host "   Instâncias encontradas: $($instancesResponse.Count)" -ForegroundColor Gray
    
    if ($instancesResponse.Count -gt 0) {
        Write-Host "   Primeira instância: $($instancesResponse[0].instanceName)" -ForegroundColor Gray
        Write-Host "   Status: $($instancesResponse[0].instance.state)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Erro ao listar instâncias" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.Response.StatusCode.value__ -eq 502) {
        Write-Host ""
        Write-Host "   ⚠️  Erro 502: Bad Gateway" -ForegroundColor Yellow
        Write-Host "   A API pode estar inicializando ou reiniciando." -ForegroundColor Yellow
    }
}

Write-Host ""

# Teste 3: Testar tempo de resposta
Write-Host "3. Testando tempo de resposta..." -ForegroundColor Cyan
try {
    $headers = @{
        "apikey" = $apiKey
    }
    
    $startTime = Get-Date
    $testResponse = Invoke-WebRequest -Uri "$apiUrl/instance/fetchInstances" -Method GET -Headers $headers -TimeoutSec 30
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "   Tempo de resposta: $([math]::Round($duration, 2)) segundos" -ForegroundColor Gray
    
    if ($duration -gt 20) {
        Write-Host "   ⚠️  API está muito lenta (>20s)" -ForegroundColor Yellow
        Write-Host "   Isso pode causar timeout no frontend (90s)" -ForegroundColor Yellow
    } elseif ($duration -gt 10) {
        Write-Host "   ⚠️  API está lenta (>10s)" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ Tempo de resposta OK" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Erro ao testar tempo de resposta" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se a API está respondendo mas muito lenta:" -ForegroundColor Yellow
Write-Host "- O processo de gerar QR code pode demorar >90s" -ForegroundColor White
Write-Host "- Isso causa timeout no frontend" -ForegroundColor White
Write-Host "- Solução: Reiniciar o serviço no Railway" -ForegroundColor White
Write-Host ""
Write-Host "Se a API não está respondendo:" -ForegroundColor Yellow
Write-Host "- Verifique o Railway Dashboard" -ForegroundColor White
Write-Host "- Reinicie o serviço se necessário" -ForegroundColor White
Write-Host ""
