# Script para testar envio de mensagem WhatsApp via Railway (versao melhorada)

$RailwayUrl = "https://whatsapp-bot-barbearia-production.up.railway.app"
$ApiKey = "testdaapi2026"
$InstanceName = "default"
$PhoneNumber = "82982212126"
$TestMessage = "Teste de envio de mensagem WhatsApp - Sistema Barbearia"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE DE ENVIO WHATSAPP V2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configurar TLS
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
[Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

# Passo 1: Verificar health/status
Write-Host "PASSO 1: Verificando status do servidor..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "$RailwayUrl/health" `
        -Method GET `
        -UseBasicParsing `
        -TimeoutSec 15 `
        -ErrorAction Stop
    
    Write-Host "  Status Code: $($healthResponse.StatusCode)" -ForegroundColor Green
    $healthData = $healthResponse.Content | ConvertFrom-Json
    Write-Host "  Status: $($healthData.status)" -ForegroundColor Green
    Write-Host "  Conectado: $($healthData.connected)" -ForegroundColor $(if ($healthData.connected) { "Green" } else { "Red" })
    Write-Host "  Connection Status: $($healthData.connectionStatus)" -ForegroundColor Gray
    
    if (-not $healthData.connected) {
        Write-Host ""
        Write-Host "AVISO: WhatsApp nao esta conectado!" -ForegroundColor Red
        Write-Host "  Status atual: $($healthData.connectionStatus)" -ForegroundColor Yellow
        Write-Host "  Conecte o WhatsApp primeiro escaneando o QR Code" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Para conectar:" -ForegroundColor Cyan
        Write-Host "  1. Acesse: $RailwayUrl/instance/connect/$InstanceName" -ForegroundColor Gray
        Write-Host "  2. Configure header 'apikey: $ApiKey' usando ModHeader" -ForegroundColor Gray
        Write-Host "  3. Escaneie o QR Code com WhatsApp" -ForegroundColor Gray
        Write-Host ""
        exit 1
    }
} catch {
    Write-Host "  ERRO ao verificar health: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "O servidor Railway pode estar offline ou com problemas." -ForegroundColor Yellow
    Write-Host "Verifique os logs do Railway em: https://railway.app" -ForegroundColor Cyan
    exit 1
}
Write-Host ""

# Passo 2: Enviar mensagem
Write-Host "PASSO 2: Enviando mensagem de teste..." -ForegroundColor Yellow
try {
    $headers = @{
        "apikey" = $ApiKey
        "Content-Type" = "application/json"
    }
    
    $body = @{
        number = $PhoneNumber
        text = $TestMessage
    } | ConvertTo-Json
    
    Write-Host "  URL: $RailwayUrl/message/sendText/$InstanceName" -ForegroundColor Gray
    Write-Host "  Telefone: $PhoneNumber" -ForegroundColor Gray
    Write-Host "  Mensagem: $TestMessage" -ForegroundColor Gray
    Write-Host ""
    
    $response = Invoke-WebRequest -Uri "$RailwayUrl/message/sendText/$InstanceName" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -UseBasicParsing `
        -TimeoutSec 30 `
        -ErrorAction Stop
    
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SUCESSO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    
    $responseData = $response.Content | ConvertFrom-Json
    Write-Host ""
    Write-Host "Resposta da API:" -ForegroundColor Cyan
    $responseData | ConvertTo-Json -Depth 5 | Write-Host
    
    if ($responseData.success) {
        Write-Host ""
        Write-Host "Mensagem enviada com sucesso!" -ForegroundColor Green
        Write-Host "Verifique o WhatsApp do numero $PhoneNumber" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "AVISO: API retornou success=false" -ForegroundColor Yellow
        Write-Host "  Erro: $($responseData.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ERRO AO ENVIAR MENSAGEM" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host ""
            Write-Host "Resposta do servidor:" -ForegroundColor Yellow
            Write-Host $errorBody -ForegroundColor Gray
        } catch {
            Write-Host "Nao foi possivel ler resposta de erro" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "Possiveis causas:" -ForegroundColor Yellow
    Write-Host "  1. WhatsApp nao esta conectado (verifique health check acima)" -ForegroundColor Gray
    Write-Host "  2. API Key incorreta" -ForegroundColor Gray
    Write-Host "  3. Instancia nao existe ou nome incorreto" -ForegroundColor Gray
    Write-Host "  4. Numero de telefone invalido" -ForegroundColor Gray
    Write-Host "  5. Servidor Railway nao esta respondendo" -ForegroundColor Gray
}

Write-Host ""
