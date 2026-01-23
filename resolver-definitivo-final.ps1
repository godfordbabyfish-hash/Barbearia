# Script DEFINITIVO FINAL - Resolve tudo de uma vez

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESOLVER DEFINITIVO - FINAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "https://evolution-api-barbearia.fly.dev"
$apiKey = "testdaapi2026"
$instanceName = "evolution-4"

Write-Host "Aguardando API inicializar (pode levar 3-5 minutos)..." -ForegroundColor Yellow
Write-Host ""

$maxAttempts = 30
$attempt = 0
$apiReady = $false

# Aguardar API estar pronta
while ($attempt -lt $maxAttempts -and -not $apiReady) {
    $attempt++
    Write-Host "Tentativa ${attempt}/${maxAttempts}: Testando API..." -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 20 -UseBasicParsing -ErrorAction Stop
        Write-Host ""
        Write-Host "OK API ESTA FUNCIONANDO! Status: $($response.StatusCode)" -ForegroundColor Green
        $apiReady = $true
        break
    } catch {
        Write-Host "  Aguardando..." -ForegroundColor Yellow
        if ($attempt -lt $maxAttempts) {
            Start-Sleep -Seconds 15
        }
    }
}

if (-not $apiReady) {
    Write-Host ""
    Write-Host "ERRO: API nao esta respondendo apos $maxAttempts tentativas." -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifique os logs:" -ForegroundColor Yellow
    Write-Host "  fly logs --app evolution-api-barbearia" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "=== CRIANDO INSTANCIA ===" -ForegroundColor Yellow
Write-Host ""

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
    
    Write-Host "OK Instancia criada!" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 409) {
        Write-Host "OK Instancia ja existe!" -ForegroundColor Green
    } else {
        Write-Host "AVISO: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== VERIFICANDO INSTANCIA ===" -ForegroundColor Yellow
Write-Host ""

try {
    $listResponse = Invoke-RestMethod -Uri "${apiUrl}/instance/fetchInstances" `
        -Method GET `
        -Headers @{ "apikey" = $apiKey } `
        -TimeoutSec 30 `
        -ErrorAction Stop
    
    if ($listResponse -is [Array] -and $listResponse.Count -gt 0) {
        Write-Host "OK Instancias encontradas: $($listResponse.Count)" -ForegroundColor Green
        foreach ($inst in $listResponse) {
            $name = $inst.instance?.instanceName || $inst.instanceName || "N/A"
            $status = $inst.instance?.state || $inst.state || "N/A"
            Write-Host "  - $name : $status" -ForegroundColor Gray
        }
    } else {
        Write-Host "AVISO: Nenhuma instancia encontrada na lista" -ForegroundColor Yellow
    }
} catch {
    Write-Host "AVISO: Erro ao listar instancias: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CONCLUIDO!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "  1. Recarregue a pagina do painel admin (http://localhost:5173)" -ForegroundColor White
Write-Host "  2. Va em: WhatsApp -> WhatsApp Manager" -ForegroundColor White
Write-Host "  3. A instancia 'evolution-4' deve aparecer" -ForegroundColor White
Write-Host "  4. Clique em 'Conectar' para ver o QR code" -ForegroundColor White
Write-Host "  5. Escaneie o QR code com seu WhatsApp" -ForegroundColor White
Write-Host ""
Write-Host "TUDO PRONTO!" -ForegroundColor Green
