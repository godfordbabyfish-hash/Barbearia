import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const allowedModels = new Set(['gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.6']);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const getServiceKey = () => {
  const keyMap = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
  return keyMap.edge_functions_20260730 || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
};

const extractOutputText = (payload: any): string => {
  if (typeof payload?.output_text === 'string') return payload.output_text.trim();
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content?.text === 'string') {
        return content.text.trim();
      }
    }
  }
  return '';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, error: 'method_not_allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceKey = getServiceKey();
    const authorization = req.headers.get('Authorization') || '';

    if (!supabaseUrl || !anonKey || !serviceKey || !authorization.startsWith('Bearer ')) {
      return json({ success: false, error: 'unauthorized' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ success: false, error: 'unauthorized' }, 401);

    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: roleData } = await service
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .in('role', ['admin', 'gestor']);
    if (!roleData?.length) return json({ success: false, error: 'forbidden' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || 'get');

    if (action === 'get') {
      const [{ data: row, error: configError }, { data: hasKey, error: keyError }] = await Promise.all([
        service.from('site_config').select('config_value').eq('config_key', 'whatsapp_ai_attendant').maybeSingle(),
        service.rpc('has_whatsapp_ai_api_key'),
      ]);
      if (configError || keyError) throw configError || keyError;
      return json({ success: true, config: row?.config_value || {}, has_api_key: Boolean(hasKey) });
    }

    if (action === 'save') {
      const incoming = body?.config || {};
      const model = allowedModels.has(String(incoming.model)) ? String(incoming.model) : 'gpt-5.6-luna';
      const config = {
        enabled: Boolean(incoming.enabled),
        assistant_name: String(incoming.assistant_name || 'Raimunda').trim().slice(0, 60),
        model,
        booking_url: String(incoming.booking_url || '').trim().slice(0, 500),
        max_history_messages: Math.min(20, Math.max(4, Number(incoming.max_history_messages) || 12)),
        human_handoff_enabled: incoming.human_handoff_enabled !== false,
        handoff_message: String(incoming.handoff_message || '').trim().slice(0, 1000),
        prompt: String(incoming.prompt || '').trim().slice(0, 6000),
        updated_at: new Date().toISOString(),
      };

      if (!config.prompt || !config.booking_url) {
        return json({ success: false, error: 'prompt_and_booking_url_required' }, 400);
      }

      if (typeof body?.api_key === 'string' && body.api_key.trim()) {
        const { error: secretError } = await service.rpc('set_whatsapp_ai_api_key', { p_api_key: body.api_key.trim() });
        if (secretError) throw secretError;
      }

      const { data: hasKey, error: keyError } = await service.rpc('has_whatsapp_ai_api_key');
      if (keyError) throw keyError;
      if (config.enabled && !hasKey) return json({ success: false, error: 'api_key_required_to_enable' }, 400);

      const { error } = await service.from('site_config').upsert(
        { config_key: 'whatsapp_ai_attendant', config_value: config },
        { onConflict: 'config_key' },
      );
      if (error) throw error;
      return json({ success: true, config, has_api_key: Boolean(hasKey) });
    }

    if (action === 'test') {
      const [{ data: row }, { data: apiKey }] = await Promise.all([
        service.from('site_config').select('config_value').eq('config_key', 'whatsapp_ai_attendant').maybeSingle(),
        service.rpc('get_whatsapp_ai_api_key'),
      ]);
      if (!apiKey) return json({ success: false, error: 'api_key_not_configured' }, 400);
      const config = (row?.config_value || {}) as any;
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: allowedModels.has(config.model) ? config.model : 'gpt-5.6-luna',
          instructions: String(config.prompt || ''),
          input: 'Responda somente: Configuração da atendente validada com sucesso.',
          max_output_tokens: 80,
          reasoning: { effort: 'low' },
          text: { verbosity: 'low' },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('[WhatsApp AI Settings] OpenAI test failed', response.status, payload?.error?.code);
        return json({ success: false, error: payload?.error?.message || `openai_http_${response.status}` }, 400);
      }
      return json({ success: true, message: extractOutputText(payload) || 'API validada com sucesso.' });
    }

    return json({ success: false, error: 'unknown_action' }, 400);
  } catch (error) {
    console.error('[WhatsApp AI Settings] Unexpected error', error);
    return json({ success: false, error: error instanceof Error ? error.message : 'internal_error' }, 500);
  }
});
