import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WhatsAppMessage {
  appointmentId: string;
  clientName: string;
  phone: string;
  action: 'created' | 'updated' | 'cancelled' | 'completed' | 'reminder' | 'barber_new_appointment';
  appointmentDate?: string;
  appointmentTime?: string;
  serviceName?: string;
  barberName?: string;
  targetType?: 'client' | 'barber';
}

const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!;
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!;
const evolutionInstanceNameEnv = Deno.env.get('EVOLUTION_INSTANCE_NAME')!;

// Get active instance from database or fallback to env var
const getActiveInstanceName = async (supabase: any): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('config_value')
      .eq('config_key', 'whatsapp_active_instance')
      .maybeSingle(); // Usa maybeSingle() para evitar erro 406 quando não há registro

    if (!error && data?.config_value) {
      const config = data.config_value as any;
      if (config.instanceName) {
        return config.instanceName;
      }
    }
  } catch (error) {
    console.log('[WhatsApp] Could not load active instance from database, using env var');
  }
  
  // Fallback to environment variable
  return evolutionInstanceNameEnv;
};

// Format phone number (remove non-digits, add country code if needed)
// IMPORTANTE: O bot Railway adiciona @s.whatsapp.net automaticamente,
// então só precisamos enviar o número limpo (sem @s.whatsapp.net)
// NOTA: A migration SQL já formata o número com código 55, então aqui só validamos
const formatPhoneNumber = (phone: string): string => {
  // Remove todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove @s.whatsapp.net se estiver presente (o bot Railway adiciona isso)
  cleaned = cleaned.replace(/@s\.whatsapp\.net/gi, '');
  
  // Se já começar com 55, verificar se tem tamanho válido (mínimo 12: 55 + DDD + número)
  if (cleaned.startsWith('55')) {
    if (cleaned.length >= 12) {
      // Já está formatado corretamente pela migration
      console.log(`[WhatsApp] Phone já formatado: ${cleaned} (original: ${phone})`);
      return cleaned;
    } else {
      // Tem 55 mas tamanho inválido, tentar corrigir
      console.warn(`[WhatsApp] Phone com 55 mas tamanho inválido: ${cleaned.length} dígitos (original: ${phone})`);
    }
  }
  
  // Se não começar com 55, adiciona (pode ser número antigo da fila)
  if (!cleaned.startsWith('55')) {
    // Se tem 10 ou 11 dígitos, adiciona 55
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = '55' + cleaned;
      console.log(`[WhatsApp] Phone formatado (adicionado 55): ${cleaned} (original: ${phone})`);
    } else {
      console.warn(`[WhatsApp] Phone com tamanho inválido: ${cleaned.length} dígitos (original: ${phone})`);
    }
  }
  
  return cleaned;
};

// Get barbershop Google Maps link from site_config
const getBarbershopMapsLink = async (supabase: any): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('config_value')
      .eq('config_key', 'footer_info')
      .maybeSingle();

    if (!error && data) {
      const footerInfo = data.config_value as any;
      // Priorizar o link salvo do Google Maps
      if (footerInfo?.maps_link) {
        return footerInfo.maps_link;
      }
      // Se não tiver link, gerar a partir do endereço
      if (footerInfo?.address) {
        // Se o endereço já for um link, usar diretamente
        if (footerInfo.address.includes('http://') || footerInfo.address.includes('https://')) {
          return footerInfo.address;
        }
        // Gerar link do Google Maps a partir do endereço
        const encodedAddress = encodeURIComponent(footerInfo.address);
        return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      }
    }
  } catch (error) {
    console.error('[WhatsApp] Error loading barbershop maps link:', error);
  }
  return null;
};

