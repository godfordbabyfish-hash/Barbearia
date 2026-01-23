# Script para diagnosticar problemas da Evolution API

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DIAGNOSTICO EVOLUTION API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "https://evolution-api-barbearia.fly.dev"
$apiKey = "testdaapi2026"

# 1. Testar se API responde
Write-Host "1. Testando se API responde..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "   OK API responde! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ERRO: API nao responde" -ForegroundColor Red
    Write-Host "   Detalhes: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "PROXIMOS PASSOS:" -ForegroundColor Cyan
    Write-Host "   1. Verificar logs: fly logs --app evolution-api-barbearia" -ForegroundColor White
    Write-Host "   2. Reiniciar maquinas: fly machines restart --app evolution-api-barbearia" -ForegroundColor White
    Write-Host "   3. Verificar variaveis de ambiente no Fly.io" -ForegroundColor White
    exit 1
}

# 2. Testar endpoint de listar instâncias
Write-Host ""
Write-Host "2. Testando endpoint de instancias..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "${apiUrl}/instance/fetchInstances" `
        -Method GET `
        -Headers @{ "apikey" = $apiKey } `
        -TimeoutSec 15 `
        -ErrorAction Stop
    
    Write-Host "   OK Endpoint funcionando!" -ForegroundColor Green
    if ($response -is [Array] -and $response.Count -gt 0) {
        Write-Host "   Instancias encontradas: $($response.Count)" -ForegroundColor Green
    } else {
        Write-Host "   Nenhuma instancia encontrada" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ERRO: Endpoint nao funciona" -ForegroundColor Red
    Write-Host "   Detalhes: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 3. Verificar variáveis no Supabase
Write-Host ""
Write-Host "3. Verificando variaveis no Supabase..." -ForegroundColor Yellow
Write-Host "   Execute: npx supabase secrets list" -ForegroundColor White
Write-Host "   Verifique se EVOLUTION_API_URL e EVOLUTION_API_KEY estao configurados" -ForegroundColor White

# 4. Recomendações
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RECOMENDACOES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se a API continua travando, considere:" -ForegroundColor Yellow
Write-Host "  1. Migrar para Baileys + Railway (mais confiavel)" -ForegroundColor White
Write-Host "  2. Verificar logs detalhados do Fly.io" -ForegroundColor White
Write-Host "  3. Reiniciar todas as maquinas" -ForegroundColor White
Write-Host ""
