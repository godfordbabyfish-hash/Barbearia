# Script para criar agendamento de teste para Islan com cliente 96991944679
# Horário: 11 minutos a partir de agora (para testar lembrete de 10 min)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "CRIAR AGENDAMENTO TESTE - LEMBRETE" -ForegroundColor Cyan
Write-Host "Barbeiro: Islan Raimundo" -ForegroundColor Cyan
Write-Host "Cliente: 96991944679" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "Execute o SQL abaixo no Supabase SQL Editor para criar o agendamento:" -ForegroundColor White
Write-Host ""
Write-Host "Arquivo: criar-agendamento-teste-islan.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ou execute diretamente o SQL abaixo:" -ForegroundColor Yellow
Write-Host ""

$sql = @"
-- Criar agendamento de teste para testar lembrete
DO `$`$`$
DECLARE
  v_barber_id UUID;
  v_service_id UUID;
  v_client_id UUID;
  v_appointment_date DATE;
  v_appointment_time TIME;
  v_appointment_id UUID;
BEGIN
  -- Buscar barbeiro Islan
  SELECT id INTO v_barber_id FROM barbers WHERE name ILIKE '%Islan%' LIMIT 1;
  
  -- Buscar primeiro serviço
  SELECT id INTO v_service_id FROM services WHERE visible = true ORDER BY order_index LIMIT 1;
  
  -- Criar ou buscar perfil
  SELECT id INTO v_client_id FROM profiles WHERE phone = '96991944679';
  IF v_client_id IS NULL THEN
    INSERT INTO profiles (name, phone) VALUES ('Cliente Teste Lembrete', '96991944679') RETURNING id INTO v_client_id;
  END IF;
  
  -- Horário: 11 minutos a partir de agora
  v_appointment_date := CURRENT_DATE;
  v_appointment_time := (CURRENT_TIME + INTERVAL '11 minutes')::TIME;
  IF v_appointment_time < CURRENT_TIME THEN
    v_appointment_date := CURRENT_DATE + INTERVAL '1 day';
    v_appointment_time := '10:00'::TIME;
  END IF;
  
  -- Criar agendamento (booking_type='online' para disparar notificações)
  INSERT INTO appointments (client_id, barber_id, service_id, appointment_date, appointment_time, status, booking_type, reminder_sent)
  VALUES (v_client_id, v_barber_id, v_service_id, v_appointment_date, v_appointment_time, 'confirmed', 'online', false)
  RETURNING id INTO v_appointment_id;
  
  RAISE NOTICE 'Agendamento criado! ID: %, Data: %, Hora: %', v_appointment_id, v_appointment_date, v_appointment_time;
END `$`$`$;

-- Verificar agendamento criado
SELECT a.id, a.appointment_date, a.appointment_time, p.phone, b.name as barber, s.title as service
FROM appointments a
JOIN profiles p ON p.id = a.client_id
JOIN barbers b ON b.id = a.barber_id
JOIN services s ON s.id = a.service_id
WHERE p.phone = '96991944679'
ORDER BY a.created_at DESC LIMIT 1;

-- Verificar fila de notificações
SELECT id, client_phone, target_type, target_phone, message_action, status, created_at
FROM whatsapp_notifications_queue
WHERE client_phone = '96991944679' OR target_phone = '96991944679'
ORDER BY created_at DESC LIMIT 5;
"@

Write-Host $sql -ForegroundColor White
Write-Host ""

$abrirArquivo = Read-Host "Deseja abrir o arquivo SQL para copiar? (S/N) [S]"
if ($abrirArquivo -ne 'N' -and $abrirArquivo -ne 'n') {
    notepad "criar-agendamento-teste-islan.sql"
}

Write-Host ""
Write-Host "Apos criar o agendamento:" -ForegroundColor Yellow
Write-Host "1. As notificacoes serao enviadas automaticamente (cliente + barbeiro)" -ForegroundColor White
Write-Host "2. O lembrete sera enviado em ~10 minutos" -ForegroundColor White
Write-Host "3. Verifique os logs do cron job para confirmar" -ForegroundColor White
Write-Host ""
Write-Host "Pronto!" -ForegroundColor Green
