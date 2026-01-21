# Script para criar agendamento de teste para Islan Raimundo
# Usa a Edge Function API para criar o agendamento

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "CRIANDO AGENDAMENTO TESTE - ISLAN RAIMUNDO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$supabaseUrl = "https://wabefmgfsatlusevxyfo.supabase.co"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc"

# Buscar barbeiro Islan Raimundo
Write-Host "1. Buscando barbeiro Islan Raimundo..." -ForegroundColor Yellow
$findBarberUrl = "$supabaseUrl/rest/v1/barbers?name=ilike.*Islan*&select=id,name,whatsapp_phone&limit=1"
try {
    $barberResponse = Invoke-RestMethod -Uri $findBarberUrl -Method GET -Headers @{
        "apikey" = $anonKey
        "Authorization" = "Bearer $anonKey"
        "Prefer" = "return=representation"
    }
    
    if (-not $barberResponse -or $barberResponse.Count -eq 0) {
        Write-Host "ERRO: Barbeiro Islan nao encontrado!" -ForegroundColor Red
        exit 1
    }
    
    $barber = $barberResponse[0]
    Write-Host "   Barbeiro: $($barber.name)" -ForegroundColor Green
    Write-Host "   ID: $($barber.id)" -ForegroundColor Gray
    Write-Host "   WhatsApp: $($barber.whatsapp_phone)" -ForegroundColor $(if ($barber.whatsapp_phone) { "Green" } else { "Yellow" })
    Write-Host ""
} catch {
    Write-Host "ERRO ao buscar barbeiro: $_" -ForegroundColor Red
    exit 1
}

# Buscar primeiro serviço
Write-Host "2. Buscando servico..." -ForegroundColor Yellow
$serviceUrl = "$supabaseUrl/rest/v1/services?visible=eq.true&select=id,title,duration&order=order_index&limit=1"
try {
    $serviceResponse = Invoke-RestMethod -Uri $serviceUrl -Method GET -Headers @{
        "apikey" = $anonKey
        "Authorization" = "Bearer $anonKey"
        "Prefer" = "return=representation"
    }
    
    if (-not $serviceResponse -or $serviceResponse.Count -eq 0) {
        Write-Host "ERRO: Nenhum servico disponivel!" -ForegroundColor Red
        exit 1
    }
    
    $service = $serviceResponse[0]
    Write-Host "   Servico: $($service.title)" -ForegroundColor Green
    Write-Host "   ID: $($service.id)" -ForegroundColor Gray
    Write-Host "   Duracao: $($service.duration) min" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "ERRO ao buscar servico: $_" -ForegroundColor Red
    exit 1
}

# Calcular horário de teste (2 horas a partir de agora)
$testDateTime = (Get-Date).AddHours(2)
$testDate = $testDateTime.ToString("yyyy-MM-dd")
$testTime = $testDateTime.ToString("HH:00")
$endTime = $testDateTime.AddMinutes($service.duration).ToString("HH:00")

Write-Host "3. Dados do agendamento de teste:" -ForegroundColor Yellow
Write-Host "   Cliente: Cliente Teste" -ForegroundColor White
Write-Host "   Telefone: 11999999999" -ForegroundColor White
Write-Host "   Barbeiro: $($barber.name)" -ForegroundColor White
Write-Host "   Servico: $($service.title)" -ForegroundColor White
Write-Host "   Data: $testDate" -ForegroundColor White
Write-Host "   Hora: $testTime" -ForegroundColor White
Write-Host ""

Write-Host "4. Criando agendamento via Edge Function API..." -ForegroundColor Yellow

$apiUrl = "$supabaseUrl/functions/v1/api"
$appointmentData = @{
    action = "create-appointment"
    clientName = "Cliente Teste Islan"
    phone = "11999999999"
    service = $service.title
    startTime = "$($testDateTime.ToString('yyyy-MM-ddTHH:mm:ss'))"
    endTime = "$($testDateTime.AddMinutes($service.duration).ToString('yyyy-MM-ddTHH:mm:ss'))"
} | ConvertTo-Json -Depth 3

try {
    $apiResponse = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers @{
        "Content-Type" = "application/json"
        "apikey" = $anonKey
        "Authorization" = "Bearer $anonKey"
    } -Body $appointmentData
    
    Write-Host ""
    Write-Host "RESPOSTA DA API:" -ForegroundColor Cyan
    $apiResponse | ConvertTo-Json -Depth 5 | Write-Host
    
    if ($apiResponse.appointmentId -or $apiResponse.id) {
        $appointmentId = $apiResponse.appointmentId ?? $apiResponse.id
        Write-Host ""
        Write-Host "SUCESSO! Agendamento criado!" -ForegroundColor Green
        Write-Host "   ID do agendamento: $appointmentId" -ForegroundColor White
        Write-Host ""
        
        Write-Host "5. Aguardando 2 segundos antes de processar fila..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        
        Write-Host "6. Disparando processamento da fila de WhatsApp..." -ForegroundColor Yellow
        $queueUrl = "$supabaseUrl/functions/v1/whatsapp-process-queue"
        try {
            $queueResponse = Invoke-RestMethod -Uri $queueUrl -Method POST -Headers @{
                "Content-Type" = "application/json"
                "apikey" = $anonKey
                "Authorization" = "Bearer $anonKey"
            } -Body "{}"
            
            Write-Host ""
            Write-Host "FILA PROCESSADA:" -ForegroundColor Cyan
            $queueResponse | ConvertTo-Json -Depth 5 | Write-Host
            
            Write-Host ""
            Write-Host "VERIFICAR:" -ForegroundColor Yellow
            Write-Host "1. WhatsApp do cliente (11999999999) deve receber notificacao" -ForegroundColor White
            Write-Host "2. WhatsApp do barbeiro Islan ($($barber.whatsapp_phone)) deve receber notificacao" -ForegroundColor White
            Write-Host ""
            Write-Host "Para verificar a fila:" -ForegroundColor Cyan
            Write-Host "SELECT * FROM whatsapp_notifications_queue ORDER BY created_at DESC LIMIT 5;" -ForegroundColor White
        } catch {
            Write-Host "AVISO: Erro ao processar fila (pode ser processado automaticamente): $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host ""
        Write-Host "AVISO: Agendamento pode ter sido criado, mas resposta nao contem appointmentId" -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "ERRO ao criar agendamento via API: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tente criar manualmente via interface web:" -ForegroundColor Yellow
    Write-Host "1. Acesse o sistema" -ForegroundColor White
    Write-Host "2. Faca login" -ForegroundColor White
    Write-Host "3. Vá em 'Agendar'" -ForegroundColor White
    Write-Host "4. Selecione barbeiro: $($barber.name)" -ForegroundColor White
    Write-Host "5. Complete o agendamento" -ForegroundColor White
}

Write-Host ""
Write-Host "Pronto!" -ForegroundColor Green
