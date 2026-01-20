import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SQL migration para WhatsApp
const whatsappMigrationSQL = `
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

-- Enable RLS on queue table
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
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
    appointment_data := NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      action_type := 'cancelled';
      appointment_data := NEW;
    ELSIF NEW.appointment_date != OLD.appointment_date OR NEW.appointment_time != OLD.appointment_time THEN
      action_type := 'updated';
      appointment_data := NEW;
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'cancelled';
    appointment_data := OLD;
  ELSE
    RETURN NEW;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.booking_type = 'api' THEN
    RETURN NEW;
  END IF;

  SELECT p.phone, p.name INTO client_phone, client_name
  FROM profiles p
  WHERE p.id = appointment_data.client_id;

  IF client_phone IS NULL OR client_phone = '' OR client_phone = '00000000000' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT s.title INTO service_title FROM services s WHERE s.id = appointment_data.service_id;
  SELECT b.name INTO barber_name FROM barbers b WHERE b.id = appointment_data.barber_id;

  INSERT INTO whatsapp_notifications_queue (
    appointment_id, client_phone, client_name, message_action, payload
  ) VALUES (
    appointment_data.id, client_phone, client_name, action_type,
    jsonb_build_object(
      'appointmentId', appointment_data.id::text,
      'clientName', client_name, 'phone', client_phone, 'action', action_type,
      'appointmentDate', appointment_data.appointment_date::text,
      'appointmentTime', appointment_data.appointment_time,
      'serviceName', service_title, 'barberName', barber_name
    )
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error queueing WhatsApp notification: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_queue_whatsapp_on_appointment_created ON appointments;
CREATE TRIGGER trigger_queue_whatsapp_on_appointment_created
AFTER INSERT ON appointments
FOR EACH ROW
WHEN (
  NEW.status IN ('confirmed', 'pending') 
  AND NEW.booking_type != 'api'
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = NEW.client_id AND p.phone IS NOT NULL AND p.phone != '' AND p.phone != '00000000000')
)
EXECUTE FUNCTION queue_whatsapp_notification();

DROP TRIGGER IF EXISTS trigger_queue_whatsapp_on_appointment_updated ON appointments;
CREATE TRIGGER trigger_queue_whatsapp_on_appointment_updated
AFTER UPDATE ON appointments
FOR EACH ROW
WHEN (
  NEW.booking_type != 'api'
  AND ((NEW.status = 'cancelled' AND OLD.status != 'cancelled') OR (NEW.appointment_date != OLD.appointment_date OR NEW.appointment_time != OLD.appointment_time))
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = NEW.client_id AND p.phone IS NOT NULL AND p.phone != '' AND p.phone != '00000000000')
)
EXECUTE FUNCTION queue_whatsapp_notification();
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Executar SQL usando rpc ou query direto
    // Como o Supabase não permite SQL direto via REST, vamos usar o método de execução via Postgres
    
    // Dividir em comandos individuais e executar via supabase.rpc ou .from
    // Mas a melhor forma é realmente usar SQL direto via connection
    
    // Alternativa: usar pg_net se disponível
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: whatsappMigrationSQL 
    });

    if (error) {
      // Se não houver função exec_sql, retornar instruções
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Função exec_sql não disponível. Por favor, aplique via Dashboard SQL Editor.',
          instructions: {
            url: 'https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new',
            sql_file: 'APLICAR_MIGRATION_DIRETO.sql'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Migration aplicada com sucesso!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        note: 'Aplique via Dashboard SQL Editor usando o arquivo APLICAR_MIGRATION_DIRETO.sql'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