// Default hardcoded templates (fallback if not configured in site_config)
const DEFAULT_TEMPLATES: Record<string, string> = {
  whatsapp_msg_created:
    '*Olá {{clientName}}!* 👋\n\nSeu agendamento foi *confirmado* com sucesso! ✅\n\n📅 *Data:* {{appointmentDate}}\n🕐 *Horário:* {{appointmentTime}}\n💇 *Serviço:* {{serviceName}}\n👨‍💼 *Barbeiro:* {{barberName}}\n\nEstamos te esperando! 🎉',
  whatsapp_msg_updated:
    '*Olá {{clientName}}!* 👋\n\nSeu agendamento foi *remarcado*. 📝\n\n📅 *Nova Data:* {{appointmentDate}}\n🕐 *Novo Horário:* {{appointmentTime}}\n💇 *Serviço:* {{serviceName}}\n👨‍💼 *Barbeiro:* {{barberName}}\n\nPor favor, confirme sua presença. ✅',
  whatsapp_msg_cancelled:
    '*Olá {{clientName}}!* 👋\n\nInfelizmente seu agendamento foi *cancelado*. ❌\n\n📅 *Data:* {{appointmentDate}}\n🕐 *Horário:* {{appointmentTime}}\n\nEntre em contato conosco para reagendar. 📞',
  whatsapp_msg_completed:
    '🎉 *Atendimento Concluído!*\n\nObrigado pela visita, *{{clientName}}*! Foi um prazer atendê-lo.\n\n✂️ Serviço: {{serviceName}}\n� Barbeiro: {{barberName}}\n\nEsperamos vê-lo em breve! Não esqueça de nos avaliar. ⭐',
  whatsapp_msg_reminder:
    '⏰ *Lembrete de Agendamento!*\n\nOlá, *{{clientName}}*! Lembramos que você tem um agendamento amanhã.\n\n� *Detalhes:*\n• Serviço: {{serviceName}}\n• Barbeiro: {{barberName}}\n• Data: {{appointmentDate}}\n• Horário: {{appointmentTime}}\n\nTe esperamos! 💈',
  whatsapp_msg_barber_new_appointment:
    '📅 *Novo Agendamento!*\n\nVocê tem um novo agendamento, *{{barberName}}*!\n\n👤 Cliente: {{clientName}}\n� Serviço: {{serviceName}}\n📆 Data: {{appointmentDate}}\n🕐 Horário: {{appointmentTime}}',
};

// Interpolate template variables
const interpolate = (template: string, vars: Record<string, string>): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
};

// Load all message templates from site_config
const loadTemplates = async (supabase: any): Promise<Record<string, string>> => {
  try {
    const keys = Object.keys(DEFAULT_TEMPLATES);
    const { data, error } = await supabase
      .from('site_config')
      .select('config_key, config_value')
      .in('config_key', keys);
    if (error || !data) return DEFAULT_TEMPLATES;
    const result = { ...DEFAULT_TEMPLATES };
    for (const row of data) {
      const text = (row.config_value as any)?.text;
      if (text) result[row.config_key] = text;
    }
    return result;
  } catch {
    return DEFAULT_TEMPLATES;
  }
};

// Generate message based on action and target type using admin-configured templates
const generateMessage = async (data: WhatsAppMessage, supabase: any, mapsLink?: string | null): Promise<string> => {
  const { action, clientName, appointmentDate, appointmentTime, serviceName, barberName, targetType = 'client' } = data;

  const formattedDate = appointmentDate
    ? new Date(appointmentDate + 'T12:00:00').toLocaleDateString('pt-BR')
    : '';
  const formattedTime = appointmentTime || '';

  const templates = await loadTemplates(supabase);

  const vars: Record<string, string> = {
    clientName: clientName || '',
    serviceName: serviceName || '',
    barberName: barberName || '',
    appointmentDate: formattedDate,
    appointmentTime: formattedTime,
  };

  let templateKey: string;
  if (targetType === 'barber' || action === 'barber_new_appointment') {
    templateKey = 'whatsapp_msg_barber_new_appointment';
  } else if (action === 'completed') {
    templateKey = 'whatsapp_msg_completed';
  } else if (action === 'reminder') {
    templateKey = 'whatsapp_msg_reminder';
  } else if (action === 'created') {
    templateKey = 'whatsapp_msg_created';
  } else if (action === 'updated') {
    templateKey = 'whatsapp_msg_updated';
  } else if (action === 'cancelled') {
    templateKey = 'whatsapp_msg_cancelled';
  } else {
    templateKey = 'whatsapp_msg_created';
  }

  const template = templates[templateKey] || DEFAULT_TEMPLATES[templateKey] || '*Olá {{clientName}}!*\n\nHá uma atualização no seu agendamento.';
  let message = interpolate(template, vars);

  // Append Maps link for client created/updated messages if available
  if (mapsLink && targetType === 'client' && (action === 'created' || action === 'updated')) {
    message += `\n\n� *Localização:*\n${mapsLink}`;
  }

  return message;
};

