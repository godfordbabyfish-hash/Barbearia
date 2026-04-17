# Script completo para diagnosticar problemas com WhatsApp
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DIAGNOSTICO COMPLETO WHATSAPP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allOk = $true

# ============================================
# 1. VERIFICAR VARIAVEIS DO SUPABASE
# ============================================
Write-Host "=== 1. VARIAVEIS DO SUPABASE ===" -ForegroundColor Yellow
Write-Host ""

$requiredVars = @(
    @{ Name = "EVOLUTION_API_URL"; Expected = "https://evolution-api-barbearia.fly.dev" },
    @{ Name = "EVOLUTION_API_KEY"; Expected = "testdaapi2026" },
    @{ Name = "EVOLUTION_INSTANCE_NAME"; Expected = "evolution-4" }
)

Write-Host "Verificando variaveis configuradas no Supabase..." -ForegroundColor Gray
Write-Host ""

try {
    $secrets = npx supabase secrets list 2>&1
    if ($LASTEXITCODE -eq 0) {
        foreach ($var in $requiredVars) {
            $found = $secrets -match $var.Name
            if ($found) {
                $value = ($secrets | Select-String -Pattern "$($var.Name)=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
                Write-Host "OK $($var.Name) configurado" -ForegroundColor Green
                Write-Host "   Valor: $value" -ForegroundColor Gray
                
                if ($value -ne $var.Expected) {
                    Write-Host "   AVISO: Valor diferente do esperado!" -ForegroundColor Yellow
                    Write-Host "   Esperado: $($var.Expected)" -ForegroundColor Gray
                }
            } else {
                Write-Host "ERRO: $($var.Name) NAO configurado" -ForegroundColor Red
                Write-Host "   Configure com: npx supabase secrets set $($var.Name)=$($var.Expected)" -ForegroundColor Yellow
                $allOk = $false
            }
        }
    } else {
        Write-Host "AVISO: Nao foi possivel listar secrets via CLI" -ForegroundColor Yellow
        Write-Host "  Verifique manualmente em:" -ForegroundColor Gray
        Write-Host "  https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets" -ForegroundColor Cyan
    }
} catch {
    Write-Host "AVISO: Supabase CLI nao disponivel" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# 2. VERIFICAR EVOLUTION API
# ============================================
Write-Host "=== 2. EVOLUTION API (Fly.io) ===" -ForegroundColor Yellow
Write-Host ""

$apiUrl = "https://evolution-api-barbearia.fly.dev"
Write-Host "Testando: $apiUrl" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
    Write-Host "OK API esta respondendo! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "ERRO: API nao esta respondendo" -ForegroundColor Red
    Write-Host "  Erro: $($_.Exception.Message)" -ForegroundColor Yellow
    $allOk = $false
}

Write-Host ""

# Testar endpoint de instancias
Write-Host "Testando endpoint de instancias..." -ForegroundColor Gray
try {
    $apiKey = "testdaapi2026"
    $headers = @{ "apikey" = $apiKey }
    $instancesResponse = Invoke-RestMethod -Uri "$apiUrl/instance/fetchInstances" `
        -Method GET `
        -Headers $headers `
        -TimeoutSec 10 `
        -ErrorAction Stop
    
    Write-Host "OK Endpoint funcionando" -ForegroundColor Green
    if ($instancesResponse -is [Array]) {
        Write-Host "  Instancias encontradas: $($instancesResponse.Count)" -ForegroundColor Gray
        if ($instancesResponse.Count -gt 0) {
            foreach ($instance in $instancesResponse) {
                Write-Host "    - $($instance.instanceName): $($instance.status)" -ForegroundColor Gray
            }
        } else {
            Write-Host "  AVISO: Nenhuma instancia encontrada!" -ForegroundColor Yellow
            Write-Host "  Crie uma instancia no painel admin" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "ERRO: Nao foi possivel listar instancias" -ForegroundColor Red
    Write-Host "  Erro: $($_.Exception.Message)" -ForegroundColor Yellow
    $allOk = $false
}

Write-Host ""

# ============================================
# 3. VERIFICAR INSTANCIA ATIVA NO BANCO
# ============================================
Write-Host "=== 3. INSTANCIA ATIVA NO BANCO ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Para verificar a instancia ativa no banco, execute no Supabase SQL Editor:" -ForegroundColor Gray
Write-Host ""
Write-Host "SELECT config_value FROM site_config WHERE config_key = 'whatsapp_active_instance';" -ForegroundColor Cyan
Write-Host ""

# ============================================
# 4. VERIFICAR FILA DE NOTIFICACOES
# ============================================
Write-Host "=== 4. FILA DE NOTIFICACOES ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Para verificar a fila, execute no Supabase SQL Editor:" -ForegroundColor Gray
Write-Host ""
Write-Host "SELECT " -ForegroundColor Cyan
Write-Host "  id," -ForegroundColor Cyan
Write-Host "  appointment_id," -ForegroundColor Cyan
Write-Host "  client_phone," -ForegroundColor Cyan
Write-Host "  target_phone," -ForegroundColor Cyan
Write-Host "  target_type," -ForegroundColor Cyan
Write-Host "  message_action," -ForegroundColor Cyan
Write-Host "  status," -ForegroundColor Cyan
Write-Host "  attempts," -ForegroundColor Cyan
Write-Host "  error_message," -ForegroundColor Cyan
Write-Host "  created_at" -ForegroundColor Cyan
Write-Host "FROM whatsapp_notifications_queue" -ForegroundColor Cyan
Write-Host "ORDER BY created_at DESC" -ForegroundColor Cyan
Write-Host "LIMIT 10;" -ForegroundColor Cyan
Write-Host ""

Write-Host "Verifique:" -ForegroundColor Yellow
Write-Host "  - Se ha mensagens com status='pending' -> Fila nao esta sendo processada" -ForegroundColor Gray
Write-Host "  - Se ha mensagens com status='failed' -> Verifique error_message" -ForegroundColor Gray
Write-Host "  - Se ha mensagens com status='sent' -> Esta funcionando!" -ForegroundColor Green
Write-Host ""

# ============================================
# 5. TESTAR PROCESSAMENTO DA FILA
# ============================================
Write-Host "=== 5. TESTAR PROCESSAMENTO DA FILA ===" -ForegroundColor Yellow
Write-Host ""

$supabaseUrl = "https://wabefmgfsatlusevxyfo.supabase.co"
$supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc"

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
    
    Write-Host "OK Processamento da fila executado" -ForegroundColor Green
    Write-Host "  Resultado: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
} catch {
    Write-Host "ERRO: Falha ao processar fila" -ForegroundColor Red
    Write-Host "  Erro: $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Resposta: $responseBody" -ForegroundColor Yellow
    }
    $allOk = $false
}

Write-Host ""

# ============================================
# 6. VERIFICAR LOGS DO SUPABASE
# ============================================
Write-Host "=== 6. LOGS DO SUPABASE ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Para verificar os logs:" -ForegroundColor Gray
Write-Host "  1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions" -ForegroundColor Cyan
Write-Host "  2. Clique em 'whatsapp-notify' -> 'Logs'" -ForegroundColor Cyan
Write-Host "  3. Procure por:" -ForegroundColor Gray
Write-Host "     - [Queue] Iniciando processamento..." -ForegroundColor Gray
Write-Host "     - [Queue] Encontradas X mensagens pendentes" -ForegroundColor Gray
Write-Host "     - [WhatsApp] Attempting to send message..." -ForegroundColor Gray
Write-Host "     - [WhatsApp] Message sent successfully" -ForegroundColor Green
Write-Host "     - [WhatsApp] Evolution API error" -ForegroundColor Red
Write-Host ""

# ============================================
# RESUMO FINAL
# ============================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO DO DIAGNOSTICO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($allOk) {
    Write-Host "OK Todas as verificacoes basicas passaram!" -ForegroundColor Green
    Write-Host ""
    Write-Host "PROXIMOS PASSOS:" -ForegroundColor Cyan
    Write-Host "  1. Verifique a fila de notificacoes no banco de dados" -ForegroundColor White
    Write-Host "  2. Verifique os logs do Supabase Functions" -ForegroundColor White
    Write-Host "  3. Crie um agendamento de teste" -ForegroundColor White
    Write-Host "  4. Verifique se a mensagem chegou no WhatsApp" -ForegroundColor White
} else {
    Write-Host "ATENCAO: Algumas verificacoes falharam!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Revise os erros acima e corrija antes de continuar." -ForegroundColor White
    Write-Host ""
    Write-Host "CORRECOES COMUNS:" -ForegroundColor Yellow
    Write-Host "  1. Configure as variaveis do Supabase:" -ForegroundColor White
    Write-Host "     npx supabase secrets set EVOLUTION_API_URL=https://evolution-api-barbearia.fly.dev" -ForegroundColor Cyan
    Write-Host "     npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026" -ForegroundColor Cyan
    Write-Host "     npx supabase secrets set EVOLUTION_INSTANCE_NAME=evolution-4" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  2. Verifique se a Evolution API esta rodando:" -ForegroundColor White
    Write-Host "     fly status --app evolution-api-barbearia" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  3. Crie uma instancia WhatsApp no painel admin" -ForegroundColor White
}

Write-Host ""
