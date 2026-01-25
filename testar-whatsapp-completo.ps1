# Teste completo do WhatsApp - Verificar status real e envio

$RailwayUrl = "https://whatsapp-bot-barbearia-production.up.railway.app"
$ApiKey = "testdaapi2026"
$InstanceName = "default"
$PhoneNumber = "82982212126"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE COMPLETO WHATSAPP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configurar TLS
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

# Teste 1: Health Check
Write-Host "TESTE 1: Health Check" -ForegroundColor Yellow
Write-Host "====================" -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "$RailwayUrl/health" `
        -Method GET `
        -UseBasicParsing `
        -TimeoutSec 15 `
        -ErrorAction Stop
    
    $healthData = $healthResponse.Content | ConvertFrom-Json
    Write-Host "  Status: $($healthData.status)" -ForegroundColor Green
    Write-Host "  Connected: $($healthData.connected)" -ForegroundColor $(if ($healthData.connected) { "Green" } else { "Red" })
    Write-Host "  Connection Status: $($healthData.connectionStatus)" -ForegroundColor Gray
    Write-Host "  Port: $($healthData.port)" -ForegroundColor Gray
    Write-Host ""
    
    if (-not $healthData.connected) {
        Write-Host "  AVISO: WhatsApp NAO esta conectado!" -ForegroundColor Red
        Write-Host "  O health check mostra: connected = false" -ForegroundColor Yellow
        Write-Host ""
    }
} catch {
    Write-Host "  ERRO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Teste 2: Listar Instâncias
Write-Host "TESTE 2: Listar Instancias" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow
try {
    $headers = @{
        "apikey" = $ApiKey
    }
    
    $instancesResponse = Invoke-WebRequest -Uri "$RailwayUrl/instance/fetchInstances" `
        -Method GET `
        -Headers $headers `
        -UseBasicParsing `
        -TimeoutSec 15 `
        -ErrorAction Stop
    
    $instancesData = $instancesResponse.Content | ConvertFrom-Json
    
    if ($instancesData.success) {
        Write-Host "  Instancias encontradas: $($instancesData.instances.Count)" -ForegroundColor Green
        foreach ($instance in $instancesData.instances) {
            Write-Host "    - Nome: $($instance.instanceName)" -ForegroundColor Cyan
            Write-Host "      Status: $($instance.status)" -ForegroundColor $(if ($instance.status -eq 'connected' -or $instance.status -eq 'open') { "Green" } else { "Yellow" })
            if ($instance.qrcode) {
                Write-Host "      QR Code: Disponivel" -ForegroundColor Gray
            }
            Write-Host ""
        }
        
        # Verificar se a instancia default existe e seu status
        $defaultInstance = $instancesData.instances | Where-Object { $_.instanceName -eq $InstanceName }
        if ($defaultInstance) {
            Write-Host "  Instancia '$InstanceName' encontrada!" -ForegroundColor Green
            Write-Host "    Status real: $($defaultInstance.status)" -ForegroundColor Cyan
            
            if ($defaultInstance.status -ne 'connected' -and $defaultInstance.status -ne 'open') {
                Write-Host "    AVISO: Status nao e 'connected' ou 'open'!" -ForegroundColor Red
                Write-Host "    O painel admin pode estar mostrando status desatualizado" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  AVISO: Instancia '$InstanceName' nao encontrada!" -ForegroundColor Red
        }
    } else {
        Write-Host "  ERRO: API retornou success=false" -ForegroundColor Red
        Write-Host "  Resposta completa:" -ForegroundColor Yellow
        $instancesData | ConvertTo-Json -Depth 5 | Write-Host
        Write-Host ""
        Write-Host "  Tentando obter resposta raw..." -ForegroundColor Yellow
        try {
            $rawResponse = Invoke-WebRequest -Uri "$RailwayUrl/instance/fetchInstances" `
                -Method GET `
                -Headers $headers `
                -UseBasicParsing `
                -TimeoutSec 15 `
                -ErrorAction Stop
            Write-Host "  Status Code: $($rawResponse.StatusCode)" -ForegroundColor Gray
            Write-Host "  Content: $($rawResponse.Content)" -ForegroundColor Gray
        } catch {
            Write-Host "  Erro ao obter resposta raw: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "  ERRO: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}
Write-Host ""

# Teste 3: Enviar Mensagem
Write-Host "TESTE 3: Enviar Mensagem de Teste" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow
Write-Host ""

# Verificar se WhatsApp está conectado antes de tentar enviar
if ($healthData -and -not $healthData.connected) {
    Write-Host "  AVISO: WhatsApp nao esta conectado (health check mostra connected: false)" -ForegroundColor Red
    Write-Host "  O envio provavelmente vai falhar!" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "  Deseja tentar enviar mesmo assim? (S/N)"
    if ($continue -ne "S" -and $continue -ne "s") {
        Write-Host "  Teste cancelado." -ForegroundColor Yellow
        exit 0
    }
}

try {
    $headers = @{
        "apikey" = $ApiKey
        "Content-Type" = "application/json"
    }
    
    $body = @{
        number = $PhoneNumber
        text = "Teste de envio WhatsApp - Sistema Barbearia - $(Get-Date -Format 'HH:mm:ss')"
    } | ConvertTo-Json
    
    Write-Host "  Enviando para: $PhoneNumber" -ForegroundColor Cyan
    Write-Host "  Instancia: $InstanceName" -ForegroundColor Cyan
    Write-Host ""
    
    $sendResponse = Invoke-WebRequest -Uri "$RailwayUrl/message/sendText/$InstanceName" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -UseBasicParsing `
        -TimeoutSec 30 `
        -ErrorAction Stop
    
    Write-Host "  Status Code: $($sendResponse.StatusCode)" -ForegroundColor Green
    
    $sendData = $sendResponse.Content | ConvertFrom-Json
    Write-Host ""
    Write-Host "  Resposta:" -ForegroundColor Cyan
    $sendData | ConvertTo-Json -Depth 5 | Write-Host
    
    if ($sendData.success) {
        Write-Host ""
        Write-Host "  SUCESSO! Mensagem enviada!" -ForegroundColor Green
        Write-Host "  Verifique o WhatsApp do numero $PhoneNumber" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "  FALHA: API retornou success=false" -ForegroundColor Red
        Write-Host "  Erro: $($sendData.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host ""
    Write-Host "  ERRO AO ENVIAR MENSAGEM" -ForegroundColor Red
    Write-Host "  Erro: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        Write-Host "  Status Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            $reader.Close()
            $errorStream.Close()
            Write-Host ""
            Write-Host "  Resposta do servidor (raw):" -ForegroundColor Yellow
            Write-Host $errorBody -ForegroundColor Gray
            Write-Host ""
            try {
                $errorJson = $errorBody | ConvertFrom-Json
                Write-Host "  Resposta parseada:" -ForegroundColor Yellow
                $errorJson | ConvertTo-Json -Depth 5 | Write-Host
            } catch {
                Write-Host "  Nao foi possivel parsear como JSON" -ForegroundColor Gray
            }
        } catch {
            Write-Host "  Nao foi possivel ler resposta de erro: $($_.Exception.Message)" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se as mensagens nao chegam, verifique:" -ForegroundColor Yellow
Write-Host "  1. Health check mostra connected: true?" -ForegroundColor Gray
Write-Host "  2. Instancia tem status 'connected' ou 'open'?" -ForegroundColor Gray
Write-Host "  3. Logs do Railway mostram erros?" -ForegroundColor Gray
Write-Host "  4. Logs do Supabase (whatsapp-notify) mostram erros?" -ForegroundColor Gray
Write-Host ""
