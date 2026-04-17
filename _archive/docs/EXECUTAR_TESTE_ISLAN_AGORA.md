# 🧪 TESTE DE AGENDAMENTO - ISLAN RAIMUNDO

## 📋 Informações do Teste

- **Barbeiro:** Islan Raimundo
- **Cliente:** 96991944679
- **Horário:** 11 minutos a partir de agora (para testar lembrete de 10 min)
- **Tipo:** `booking_type='online'` (dispara notificações WhatsApp)

## 🚀 COMO EXECUTAR

### Opção 1: SQL Editor (Recomendado)

1. **Acesse o Supabase SQL Editor:**
   - https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new

2. **Execute o arquivo:** `executar-teste-agendamento-islan.sql`

3. **Ou cole este SQL:**

```sql
DO $$
DECLARE
  v_barber_id UUID;
  v_service_id UUID;
  v_client_id UUID;
  v_appointment_date DATE;
  v_appointment_time TIME;
  v_appointment_id UUID;
BEGIN
  SELECT id INTO v_barber_id FROM barbers WHERE name ILIKE '%Islan%' LIMIT 1;
  SELECT id INTO v_service_id FROM services WHERE visible = true ORDER BY order_index LIMIT 1;
  
  SELECT id INTO v_client_id FROM profiles WHERE phone = '96991944679';
  IF v_client_id IS NULL THEN
    INSERT INTO profiles (name, phone) VALUES ('Cliente Teste Lembrete', '96991944679') RETURNING id INTO v_client_id;
  END IF;
  
  v_appointment_date := CURRENT_DATE;
  v_appointment_time := (CURRENT_TIME + INTERVAL '11 minutes')::TIME;
  IF v_appointment_time < CURRENT_TIME THEN
    v_appointment_date := CURRENT_DATE + INTERVAL '1 day';
    v_appointment_time := '10:00'::TIME;
  END IF;
  
  INSERT INTO appointments (client_id, barber_id, service_id, appointment_date, appointment_time, status, booking_type, reminder_sent)
  VALUES (v_client_id, v_barber_id, v_service_id, v_appointment_date, v_appointment_time, 'confirmed', 'online', false)
  RETURNING id INTO v_appointment_id;
  
  RAISE NOTICE 'Agendamento criado! ID: %, Data: %, Hora: %', v_appointment_id, v_appointment_date, v_appointment_time;
END $$;

-- Verificar
SELECT a.id, a.appointment_date, a.appointment_time, p.phone, b.name, s.title
FROM appointments a
JOIN profiles p ON p.id = a.client_id
JOIN barbers b ON b.id = a.barber_id
JOIN services s ON s.id = a.service_id
WHERE p.phone = '96991944679'
ORDER BY a.created_at DESC LIMIT 1;
```

## ✅ O QUE ACONTECE APÓS CRIAR

1. ✅ **Notificações imediatas** (disparadas pelo trigger):
   - WhatsApp para cliente: 96991944679
   - WhatsApp para barbeiro: Islan Raimundo (5582982212126)

2. ✅ **Lembrete de 10 minutos** (disparado pelo cron job):
   - Enviado ~10 minutos antes do horário do agendamento
   - Enviado para: 96991944679

## 🔍 VERIFICAR

### Verificar agendamento:
```sql
SELECT a.id, a.appointment_date, a.appointment_time, a.reminder_sent, p.phone, b.name
FROM appointments a
JOIN profiles p ON p.id = a.client_id
JOIN barbers b ON b.id = a.barber_id
WHERE p.phone = '96991944679'
ORDER BY a.created_at DESC LIMIT 1;
```

### Verificar fila de notificações:
```sql
SELECT id, client_phone, target_type, target_phone, message_action, status, created_at
FROM whatsapp_notifications_queue
WHERE client_phone = '96991944679' OR target_phone = '96991944679'
ORDER BY created_at DESC LIMIT 5;
```

### Verificar execuções do cron job:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute') 
ORDER BY start_time DESC LIMIT 10;
```

---

**Pronto para testar!** Execute o SQL no Supabase SQL Editor.
