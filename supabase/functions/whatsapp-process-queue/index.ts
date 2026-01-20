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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    // Log da chamada (opcional - para debug)
    const authHeader = req.headers.get('authorization');
    const apikeyHeader = req.headers.get('apikey');
    console.log('[WhatsApp Queue] Request received', {
      hasAuth: !!authHeader,
      hasApikey: !!apikeyHeader,
      method: req.method,
      authPrefix: authHeader?.substring(0, 20),
    });

    const url = `${supabaseUrl}/functions/v1/whatsapp-notify/process-queue`;
    console.log('[WhatsApp Queue] Chamando whatsapp-notify/process-queue em', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({}), // corpo vazio, apenas para disparar o processamento
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[WhatsApp Queue] whatsapp-notify retornou erro', response.status, data);
      return new Response(
        JSON.stringify({
          success: false,
          status: response.status,
          error: data?.error || data?.message || 'Erro ao processar fila de WhatsApp',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[WhatsApp Queue] Fila processada com sucesso', data);

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

