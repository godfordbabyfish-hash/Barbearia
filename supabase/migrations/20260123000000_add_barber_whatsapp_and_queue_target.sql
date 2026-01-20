-- Add WhatsApp phone field to barbers and extend WhatsApp queue

-- 1) Add whatsapp_phone to barbers
ALTER TABLE public.barbers
ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

COMMENT ON COLUMN public.barbers.whatsapp_phone IS 'WhatsApp pessoal do barbeiro para receber notificações de novos agendamentos.';

-- 2) Extend whatsapp_notifications_queue to support different targets
ALTER TABLE public.whatsapp_notifications_queue
ADD COLUMN IF NOT EXISTS target_type TEXT 
  CHECK (target_type IN ('client', 'barber')) 
  DEFAULT 'client';

ALTER TABLE public.whatsapp_notifications_queue
ADD COLUMN IF NOT EXISTS target_phone TEXT;

ALTER TABLE public.whatsapp_notifications_queue
ADD COLUMN IF NOT EXISTS target_name TEXT;

-- Ensure existing rows are marked as client for clarity
UPDATE public.whatsapp_notifications_queue
SET target_type = 'client'
WHERE target_type IS NULL;

-- 3) Update queue_whatsapp_notification function to enqueue notifications for client and barber
CREATE OR REPLACE FUNCTION queue_whatsapp_notification()
RETURNS TRIGGER AS $$
DECLARE
  client_phone TEXT;
  client_name TEXT;
  service_title TEXT;
  barber_name TEXT;
  barber_whatsapp TEXT;
  action_type TEXT;
  appointment_data RECORD;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
    appointment_data := NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only notify if status changed to cancelled
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      action_type := 'cancelled';
      appointment_data := NEW;
    -- Or if date/time changed (remarcação)
    ELSIF NEW.appointment_date != OLD.appointment_date OR NEW.appointment_time != OLD.appointment_time THEN
      action_type := 'updated';
      appointment_data := NEW;
    ELSE
      -- No significant change, don't notify
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'cancelled';
    appointment_data := OLD;
  ELSE
    RETURN NEW;
  END IF;

  -- Skip if booking_type is 'api' (internal appointments)
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.booking_type = 'api' THEN
    RETURN NEW;
  END IF;

  -- Get client information
  SELECT p.phone, p.name INTO client_phone, client_name
  FROM public.profiles p
  WHERE p.id = appointment_data.client_id;

  -- Get service information
  SELECT s.title INTO service_title 
  FROM public.services s 
  WHERE s.id = appointment_data.service_id;

  -- Get barber information (name + whatsapp)
  SELECT b.name, b.whatsapp_phone INTO barber_name, barber_whatsapp
  FROM public.barbers b 
  WHERE b.id = appointment_data.barber_id;

  -- 3.1) Enqueue notification for client (if has phone)
  IF client_phone IS NOT NULL AND client_phone <> '' AND client_phone <> '00000000000' THEN
    INSERT INTO public.whatsapp_notifications_queue (
      appointment_id,
      client_phone,
      client_name,
      message_action,
      payload,
      target_type,
      target_phone,
      target_name
    ) VALUES (
      appointment_data.id,
      client_phone,
      client_name,
      action_type,
      jsonb_build_object(
        'appointmentId', appointment_data.id::text,
        'clientName', client_name,
        'phone', client_phone,
        'action', action_type,
        'appointmentDate', appointment_data.appointment_date::text,
        'appointmentTime', appointment_data.appointment_time,
        'serviceName', service_title,
        'barberName', barber_name,
        'targetType', 'client'
      ),
      'client',
      client_phone,
      client_name
    );
  END IF;

  -- 3.2) Enqueue notification for barber (if has WhatsApp configured)
  IF barber_whatsapp IS NOT NULL AND barber_whatsapp <> '' AND barber_whatsapp <> '00000000000' THEN
    INSERT INTO public.whatsapp_notifications_queue (
      appointment_id,
      client_phone,
      client_name,
      message_action,
      payload,
      target_type,
      target_phone,
      target_name
    ) VALUES (
      appointment_data.id,
      client_phone,
      client_name,
      action_type,
      jsonb_build_object(
        'appointmentId', appointment_data.id::text,
        'clientName', client_name,
        'phone', barber_whatsapp,
        'action', action_type,
        'appointmentDate', appointment_data.appointment_date::text,
        'appointmentTime', appointment_data.appointment_time,
        'serviceName', service_title,
        'barberName', barber_name,
        'targetType', 'barber'
      ),
      'barber',
      barber_whatsapp,
      barber_name
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block the transaction
    RAISE WARNING 'Error queueing WhatsApp notification: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

