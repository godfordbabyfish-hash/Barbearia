-- Update WhatsApp notification system to use 'whatsapp' field instead of 'phone'
-- This migration updates the trigger and ensures compatibility with CPF-based authentication

-- 1) Update queue_whatsapp_notification function to use 'whatsapp' field for clients
CREATE OR REPLACE FUNCTION queue_whatsapp_notification()
RETURNS TRIGGER AS $$
DECLARE
  client_whatsapp TEXT;
  client_phone TEXT; -- Keep for backward compatibility
  client_name TEXT;
  service_title TEXT;
  barber_name TEXT;
  barber_whatsapp TEXT;
  action_type TEXT;
  appointment_data RECORD;
  formatted_client_whatsapp TEXT;
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

  -- Get client information - prioritize 'whatsapp' field, fallback to 'phone' for backward compatibility
  SELECT 
    COALESCE(p.whatsapp, p.phone) as whatsapp_field,
    p.phone,
    p.name 
  INTO client_whatsapp, client_phone, client_name
  FROM public.profiles p
  WHERE p.id = appointment_data.client_id;

  -- Format WhatsApp number: if it's 10 digits (DDD + 8 digits), add country code 55
  formatted_client_whatsapp := NULL;
  IF client_whatsapp IS NOT NULL AND client_whatsapp <> '' AND client_whatsapp <> '00000000000' THEN
    -- Remove any non-numeric characters
    formatted_client_whatsapp := REGEXP_REPLACE(client_whatsapp, '[^0-9]', '', 'g');
    
    -- If it already starts with 55, use as is
    IF formatted_client_whatsapp LIKE '55%' THEN
      -- Already has country code, use as is (but ensure it's at least 12 digits: 55 + DDD + number)
      IF LENGTH(formatted_client_whatsapp) >= 12 THEN
        -- Valid, use as is
        NULL; -- formatted_client_whatsapp já está correto
      ELSE
        -- Invalid length even with 55, set to NULL
        formatted_client_whatsapp := NULL;
      END IF;
    -- If it's 10 digits (DDD + 8 digits without 9), add country code 55
    ELSIF LENGTH(formatted_client_whatsapp) = 10 THEN
      formatted_client_whatsapp := '55' || formatted_client_whatsapp;
    -- If it's 11 digits (DDD + 9 + 8 digits), add country code 55
    ELSIF LENGTH(formatted_client_whatsapp) = 11 THEN
      formatted_client_whatsapp := '55' || formatted_client_whatsapp;
    -- Invalid length, set to NULL
    ELSE
      formatted_client_whatsapp := NULL;
    END IF;
  END IF;

  -- Get service information
  SELECT s.title INTO service_title 
  FROM public.services s 
  WHERE s.id = appointment_data.service_id;

  -- Get barber information (name + whatsapp)
  SELECT b.name, b.whatsapp_phone INTO barber_name, barber_whatsapp
  FROM public.barbers b 
  WHERE b.id = appointment_data.barber_id;

  -- 3.1) Enqueue notification for client (if has whatsapp/phone)
  IF formatted_client_whatsapp IS NOT NULL AND formatted_client_whatsapp <> '' AND formatted_client_whatsapp <> '00000000000' THEN
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
      formatted_client_whatsapp, -- Store formatted number in client_phone field
      client_name,
      action_type,
      jsonb_build_object(
        'appointmentId', appointment_data.id::text,
        'clientName', client_name,
        'phone', formatted_client_whatsapp,
        'action', action_type,
        'appointmentDate', appointment_data.appointment_date::text,
        'appointmentTime', appointment_data.appointment_time,
        'serviceName', service_title,
        'barberName', barber_name,
        'targetType', 'client'
      ),
      'client',
      formatted_client_whatsapp,
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
      formatted_client_whatsapp, -- Store client whatsapp for reference
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
