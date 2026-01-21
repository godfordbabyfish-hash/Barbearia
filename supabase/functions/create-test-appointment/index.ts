import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar barbeiro Islan Raimundo
    const { data: barberData, error: barberError } = await supabase
      .from('barbers')
      .select('id, name, whatsapp_phone')
      .ilike('name', '%Islan%')
      .limit(1)
      .single();

    if (barberError || !barberData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Barbeiro Islan não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar primeiro serviço
    const { data: serviceData, error: serviceError } = await supabase
      .from('services')
      .select('id, title, duration')
      .eq('visible', true)
      .order('order_index')
      .limit(1)
      .single();

    if (serviceError || !serviceData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum serviço disponível' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar ou buscar perfil do cliente (96991944679)
    let { data: clientData } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', '96991944679')
      .maybeSingle();

    let clientId: string;

    if (!clientData) {
      const { data: newClient, error: clientError } = await supabase
        .from('profiles')
        .insert({ name: 'Cliente Teste Lembrete', phone: '96991944679' })
        .select('id')
        .single();

      if (clientError || !newClient) {
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao criar perfil do cliente' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      clientId = newClient.id;
    } else {
      clientId = clientData.id;
    }

    // Calcular horário: 11 minutos a partir de agora
    const now = new Date();
    const appointmentDateTime = new Date(now.getTime() + 11 * 60 * 1000);
    const appointmentDate = appointmentDateTime.toISOString().split('T')[0];
    const appointmentTime = appointmentDateTime.toTimeString().slice(0, 5);

    // Criar agendamento com booking_type='online' (dispara notificações)
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        client_id: clientId,
        barber_id: barberData.id,
        service_id: serviceData.id,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        status: 'confirmed',
        booking_type: 'online', // IMPORTANTE: 'online' dispara notificações
        reminder_sent: false,
      })
      .select('id, appointment_date, appointment_time')
      .single();

    if (appointmentError || !appointmentData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao criar agendamento',
          details: appointmentError?.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aguardar 2 segundos para o trigger processar
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar se notificações foram criadas na fila
    const { data: queueData } = await supabase
      .from('whatsapp_notifications_queue')
      .select('id, target_type, target_phone, message_action, status')
      .eq('appointment_id', appointmentData.id)
      .order('created_at', { ascending: false });

    // Disparar processamento da fila
    try {
      const queueUrl = `${supabaseUrl}/functions/v1/whatsapp-process-queue`;
      await fetch(queueUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({}),
      });
    } catch (e) {
      console.log('Queue processing may happen automatically');
    }

    return new Response(
      JSON.stringify({
        success: true,
        appointment: {
          id: appointmentData.id,
          date: appointmentData.appointment_date,
          time: appointmentData.appointment_time,
          client_phone: '96991944679',
          barber_name: barberData.name,
          barber_whatsapp: barberData.whatsapp_phone,
          service_title: serviceData.title,
        },
        notifications_queued: queueData?.length || 0,
        queue_items: queueData,
        message: 'Agendamento criado com sucesso! As notificações serão enviadas automaticamente.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
