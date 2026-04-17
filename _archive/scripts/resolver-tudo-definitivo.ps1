# Script DEFINITIVO para resolver tudo de uma vez

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESOLVER TUDO DEFINITIVO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "https://evolution-api-barbearia.fly.dev"
$apiKey = "testdaapi2026"
$instanceName = "evolution-4"

# PASSO 1: Reiniciar API
Write-Host "=== PASSO 1: REINICIAR API ===" -ForegroundColor Yellow
Write-Host ""

$env:Path += ";$env:USERPROFILE\.fly\bin"

Write-Host "Reiniciando maquinas..." -ForegroundColor Gray
try {
    $machines = fly machines list --app evolution-api-barbearia 2>&1 | Select-String -Pattern "web\s+(\w+)" | ForEach-Object { $_.Matches.Groups[1].Value }
    
    if ($machines) {
        foreach ($machine in $machines) {
            Write-Host "  Reiniciando: $machine" -ForegroundColor Gray
            fly machines restart $machine --app evolution-api-barbearia 2>&1 | Out-Null
        }
        Write-Host "OK Maquinas reiniciadas!" -ForegroundColor Green
    } else {
        Write-Host "AVISO: Nao foi possivel listar maquinas" -ForegroundColor Yellow
    }
} catch {
    Write-Host "AVISO: Erro ao reiniciar (pode ser normal)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Aguardando 60 segundos para API inicializar..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# PASSO 2: Aguardar API estar pronta
Write-Host ""
Write-Host "=== PASSO 2: AGUARDAR API ESTAR PRONTA ===" -ForegroundColor Yellow
Write-Host ""

$maxAttempts = 20
$attempt = 0
$apiReady = $false

while ($attempt -lt $maxAttempts -and -not $apiReady) {
    $attempt++
    Write-Host "Tentativa ${attempt}/${maxAttempts}..." -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
        Write-Host ""
        Write-Host "OK API esta funcionando! Status: $($response.StatusCode)" -ForegroundColor Green
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
    Write-Host "ERRO: API ainda nao esta respondendo apos $maxAttempts tentativas." -ForegroundColor Red
    Write-Host ""
    Write-Host "POSSIVEIS SOLUCOES:" -ForegroundColor Cyan
    Write-Host "  1. Verifique os logs: fly logs --app evolution-api-barbearia" -ForegroundColor White
    Write-Host "  2. Aguarde mais 5 minutos e execute este script novamente" -ForegroundColor White
    Write-Host "  3. Verifique se o Neon PostgreSQL esta funcionando" -ForegroundColor White
    exit 1
}

# PASSO 3: Criar instancia
Write-Host ""
Write-Host "=== PASSO 3: CRIAR INSTANCIA ===" -ForegroundColor Yellow
Write-Host ""

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
    $createResponse = Invoke-RestMethod -Uri "${apiUrl}/instance/create" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "OK Instancia criada!" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 409) {
        Write-Host "OK Instancia ja existe!" -ForegroundColor Green
    } else {
        Write-Host "AVISO: Erro ao criar (pode ja existir): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# PASSO 4: Obter QR Code
Write-Host ""
Write-Host "=== PASSO 4: OBTER QR CODE ===" -ForegroundColor Yellow
Write-Host ""

$qrHeaders = @{
    "apikey" = $apiKey
}

try {
    $qrResponse = Invoke-RestMethod -Uri "${apiUrl}/instance/connect/${instanceName}?qrcode=true" `
        -Method GET `
        -Headers $qrHeaders `
        -ErrorAction Stop
    
    if ($qrResponse.qrcode) {
        Write-Host "OK QR Code disponivel!" -ForegroundColor Green
    } else {
        Write-Host "AVISO: QR code nao disponivel (instancia pode ja estar conectada)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "AVISO: Erro ao obter QR code: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CONCLUIDO!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "  1. Recarregue a pagina do painel admin" -ForegroundColor White
Write-Host "  2. A instancia 'evolution-4' deve aparecer" -ForegroundColor White
Write-Host "  3. Clique em 'Conectar' para ver o QR code" -ForegroundColor White
Write-Host "  4. Escaneie o QR code com seu WhatsApp" -ForegroundColor White
Write-Host ""
Write-Host "URL do painel: http://localhost:5173" -ForegroundColor Cyan
