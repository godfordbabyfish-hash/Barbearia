-- Criar agendamento de teste para Islan Raimundo
-- Cliente: 96991944679
-- Horário: 11 minutos a partir de agora (para testar lembrete de 10 min)

DO $$
DECLARE
  v_barber_id UUID;
  v_service_id UUID;
  v_client_id UUID;
  v_appointment_date DATE;
  v_appointment_time TIME;
  v_appointment_id UUID;
BEGIN
  -- Buscar barbeiro Islan Raimundo
  SELECT id INTO v_barber_id 
  FROM barbers 
  WHERE name ILIKE '%Islan%' 
  LIMIT 1;

  IF v_barber_id IS NULL THEN
    RAISE EXCEPTION 'Barbeiro Islan não encontrado';
  END IF;

  -- Buscar primeiro serviço disponível
  SELECT id INTO v_service_id 
  FROM services 
  WHERE visible = true 
  ORDER BY order_index 
  LIMIT 1;

  IF v_service_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum serviço disponível';
  END IF;

  -- Criar ou buscar perfil do cliente (telefone: 96991944679)
  SELECT id INTO v_client_id 
  FROM profiles 
  WHERE phone = '96991944679';

  IF v_client_id IS NULL THEN
    INSERT INTO profiles (name, phone)
    VALUES ('Cliente Teste Lembrete', '96991944679')
    RETURNING id INTO v_client_id;
  END IF;

  -- Calcular horário: 11 minutos a partir de agora (para testar lembrete de 10 min)
  v_appointment_date := CURRENT_DATE;
  v_appointment_time := (CURRENT_TIME + INTERVAL '11 minutes')::TIME;

  -- Se for muito tarde no dia, agendar para amanhã às 10:00
  IF v_appointment_time < CURRENT_TIME THEN
    v_appointment_date := CURRENT_DATE + INTERVAL '1 day';
    v_appointment_time := '10:00'::TIME;
  END IF;

  -- Criar agendamento com booking_type='online' (dispara notificações WhatsApp)
  INSERT INTO appointments (
    client_id,
    barber_id,
    service_id,
    appointment_date,
    appointment_time,
    status,
    booking_type,
    reminder_sent
  ) VALUES (
    v_client_id,
    v_barber_id,
    v_service_id,
    v_appointment_date,
    v_appointment_time,
    'confirmed',
    'online', -- IMPORTANTE: 'online' dispara notificações, 'api' não
    false -- Ainda não enviou lembrete
  )
  RETURNING id INTO v_appointment_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'AGENDAMENTO CRIADO COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ID do agendamento: %', v_appointment_id;
  RAISE NOTICE 'Cliente: 96991944679';
  RAISE NOTICE 'Barbeiro: Islan Raimundo';
  RAISE NOTICE 'Data: %', v_appointment_date;
  RAISE NOTICE 'Hora: %', v_appointment_time;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'As notificacoes serao enviadas automaticamente!';
  RAISE NOTICE 'O lembrete sera enviado em ~10 minutos';
  RAISE NOTICE '========================================';

END $$;

-- Verificar agendamento criado
SELECT 
  a.id,
  a.appointment_date,
  a.appointment_time,
  a.status,
  a.booking_type,
  a.reminder_sent,
  p.name as client_name,
  p.phone as client_phone,
  b.name as barber_name,
  b.whatsapp_phone as barber_whatsapp,
  s.title as service_title
FROM appointments a
JOIN profiles p ON p.id = a.client_id
JOIN barbers b ON b.id = a.barber_id
JOIN services s ON s.id = a.service_id
WHERE p.phone = '96991944679'
ORDER BY a.created_at DESC
LIMIT 1;

-- Verificar se notificações foram criadas na fila
SELECT 
  id,
  appointment_id,
  client_name,
  client_phone,
  target_type,
  target_phone,
  target_name,
  message_action,
  status,
  created_at
FROM whatsapp_notifications_queue
WHERE client_phone = '96991944679' OR target_phone = '96991944679'
ORDER BY created_at DESC
LIMIT 5;