// Send message via Evolution API with retry logic
const sendWhatsAppMessage = async (phone: string, message: string, instanceName: string, retries: number = 3): Promise<{ success: boolean; error?: string }> => {
  const formattedPhone = formatPhoneNumber(phone);
  
  console.log(`[WhatsApp] Attempting to send message to ${formattedPhone}`);
  console.log(`[WhatsApp] Evolution API URL: ${evolutionApiUrl}`);
  console.log(`[WhatsApp] Instance Name: ${instanceName}`);
  console.log(`[WhatsApp] Retries remaining: ${retries}`);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[WhatsApp] Attempt ${attempt}/${retries}`);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout (aumentado de 30s)
      
      const response = await fetch(
        `${evolutionApiUrl}/message/sendText/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey,
            'Connection': 'keep-alive',
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: message,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      // Check if response is ok
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        console.error(`[WhatsApp] Evolution API error (attempt ${attempt}):`, errorData);
        
        // If it's a client error (4xx), don't retry
        if (response.status >= 400 && response.status < 500) {
          return { success: false, error: errorData.message || errorData.error || `HTTP ${response.status}` };
        }
        
        // For server errors (5xx), retry
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          console.log(`[WhatsApp] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return { success: false, error: errorData.message || errorData.error || 'Erro ao enviar mensagem' };
      }

      const data = await response.json();
      console.log(`[WhatsApp] Message sent successfully on attempt ${attempt}:`, JSON.stringify(data, null, 2));
      console.log(`[WhatsApp] Response status: ${response.status}`);
      console.log(`[WhatsApp] Response headers:`, Object.fromEntries(response.headers.entries()));
      
      // Verificar se a resposta indica sucesso
      if (data.success === false || data.error) {
        console.error(`[WhatsApp] API retornou erro na resposta:`, data);
        return { success: false, error: data.error || data.message || 'Erro ao enviar mensagem' };
      }
      
      return { success: true };
      
    } catch (error: any) {
      console.error(`[WhatsApp] Error on attempt ${attempt}:`, error.message || error);
      
      // If it's an abort (timeout), retry
      if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('tempo limite')) {
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`[WhatsApp] Timeout - retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return { success: false, error: 'Timeout ao enviar mensagem - API não respondeu a tempo' };
      }
      
      // If connection was closed, retry
      if (error.message?.includes('fechada') || error.message?.includes('closed') || error.message?.includes('ECONNRESET')) {
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`[WhatsApp] Connection closed - retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return { success: false, error: 'Conexão com API foi fechada - tente novamente' };
      }
      
      // For other errors, don't retry
      return { success: false, error: error.message || 'Erro desconhecido ao enviar mensagem' };
    }
  }
  
  return { success: false, error: 'Falha após todas as tentativas' };
};

// Process queue from database
const processQueue = async (supabase: any) => {
  console.log('[Queue] Iniciando processamento da fila...');
  
  // Get active instance name
  const activeInstanceName = await getActiveInstanceName(supabase);
  console.log('[Queue] Instância ativa:', activeInstanceName);
  console.log('[Queue] Evolution API URL:', evolutionApiUrl);
  console.log('[Queue] Evolution API Key configurada:', !!evolutionApiKey);
  
  if (!activeInstanceName) {
    console.error('[Queue] Nenhuma instância ativa encontrada!');
    return { processed: 0, error: 'Nenhuma instância WhatsApp ativa' };
  }
  
  // Get barbershop maps link once (cache it for all messages in this batch)
  const mapsLink = await getBarbershopMapsLink(supabase);
  if (mapsLink) {
    console.log('[Queue] Barbershop maps link loaded:', mapsLink);
  }
  
  // Get pending notifications (limit 10 at a time)
  const { data: queue, error } = await supabase
    .from('whatsapp_notifications_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) {
    console.error('[Queue] Erro ao buscar fila:', error);
    return { processed: 0, error: error.message };
  }

  console.log(`[Queue] Encontradas ${queue?.length || 0} mensagens pendentes`);
  
  if (!queue || queue.length === 0) {
    console.log('[Queue] Nenhuma mensagem pendente na fila');
    return { processed: 0 };
  }

  let processed = 0;
  let failed = 0;
  
  for (const item of queue) {
    try {
      const targetPhone = item.target_phone || item.client_phone;
      const payload = item.payload as WhatsAppMessage;
      const targetType = (item.target_type as 'client' | 'barber') || payload.targetType || 'client';

      // Garantir que o payload saiba para quem é a mensagem
      payload.targetType = targetType;

      console.log(`[Queue] Processando item ${item.id} para ${targetPhone} (targetType=${targetType}, appointmentId=${payload.appointmentId})`);
      console.log(`[Queue] Payload:`, JSON.stringify(payload, null, 2));

      // Passar o mapsLink apenas para mensagens de cliente
      const message = await generateMessage(payload, supabase, targetType === 'client' ? mapsLink : null);
      console.log(`[Queue] Mensagem gerada (${message.length} caracteres):`, message.substring(0, 100) + '...');
      const result = await sendWhatsAppMessage(targetPhone, message, activeInstanceName);
      console.log(`[Queue] Resultado do envio:`, result);
      
      // Update queue status
      const updateData: any = {
        processed_at: new Date().toISOString(),
        attempts: item.attempts + 1
      };

      if (result.success) {
        updateData.status = 'sent';
        updateData.error_message = null;
        processed++;
        console.log(`[Queue] Item ${item.id} sent successfully`);
      } else {
        updateData.error_message = result.error || 'Erro desconhecido';
        // If failed after 3 attempts, mark as failed
        if (item.attempts + 1 >= 3) {
          updateData.status = 'failed';
          failed++;
          console.error(`[Queue] Item ${item.id} failed after 3 attempts: ${result.error}`);
        } else {
          updateData.status = 'pending';
          console.warn(`[Queue] Item ${item.id} will retry (attempt ${item.attempts + 1}/3): ${result.error}`);
        }
      }

      const { error: updateError } = await supabase
        .from('whatsapp_notifications_queue')
        .update(updateData)
        .eq('id', item.id);
      
      if (updateError) {
        console.error(`[Queue] Error updating item ${item.id}:`, updateError);
      }
      
      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`[Queue] Error processing queue item ${item.id}:`, error.message || error);
      failed++;
      
      // Update item with error
      try {
        await supabase
          .from('whatsapp_notifications_queue')
          .update({
            attempts: item.attempts + 1,
            error_message: error.message || 'Erro desconhecido',
            status: item.attempts + 1 >= 3 ? 'failed' : 'pending'
          })
          .eq('id', item.id);
      } catch (updateErr) {
        console.error(`[Queue] Failed to update error status for item ${item.id}`);
      }
    }
  }
  
  return { processed, failed };
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Check if environment variables are set
    if (!evolutionApiUrl || !evolutionApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Variáveis de ambiente não configuradas. Configure EVOLUTION_API_URL e EVOLUTION_API_KEY.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get active instance (will use env var as fallback if not in database)
    const activeInstanceName = await getActiveInstanceName(supabase);
    
    if (!activeInstanceName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhuma instância WhatsApp configurada. Configure uma instância ativa no painel admin ou defina EVOLUTION_INSTANCE_NAME.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process queue endpoint
    if (req.method === 'POST' && path === 'process-queue') {
      const result = await processQueue(supabase);
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send single message endpoint
    const payload: WhatsAppMessage = await req.json();

    // Validate required fields
    if (!payload.phone || !payload.clientName || !payload.action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campos obrigatórios faltando: phone, clientName, action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get barbershop maps link if message is for client
    const targetType = payload.targetType || 'client';
    const mapsLink = targetType === 'client' ? await getBarbershopMapsLink(supabase) : null;

    // Generate message
    const message = await generateMessage(payload, supabase, mapsLink);

    // Send via Evolution API (using active instance)
    const result = await sendWhatsAppMessage(payload.phone, message, activeInstanceName);

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mensagem enviada com sucesso',
        appointmentId: payload.appointmentId 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
