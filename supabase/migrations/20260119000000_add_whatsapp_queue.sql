-- Create WhatsApp notifications queue table
CREATE TABLE IF NOT EXISTS whatsapp_notifications_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  client_phone TEXT NOT NULL,
  client_name TEXT NOT NULL,
  message_action TEXT NOT NULL CHECK (message_action IN ('created', 'updated', 'cancelled')),
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queue processing
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON whatsapp_notifications_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_appointment ON whatsapp_notifications_queue(appointment_id);

-- Enable RLS on queue table (optional - depends on your security needs)
ALTER TABLE whatsapp_notifications_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role to read/write queue (for Edge Functions)
DROP POLICY IF EXISTS "Service role can manage queue" ON whatsapp_notifications_queue;
CREATE POLICY "Service role can manage queue" ON whatsapp_notifications_queue
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Function to queue WhatsApp notification
CREATE OR REPLACE FUNCTION queue_whatsapp_notification()
RETURNS TRIGGER AS $$
DECLARE
  client_phone TEXT;
  client_name TEXT;
  service_title TEXT;
  barber_name TEXT;
  action_type TEXT;
  appointment_data RECORD;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
    appointment_data := NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only notify if status changed to cancelled (explicitly check this first)
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      action_type := 'cancelled';
      appointment_data := NEW;
      -- Log para debug
      RAISE NOTICE 'WhatsApp notification queued for cancelled appointment: %', NEW.id;
    -- Or if date/time changed (remarcação) - but NOT if status is cancelled
    ELSIF NEW.status != 'cancelled' AND (NEW.appointment_date != OLD.appointment_date OR NEW.appointment_time != OLD.appointment_time) THEN
      action_type := 'updated';
      appointment_data := NEW;
      -- Log para debug
      RAISE NOTICE 'WhatsApp notification queued for updated appointment: %', NEW.id;
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
  FROM profiles p
  WHERE p.id = appointment_data.client_id;

  -- Skip if no phone number
  IF client_phone IS NULL OR client_phone = '' OR client_phone = '00000000000' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get service information
  SELECT s.title INTO service_title 
  FROM services s 
  WHERE s.id = appointment_data.service_id;

  -- Get barber information
  SELECT b.name INTO barber_name 
  FROM barbers b 
  WHERE b.id = appointment_data.barber_id;

  -- Insert into queue
  INSERT INTO whatsapp_notifications_queue (
    appointment_id,
    client_phone,
    client_name,
    message_action,
    payload
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
      'barberName', barber_name
    )
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block the transaction
    RAISE WARNING 'Error queueing WhatsApp notification: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT (appointment created)
-- Note: We can't use EXISTS in WHEN clause, so we check inside the function
DROP TRIGGER IF EXISTS trigger_queue_whatsapp_on_appointment_created ON appointments;
CREATE TRIGGER trigger_queue_whatsapp_on_appointment_created
AFTER INSERT ON appointments
FOR EACH ROW
WHEN (
  NEW.status IN ('confirmed', 'pending') 
  AND NEW.booking_type != 'api'
)
EXECUTE FUNCTION queue_whatsapp_notification();

-- Create trigger for UPDATE (appointment updated/cancelled)
-- Note: We can't use EXISTS in WHEN clause, so we check inside the function
DROP TRIGGER IF EXISTS trigger_queue_whatsapp_on_appointment_updated ON appointments;
CREATE TRIGGER trigger_queue_whatsapp_on_appointment_updated
AFTER UPDATE ON appointments
FOR EACH ROW
WHEN (
  NEW.booking_type != 'api'
  AND (
    -- Status changed to cancelled
    (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
    OR
    -- Date or time changed (remarcação)
    (NEW.appointment_date != OLD.appointment_date OR NEW.appointment_time != OLD.appointment_time)
  )
)
EXECUTE FUNCTION queue_whatsapp_notification();
