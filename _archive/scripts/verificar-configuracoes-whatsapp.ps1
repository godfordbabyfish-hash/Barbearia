# Script para verificar configurações do WhatsApp diretamente
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VERIFICACAO DETALHADA WHATSAPP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$supabaseUrl = "https://wabefmgfsatlusevxyfo.supabase.co"
$supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc"

# ============================================
# 1. VERIFICAR INSTANCIA ATIVA NO BANCO
# ============================================
Write-Host "=== 1. INSTANCIA WHATSAPP ATIVA ===" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/site_config?config_key=eq.whatsapp_active_instance&select=config_value" `
        -Method GET `
        -Headers @{
            "apikey" = $supabaseAnonKey
            "Authorization" = "Bearer $supabaseAnonKey"
        } `
        -ErrorAction Stop
    
    if ($response -and $response.Count -gt 0 -and $response[0].config_value) {
        $instanceConfig = $response[0].config_value | ConvertFrom-Json
        Write-Host "OK Instancia ativa encontrada!" -ForegroundColor Green
        Write-Host "  Nome: $($instanceConfig.instanceName)" -ForegroundColor Gray
        Write-Host "  Status: $($instanceConfig.status)" -ForegroundColor Gray
    } else {
        Write-Host "AVISO: Nenhuma instancia ativa configurada no banco" -ForegroundColor Yellow
        Write-Host "  Crie uma instancia no painel admin" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERRO: Nao foi possivel verificar instancia ativa" -ForegroundColor Red
    Write-Host "  Erro: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# 2. VERIFICAR FILA DE NOTIFICACOES
# ============================================
Write-Host "=== 2. FILA DE NOTIFICACOES ===" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/whatsapp_notifications_queue?order=created_at.desc&limit=10&select=id,appointment_id,client_phone,target_phone,target_type,message_action,status,attempts,error_message,created_at" `
        -Method GET `
        -Headers @{
            "apikey" = $supabaseAnonKey
            "Authorization" = "Bearer $supabaseAnonKey"
        } `
        -ErrorAction Stop
    
    if ($response -and $response.Count -gt 0) {
        Write-Host "Encontradas $($response.Count) mensagens na fila:" -ForegroundColor Gray
        Write-Host ""
        
        $pending = 0
        $failed = 0
        $sent = 0
        
        foreach ($item in $response) {
            $status = $item.status
            if ($status -eq 'pending') { $pending++ }
            elseif ($status -eq 'failed') { $failed++ }
            elseif ($status -eq 'sent') { $sent++ }
            
            $statusColor = if ($status -eq 'sent') { "Green" } elseif ($status -eq 'failed') { "Red" } else { "Yellow" }
            Write-Host "  ID: $($item.id) | Status: $status | Tentativas: $($item.attempts)" -ForegroundColor $statusColor
            if ($item.error_message) {
                Write-Host "    Erro: $($item.error_message)" -ForegroundColor Red
            }
        }
        
        Write-Host ""
        Write-Host "Resumo:" -ForegroundColor Cyan
        Write-Host "  Pendentes: $pending" -ForegroundColor Yellow
        Write-Host "  Falhadas: $failed" -ForegroundColor Red
        Write-Host "  Enviadas: $sent" -ForegroundColor Green
        
        if ($pending -gt 0) {
            Write-Host ""
            Write-Host "AVISO: Ha mensagens pendentes na fila!" -ForegroundColor Yellow
            Write-Host "  Execute o processamento manual ou verifique os logs" -ForegroundColor Yellow
        }
    } else {
        Write-Host "OK Nenhuma mensagem na fila (normal se nao houve agendamentos recentes)" -ForegroundColor Green
    }
} catch {
    Write-Host "ERRO: Nao foi possivel verificar a fila" -ForegroundColor Red
    Write-Host "  Erro: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# 3. TESTAR PROCESSAMENTO DA FILA
# ============================================
Write-Host "=== 3. TESTAR PROCESSAMENTO DA FILA ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Testando processamento da fila..." -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/functions/v1/whatsapp-process-queue" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "apikey" = $supabaseAnonKey
        } `
        -Body "{}" `
        -TimeoutSec 30 `
        -ErrorAction Stop
    
    Write-Host "OK Processamento executado!" -ForegroundColor Green
    Write-Host "  Resultado: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
    
    if ($response.success) {
        if ($response.result) {
            Write-Host "  Processadas: $($response.result.processed)" -ForegroundColor Green
            if ($response.result.failed) {
                Write-Host "  Falhadas: $($response.result.failed)" -ForegroundColor Red
            }
            if ($response.result.error) {
                Write-Host "  Erro: $($response.result.error)" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "ERRO: Falha ao processar fila" -ForegroundColor Red
    Write-Host "  Erro: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "  Resposta: $responseBody" -ForegroundColor Yellow
        } catch {
            Write-Host "  Nao foi possivel ler a resposta" -ForegroundColor Yellow
        }
    }
}

Write-Host ""

# ============================================
# 4. VERIFICAR NUMEROS DE TELEFONE
# ============================================
Write-Host "=== 4. VERIFICAR NUMEROS DE TELEFONE ===" -ForegroundColor Yellow
Write-Host ""

# Clientes
Write-Host "Clientes com telefone valido:" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/profiles?phone=not.is.null&phone=neq.&phone=neq.00000000000&select=id,name,phone&limit=5" `
        -Method GET `
        -Headers @{
            "apikey" = $supabaseAnonKey
            "Authorization" = "Bearer $supabaseAnonKey"
        } `
        -ErrorAction Stop
    
    if ($response -and $response.Count -gt 0) {
        foreach ($profile in $response) {
            Write-Host "  - $($profile.name): $($profile.phone)" -ForegroundColor Gray
        }
        Write-Host "  Total: $($response.Count) clientes com telefone" -ForegroundColor Gray
    } else {
        Write-Host "  Nenhum cliente com telefone valido encontrado" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ERRO ao verificar clientes" -ForegroundColor Red
}

Write-Host ""

# Barbeiros
Write-Host "Barbeiros com WhatsApp configurado:" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/barbers?whatsapp_phone=not.is.null&whatsapp_phone=neq.&whatsapp_phone=neq.00000000000&select=id,name,whatsapp_phone&limit=5" `
        -Method GET `
        -Headers @{
            "apikey" = $supabaseAnonKey
            "Authorization" = "Bearer $supabaseAnonKey"
        } `
        -ErrorAction Stop
    
    if ($response -and $response.Count -gt 0) {
        foreach ($barber in $response) {
            Write-Host "  - $($barber.name): $($barber.whatsapp_phone)" -ForegroundColor Gray
        }
        Write-Host "  Total: $($response.Count) barbeiros com WhatsApp" -ForegroundColor Gray
    } else {
        Write-Host "  Nenhum barbeiro com WhatsApp configurado" -ForegroundColor Yellow
        Write-Host "  Configure o WhatsApp dos barbeiros no painel admin" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ERRO ao verificar barbeiros" -ForegroundColor Red
}

Write-Host ""

# ============================================
# RESUMO FINAL
# ============================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "  1. Verifique as variaveis do Supabase manualmente:" -ForegroundColor White
Write-Host "     https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Verifique os logs do Supabase Functions:" -ForegroundColor White
Write-Host "     https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Se houver mensagens pendentes, verifique o erro_message" -ForegroundColor White
Write-Host ""
Write-Host "  4. Certifique-se de que a Evolution API esta rodando" -ForegroundColor White
Write-Host ""
