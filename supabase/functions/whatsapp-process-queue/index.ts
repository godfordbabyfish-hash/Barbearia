import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = (JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')['edge_functions_20260730'] || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const legacyInvokeKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[WhatsApp Queue] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados nas variáveis de ambiente.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const url = `${supabaseUrl}/functions/v1/whatsapp-notify/process-queue`;
    
    const requestBody = await req.json().catch(() => ({}));
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': legacyInvokeKey,
        'Authorization': `Bearer ${legacyInvokeKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json().catch((err) => {
      console.error('[WhatsApp Queue] Failed to parse processor response:', err?.name || 'UnknownError');
      return { error: 'Erro ao processar resposta' };
    });

    if (!response.ok) {
      console.error('[WhatsApp Queue] Processor returned an error:', response.status);
      return new Response(
        JSON.stringify({
          success: false,
          status: response.status,
          error: data?.error || data?.message || 'Erro ao processar fila de WhatsApp',
          details: data,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: response.status,
        result: data,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('[WhatsApp Queue] Erro ao chamar whatsapp-notify/process-queue:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Erro desconhecido ao processar fila de WhatsApp',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

