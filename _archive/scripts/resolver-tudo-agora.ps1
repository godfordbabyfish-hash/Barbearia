# Script DEFINITIVO para resolver tudo de uma vez
# Escolhe a melhor solução baseado no diagnóstico

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESOLVER TUDO DEFINITIVO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "https://evolution-api-barbearia.fly.dev"
$apiKey = "testdaapi2026"

# Diagnóstico
Write-Host "=== DIAGNOSTICO ===" -ForegroundColor Yellow
Write-Host ""

$apiFuncionando = $false
$maxTentativas = 5

for ($i = 1; $i -le $maxTentativas; $i++) {
    Write-Host "Tentativa $i/$maxTentativas: Testando API..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        Write-Host "OK API esta funcionando! Status: $($response.StatusCode)" -ForegroundColor Green
        $apiFuncionando = $true
        break
    } catch {
        Write-Host "  Aguardando..." -ForegroundColor Yellow
        if ($i -lt $maxTentativas) {
            Start-Sleep -Seconds 5
        }
    }
}

Write-Host ""

if (-not $apiFuncionando) {
    Write-Host "=== DECISAO ===" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "API Evolution nao esta respondendo apos $maxTentativas tentativas." -ForegroundColor Red
    Write-Host ""
    Write-Host "OPCOES:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "OPCAO 1: Tentar corrigir Evolution API" -ForegroundColor White
    Write-Host "  - Pode levar mais tempo" -ForegroundColor Gray
    Write-Host "  - Pode nao resolver definitivamente" -ForegroundColor Gray
    Write-Host "  - Requer configuracao complexa" -ForegroundColor Gray
    Write-Host ""
    Write-Host "OPCAO 2: Migrar para Baileys + Railway (RECOMENDADO)" -ForegroundColor Green
    Write-Host "  - 100% gratuito" -ForegroundColor Gray
    Write-Host "  - Mais simples e confiavel" -ForegroundColor Gray
    Write-Host "  - Deploy em 15-20 minutos" -ForegroundColor Gray
    Write-Host "  - API compativel (mesma interface)" -ForegroundColor Gray
    Write-Host "  - Todas funcionalidades continuam funcionando" -ForegroundColor Gray
    Write-Host ""
    Write-Host "RECOMENDACAO: Migrar para Baileys" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Execute: .\migrar-para-baileys-agora.ps1" -ForegroundColor Cyan
    exit 1
}

# Se API está funcionando, tentar criar instância
Write-Host "=== API FUNCIONANDO ===" -ForegroundColor Green
Write-Host ""
Write-Host "Criando/verificando instancia..." -ForegroundColor Yellow

$instanceName = "evolution-4"
$headers = @{
    "Content-Type" = "application/json"
    "apikey" = $apiKey
}

$body = @{
    instanceName = $instanceName
    token = "token-${instanceName}-$(Get-Date -Format 'yyyyMMddHHmmss')"
    qrcode = $true
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "${apiUrl}/instance/create" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -TimeoutSec 30 `
        -ErrorAction Stop
    
    Write-Host "OK Instancia criada/verificada!" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 409) {
        Write-Host "OK Instancia ja existe!" -ForegroundColor Green
    } else {
        Write-Host "AVISO: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CONCLUIDO!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se ainda houver problemas, considere migrar para Baileys:" -ForegroundColor Yellow
Write-Host "  .\migrar-para-baileys-agora.ps1" -ForegroundColor Cyan
