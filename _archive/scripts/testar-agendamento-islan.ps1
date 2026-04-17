# Script para testar agendamento para o barbeiro Islan
# Cria um agendamento de teste e verifica se as notificações são enviadas

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TESTE DE AGENDAMENTO - BARBEIRO ISLAN" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$supabaseUrl = "https://wabefmgfsatlusevxyfo.supabase.co"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc"

Write-Host "1. Buscando barbeiro Islan..." -ForegroundColor Yellow

# Buscar barbeiro Islan
$findBarberUrl = "$supabaseUrl/rest/v1/barbers?name=ilike.Islan&select=id,name,whatsapp_phone&limit=1"
$barberResponse = Invoke-RestMethod -Uri $findBarberUrl -Method GET -Headers @{
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
} -ErrorAction Stop

if (-not $barberResponse -or $barberResponse.Count -eq 0) {
    Write-Host "ERRO: Barbeiro Islan nao encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Barbeiros disponiveis:" -ForegroundColor Yellow
    $allBarbersUrl = "$supabaseUrl/rest/v1/barbers?select=id,name,whatsapp_phone&visible=eq.true"
    $allBarbers = Invoke-RestMethod -Uri $allBarbersUrl -Method GET -Headers @{
        "apikey" = $anonKey
        "Authorization" = "Bearer $anonKey"
    }
    $allBarbers | ForEach-Object { Write-Host "  - $($_.name) (WhatsApp: $($_.whatsapp_phone))" -ForegroundColor White }
    exit 1
}

$barber = $barberResponse[0]
Write-Host "   Barbeiro encontrado: $($barber.name)" -ForegroundColor Green
Write-Host "   ID: $($barber.id)" -ForegroundColor Gray
Write-Host "   WhatsApp: $($barber.whatsapp_phone)" -ForegroundColor $(if ($barber.whatsapp_phone) { "Green" } else { "Yellow" })
Write-Host ""

# Buscar primeiro serviço disponível
Write-Host "2. Buscando servico disponivel..." -ForegroundColor Yellow
$serviceUrl = "$supabaseUrl/rest/v1/services?visible=eq.true&select=id,title&order=order_index&limit=1"
$serviceResponse = Invoke-RestMethod -Uri $serviceUrl -Method GET -Headers @{
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
}

if (-not $serviceResponse -or $serviceResponse.Count -eq 0) {
    Write-Host "ERRO: Nenhum servico disponivel!" -ForegroundColor Red
    exit 1
}

$service = $serviceResponse[0]
Write-Host "   Servico: $($service.title)" -ForegroundColor Green
Write-Host "   ID: $($service.id)" -ForegroundColor Gray
Write-Host ""

# Criar um horário de teste (próxima hora disponível)
$testDate = (Get-Date).AddHours(2).ToString("yyyy-MM-dd")
$testTime = (Get-Date).AddHours(2).ToString("HH:00")

Write-Host "3. Criando agendamento de teste..." -ForegroundColor Yellow
Write-Host "   Data: $testDate" -ForegroundColor Gray
Write-Host "   Hora: $testTime" -ForegroundColor Gray
Write-Host ""

# Criar perfil de teste (cliente)
Write-Host "4. Criando perfil de cliente de teste..." -ForegroundColor Yellow
$testClientName = "Cliente Teste"
$testClientPhone = "11999999999" # Telefone de teste

# Nota: Para criar agendamento via API, precisamos de um usuário autenticado
# Vamos usar a Edge Function 'api' que tem as permissões necessárias

Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "Para criar o agendamento via script, voce precisa:" -ForegroundColor White
Write-Host "1. Fazer login no sistema (via navegador)" -ForegroundColor White
Write-Host "2. Criar um agendamento manualmente para Islan" -ForegroundColor White
Write-Host "3. Ou usar a API com autenticacao" -ForegroundColor White
Write-Host ""

$createViaAPI = Read-Host "Deseja tentar criar via Edge Function API? (S/N) [N]"

if ($createViaAPI -eq 'S' -or $createViaAPI -eq 's') {
    # Tentar criar via API Edge Function
    $apiUrl = "$supabaseUrl/functions/v1/api"
    
    $appointmentData = @{
        action = "create-appointment"
        clientName = $testClientName
        phone = $testClientPhone
        service = $service.title
        startTime = "$testDate $testTime:00"
        endTime = "$testDate $(Get-Date).AddHours(3).ToString('HH:00'):00"
    } | ConvertTo-Json

    Write-Host "5. Enviando para Edge Function..." -ForegroundColor Yellow
    try {
        $apiResponse = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers @{
            "Content-Type" = "application/json"
            "apikey" = $anonKey
            "Authorization" = "Bearer $anonKey"
        } -Body $appointmentData

        Write-Host "   Resposta: $($apiResponse | ConvertTo-Json -Depth 3)" -ForegroundColor Green
        
        if ($apiResponse.appointmentId) {
            Write-Host ""
            Write-Host "6. Disparando processamento da fila de WhatsApp..." -ForegroundColor Yellow
            $queueUrl = "$supabaseUrl/functions/v1/whatsapp-process-queue"
            $queueResponse = Invoke-RestMethod -Uri $queueUrl -Method POST -Headers @{
                "Content-Type" = "application/json"
                "apikey" = $anonKey
                "Authorization" = "Bearer $anonKey"
            }

            Write-Host "   Fila processada!" -ForegroundColor Green
            Write-Host "   Resultado: $($queueResponse | ConvertTo-Json -Depth 3)" -ForegroundColor White
        }
    } catch {
        Write-Host "   ERRO ao criar via API: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "OPCAO ALTERNATIVA:" -ForegroundColor Yellow
        Write-Host "1. Acesse o sistema via navegador" -ForegroundColor White
        Write-Host "2. Faca login" -ForegroundColor White
        Write-Host "3. Vá em 'Agendar' e selecione o barbeiro Islan" -ForegroundColor White
        Write-Host "4. Complete o agendamento" -ForegroundColor White
        Write-Host "5. As notificacoes serao enviadas automaticamente" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "Para testar o agendamento:" -ForegroundColor Cyan
    Write-Host "1. Acesse: http://localhost:8080 (ou sua URL de produção)" -ForegroundColor White
    Write-Host "2. Faca login como cliente" -ForegroundColor White
    Write-Host "3. Vá em 'Agendar'" -ForegroundColor White
    Write-Host "4. Selecione o barbeiro Islan" -ForegroundColor White
    Write-Host "5. Selecione um servico" -ForegroundColor White
    Write-Host "6. Escolha data e horario" -ForegroundColor White
    Write-Host "7. Confirme o agendamento" -ForegroundColor White
    Write-Host ""
    Write-Host "As notificacoes serao enviadas automaticamente via:" -ForegroundColor Yellow
    Write-Host "  - Trigger do banco (insere na fila)" -ForegroundColor White
    Write-Host "  - whatsapp-process-queue (processa a fila)" -ForegroundColor White
    Write-Host "  - whatsapp-notify (envia via Evolution API)" -ForegroundColor White
}

Write-Host ""
Write-Host "Verificar fila de notificacoes:" -ForegroundColor Cyan
Write-Host "SELECT * FROM whatsapp_notifications_queue ORDER BY created_at DESC LIMIT 5;" -ForegroundColor White
Write-Host ""
Write-Host "Pronto!" -ForegroundColor Green
