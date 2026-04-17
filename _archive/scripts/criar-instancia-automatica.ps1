# Script para criar instancia WhatsApp automaticamente quando API estiver pronta

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CRIAR INSTANCIA WHATSAPP AUTOMATICA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "https://evolution-api-barbearia.fly.dev"
$apiKey = "testdaapi2026"
$instanceName = "evolution-4"
$maxAttempts = 30
$attempt = 0
$apiReady = $false

Write-Host "Aguardando Evolution API inicializar..." -ForegroundColor Yellow
Write-Host ""

# PASSO 1: Aguardar API estar pronta
while ($attempt -lt $maxAttempts -and -not $apiReady) {
    $attempt++
    Write-Host "Tentativa ${attempt} de ${maxAttempts}: Verificando API..." -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        Write-Host ""
        Write-Host "OK API esta funcionando! Status: $($response.StatusCode)" -ForegroundColor Green
        $apiReady = $true
        break
    } catch {
        Write-Host "  API ainda nao esta respondendo..." -ForegroundColor Yellow
        
        if ($attempt -lt $maxAttempts) {
            Write-Host "  Aguardando 10 segundos..." -ForegroundColor Gray
            Start-Sleep -Seconds 10
        }
    }
}

if (-not $apiReady) {
    Write-Host ""
    Write-Host "ERRO: API nao esta respondendo apos ${maxAttempts} tentativas." -ForegroundColor Red
    Write-Host ""
    Write-Host "POSSIVEIS SOLUCOES:" -ForegroundColor Cyan
    Write-Host "  1. Verifique os logs: fly logs --app evolution-api-barbearia" -ForegroundColor White
    Write-Host "  2. Reinicie a API: fly machines restart --app evolution-api-barbearia" -ForegroundColor White
    Write-Host "  3. Aguarde mais alguns minutos e execute este script novamente" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "=== PASSO 2: CRIAR INSTANCIA ===" -ForegroundColor Yellow
Write-Host ""

# PASSO 2: Criar instancia
Write-Host "Criando instancia '$instanceName'..." -ForegroundColor Gray

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
    $createResponse = Invoke-RestMethod -Uri "$apiUrl/instance/create" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "OK Instancia criada ou ja existe!" -ForegroundColor Green
    Write-Host ""
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 409) {
        Write-Host "OK Instancia ja existe!" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "AVISO: Erro ao criar instancia (pode ja existir): $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host ""
    }
}

# PASSO 3: Obter QR Code
Write-Host "=== PASSO 3: OBTER QR CODE ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Obtendo QR code..." -ForegroundColor Gray

$qrHeaders = @{
    "apikey" = $apiKey
}

try {
    $qrResponse = Invoke-RestMethod -Uri "${apiUrl}/instance/connect/${instanceName}?qrcode=true" `
        -Method GET `
        -Headers $qrHeaders `
        -ErrorAction Stop
    
    if ($qrResponse.qrcode) {
        if ($qrResponse.qrcode.base64) {
            Write-Host ""
            Write-Host "OK QR CODE OBTIDO!" -ForegroundColor Green
            Write-Host ""
            Write-Host "A instancia '$instanceName' foi criada com sucesso!" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
            Write-Host "  1. Acesse o painel admin" -ForegroundColor White
            Write-Host "  2. Va em: WhatsApp -> WhatsApp Manager" -ForegroundColor White
            Write-Host "  3. O QR code aparecera automaticamente" -ForegroundColor White
            Write-Host "  4. Escaneie o QR code com seu WhatsApp" -ForegroundColor White
            Write-Host ""
        } else {
            Write-Host "AVISO: QR code nao esta em formato base64" -ForegroundColor Yellow
            Write-Host "Acesse o painel admin para ver o QR code" -ForegroundColor White
        }
    } else {
        Write-Host "AVISO: QR code nao disponivel na resposta" -ForegroundColor Yellow
        Write-Host "A instancia pode ja estar conectada" -ForegroundColor White
    }
} catch {
    Write-Host "AVISO: Erro ao obter QR code: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "A instancia foi criada. Acesse o painel admin para ver o QR code." -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== CONCLUIDO ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Instancia '$instanceName' esta pronta!" -ForegroundColor Green
Write-Host "Acesse o painel admin para conectar o WhatsApp." -ForegroundColor White
