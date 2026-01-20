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
  action: 'created' | 'updated' | 'cancelled';
  appointmentDate?: string;
  appointmentTime?: string;
  serviceName?: string;
  barberName?: string;
  targetType?: 'client' | 'barber';
}

const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!;
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!;
const evolutionInstanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME')!;

// Format phone number (remove non-digits, add country code if needed)
const formatPhoneNumber = (phone: string): string => {
  // Remove todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Se não começar com 55 (Brasil), adiciona
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
};

// Generate message based on action and target type
const generateMessage = (data: WhatsAppMessage): string => {
  const { action, clientName, appointmentDate, appointmentTime, serviceName, barberName, targetType = 'client' } = data;
  
  const formattedDate = appointmentDate 
    ? new Date(appointmentDate + 'T12:00:00').toLocaleDateString('pt-BR')
    : '';
  const formattedTime = appointmentTime || '';
  
  // Mensagens para cliente (padrão atual)
  if (targetType === 'client') {
    switch (action) {
      case 'created':
        return `*Olá ${clientName}!* 👋\n\n` +
               `Seu agendamento foi *confirmado* com sucesso! ✅\n\n` +
               `📅 *Data:* ${formattedDate}\n` +
               `🕐 *Horário:* ${formattedTime}\n` +
               `${serviceName ? `💇 *Serviço:* ${serviceName}\n` : ''}` +
               `${barberName ? `👨‍💼 *Barbeiro:* ${barberName}\n` : ''}\n` +
               `Estamos te esperando! 🎉`;
               
      case 'updated':
        return `*Olá ${clientName}!* 👋\n\n` +
               `Seu agendamento foi *remarcado*. 📝\n\n` +
               `📅 *Nova Data:* ${formattedDate}\n` +
               `🕐 *Novo Horário:* ${formattedTime}\n` +
               `${serviceName ? `💇 *Serviço:* ${serviceName}\n` : ''}` +
               `${barberName ? `👨‍💼 *Barbeiro:* ${barberName}\n` : ''}\n` +
               `Por favor, confirme sua presença. ✅`;
               
      case 'cancelled':
        return `*Olá ${clientName}!* 👋\n\n` +
               `Infelizmente seu agendamento foi *cancelado*. ❌\n\n` +
               `📅 *Data:* ${formattedDate}\n` +
               `🕐 *Horário:* ${formattedTime}\n\n` +
               `Entre em contato conosco para reagendar. 📞`;
               
      default:
        return `*Olá ${clientName}!*\n\nHá uma atualização no seu agendamento.`;
    }
  }

  // Mensagens para barbeiro
  const statusText =
    action === 'created' ? 'novo agendamento' :
    action === 'updated' ? 'agendamento *remarcado*' :
    action === 'cancelled' ? 'agendamento *cancelado*' :
    'atualização no agendamento';

  return `*Você recebeu um ${statusText}*\n\n` +
         `👤 *Cliente:* ${clientName}\n` +
         `${serviceName ? `💇 *Serviço:* ${serviceName}\n` : ''}` +
         `${formattedDate ? `📅 *Data:* ${formattedDate}\n` : ''}` +
         `${formattedTime ? `🕐 *Horário:* ${formattedTime}\n` : ''}` +
         `${barberName ? `👨‍💼 *Barbeiro:* ${barberName}\n` : ''}`;
};

// Send message via Evolution API with retry logic
const sendWhatsAppMessage = async (phone: string, message: string, retries: number = 3): Promise<{ success: boolean; error?: string }> => {
  const formattedPhone = formatPhoneNumber(phone);
  
  console.log(`[WhatsApp] Attempting to send message to ${formattedPhone}`);
  console.log(`[WhatsApp] Evolution API URL: ${evolutionApiUrl}`);
  console.log(`[WhatsApp] Instance Name: ${evolutionInstanceName}`);
  console.log(`[WhatsApp] Retries remaining: ${retries}`);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[WhatsApp] Attempt ${attempt}/${retries}`);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout (aumentado de 30s)
      
      const response = await fetch(
        `${evolutionApiUrl}/message/sendText/${evolutionInstanceName}`,
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
      console.log(`[WhatsApp] Message sent successfully on attempt ${attempt}:`, data);
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
  // Get pending notifications (limit 10 at a time)
  const { data: queue, error } = await supabase
    .from('whatsapp_notifications_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Error fetching queue:', error);
    return { processed: 0, error: error.message };
  }

  if (!queue || queue.length === 0) {
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

      console.log(`[Queue] Processing item ${item.id} for ${targetPhone} (targetType=${targetType}, appointmentId=${payload.appointmentId})`);

      const message = generateMessage(payload);
      const result = await sendWhatsAppMessage(targetPhone, message);
      
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
    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstanceName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Variáveis de ambiente não configuradas. Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Generate message
    const message = generateMessage(payload);

    // Send via Evolution API
    const result = await sendWhatsAppMessage(payload.phone, message);

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
