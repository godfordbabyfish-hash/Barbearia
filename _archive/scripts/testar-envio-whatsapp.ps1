# Script para testar envio de mensagem WhatsApp via Railway

$RailwayUrl = "https://whatsapp-bot-barbearia-production.up.railway.app"
$ApiKey = "testdaapi2026"
$InstanceName = "default"
$PhoneNumber = "82982212126"
$TestMessage = "Teste de envio de mensagem WhatsApp - Sistema Barbearia"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE DE ENVIO WHATSAPP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Configuracao:" -ForegroundColor Yellow
Write-Host "  URL: $RailwayUrl" -ForegroundColor Gray
Write-Host "  Instancia: $InstanceName" -ForegroundColor Gray
Write-Host "  Telefone: $PhoneNumber" -ForegroundColor Gray
Write-Host "  Mensagem: $TestMessage" -ForegroundColor Gray
Write-Host ""

# Passo 1: Verificar health/status
Write-Host "PASSO 1: Verificando status do servidor..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$RailwayUrl/health" -Method GET -ErrorAction Stop
    Write-Host "  Status: $($healthResponse.status)" -ForegroundColor Green
    Write-Host "  Conectado: $($healthResponse.connected)" -ForegroundColor $(if ($healthResponse.connected) { "Green" } else { "Red" })
    Write-Host "  Connection Status: $($healthResponse.connectionStatus)" -ForegroundColor Gray
    
    if (-not $healthResponse.connected) {
        Write-Host ""
        Write-Host "AVISO: WhatsApp nao esta conectado!" -ForegroundColor Red
        Write-Host "  Status atual: $($healthResponse.connectionStatus)" -ForegroundColor Yellow
        Write-Host "  Conecte o WhatsApp primeiro escaneando o QR Code" -ForegroundColor Yellow
        Write-Host ""
        $continue = Read-Host "Deseja continuar mesmo assim? (S/N)"
        if ($continue -ne "S" -and $continue -ne "s") {
            Write-Host "Teste cancelado." -ForegroundColor Yellow
            exit 0
        }
    }
} catch {
    Write-Host "  ERRO ao verificar health: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Continuando mesmo assim..." -ForegroundColor Yellow
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
    Write-Host "  Body: $body" -ForegroundColor Gray
    Write-Host ""
    
    $response = Invoke-RestMethod -Uri "$RailwayUrl/message/sendText/$InstanceName" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SUCESSO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resposta da API:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5 | Write-Host
    
    if ($response.success) {
        Write-Host ""
        Write-Host "Mensagem enviada com sucesso!" -ForegroundColor Green
        Write-Host "Verifique o WhatsApp do numero $PhoneNumber" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "AVISO: API retornou success=false" -ForegroundColor Yellow
        Write-Host "  Erro: $($response.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ERRO AO ENVIAR MENSAGEM" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Resposta do servidor:" -ForegroundColor Yellow
            Write-Host $errorBody -ForegroundColor Gray
        } catch {
            Write-Host "Nao foi possivel ler resposta de erro" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "Possiveis causas:" -ForegroundColor Yellow
    Write-Host "  1. WhatsApp nao esta conectado" -ForegroundColor Gray
    Write-Host "  2. API Key incorreta" -ForegroundColor Gray
    Write-Host "  3. Instancia nao existe ou nome incorreto" -ForegroundColor Gray
    Write-Host "  4. Numero de telefone invalido" -ForegroundColor Gray
    Write-Host "  5. Servidor Railway nao esta respondendo" -ForegroundColor Gray
}

Write-Host ""
Read-Host "Pressione Enter para sair"
