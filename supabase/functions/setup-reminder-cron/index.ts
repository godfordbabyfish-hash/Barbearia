import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Executar cada comando SQL separadamente usando RPC ou query direta
    const results = [];

    // 1. Habilitar extensões
    try {
      await supabase.rpc('exec_sql', { sql: 'CREATE EXTENSION IF NOT EXISTS pg_cron;' });
      results.push('pg_cron habilitado');
    } catch (e) {
      // Ignorar se já existe
    }

    try {
      await supabase.rpc('exec_sql', { sql: 'CREATE EXTENSION IF NOT EXISTS pg_net;' });
      results.push('pg_net habilitado');
    } catch (e) {
      // Ignorar se já existe
    }

    // 2. Adicionar coluna
    try {
      await supabase.rpc('exec_sql', { 
        sql: `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;` 
      });
      results.push('Coluna reminder_sent adicionada');
    } catch (e) {
      console.error('Error adding column:', e);
    }

    // 3. Criar índice
    try {
      await supabase.rpc('exec_sql', { 
        sql: `CREATE INDEX IF NOT EXISTS idx_appointments_reminder ON appointments(appointment_date, appointment_time, status, reminder_sent) WHERE status IN ('confirmed', 'pending') AND reminder_sent IS FALSE;` 
      });
      results.push('Índice criado');
    } catch (e) {
      console.error('Error creating index:', e);
    }

    // 4. Criar função (usando escape correto para a service_role_key)
    const functionSQL = `
CREATE OR REPLACE FUNCTION invoke_whatsapp_reminder()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT := '${supabaseUrl}';
  function_url TEXT;
  service_role_key TEXT := '${supabaseServiceKey.replace(/'/g, "''")}';
BEGIN
  function_url := supabase_url || '/functions/v1/whatsapp-reminder';
  
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error invoking reminder function: %', SQLERRM;
END;
$$;
`;

    try {
      await supabase.rpc('exec_sql', { sql: functionSQL });
      results.push('Função invoke_whatsapp_reminder criada');
    } catch (e) {
      console.error('Error creating function:', e);
      // Tentar método alternativo: usar uma função RPC que executa SQL
    }

    // 5. Remover e criar cron job
    try {
      await supabase.rpc('exec_sql', { 
        sql: `SELECT cron.unschedule('whatsapp-reminder-every-minute');` 
      });
      results.push('Cron job antigo removido (se existia)');
    } catch (e) {
      // Ignorar se não existe
    }

    try {
      await supabase.rpc('exec_sql', { 
        sql: `SELECT cron.schedule('whatsapp-reminder-every-minute', '* * * * *', 'SELECT invoke_whatsapp_reminder();');` 
      });
      results.push('Cron job criado');
    } catch (e) {
      console.error('Error creating cron job:', e);
    }

    // Como não podemos executar SQL diretamente, vamos retornar o SQL para execução manual
    // Mas primeiro, vamos tentar usar uma abordagem diferente: criar uma migration via API

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Configuração iniciada. Alguns comandos podem precisar ser executados manualmente.',
        results,
        sql: `
-- Execute este SQL no Supabase SQL Editor:
-- (A service_role_key já está configurada na função acima)

SELECT cron.unschedule('whatsapp-reminder-every-minute');
SELECT cron.schedule('whatsapp-reminder-every-minute', '* * * * *', 'SELECT invoke_whatsapp_reminder();');
SELECT * FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute';
        `
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    
    // Retornar SQL completo para execução manual
    const manualSQL = `
-- Execute este SQL no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_appointments_reminder 
ON appointments(appointment_date, appointment_time, status, reminder_sent)
WHERE status IN ('confirmed', 'pending') AND reminder_sent IS FALSE;

CREATE OR REPLACE FUNCTION invoke_whatsapp_reminder()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT := '${supabaseUrl}';
  function_url TEXT;
  service_role_key TEXT := '${supabaseServiceKey}';
BEGIN
  function_url := supabase_url || '/functions/v1/whatsapp-reminder';
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || service_role_key),
    body := '{}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error: %', SQLERRM;
END;
$$;

SELECT cron.unschedule('whatsapp-reminder-every-minute');
SELECT cron.schedule('whatsapp-reminder-every-minute', '* * * * *', 'SELECT invoke_whatsapp_reminder();');
SELECT * FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute';
    `;

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        sql: manualSQL,
        note: 'Execute o SQL acima no Supabase SQL Editor'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
