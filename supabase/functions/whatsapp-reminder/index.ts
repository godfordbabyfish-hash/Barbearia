import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!;
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!;

// Get active instance from database or fallback to env var
const getActiveInstanceName = async (supabase: any): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('config_value')
      .eq('config_key', 'whatsapp_active_instance')
      .maybeSingle();

    if (!error && data?.config_value) {
      const config = data.config_value as any;
      if (config.instanceName) {
        return config.instanceName;
      }
    }
  } catch (error) {
    console.log('[Reminder] Could not load active instance from database');
  }
  
  return Deno.env.get('EVOLUTION_INSTANCE_NAME') || null;
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
      if (footerInfo?.maps_link) {
        return footerInfo.maps_link;
      }
      if (footerInfo?.address) {
        if (footerInfo.address.includes('http://') || footerInfo.address.includes('https://')) {
          return footerInfo.address;
        }
        const encodedAddress = encodeURIComponent(footerInfo.address);
        return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      }
    }
  } catch (error) {
    console.error('[Reminder] Error loading barbershop maps link:', error);
  }
  return null;
};

// Format phone number
const formatPhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  return cleaned;
};

// Generate reminder message
const generateReminderMessage = (appointment: any, mapsLink: string | null): string => {
  const formattedDate = appointment.appointment_date 
    ? new Date(appointment.appointment_date + 'T12:00:00').toLocaleDateString('pt-BR')
    : '';
  
  let message = `*Olá ${appointment.client_name}!* 👋\n\n` +
         `⏰ *Lembrete:* Seu agendamento está em 10 minutos!\n\n` +
         `📅 *Data:* ${formattedDate}\n` +
         `🕐 *Horário:* ${appointment.appointment_time}\n` +
         `${appointment.service_name ? `💇 *Serviço:* ${appointment.service_name}\n` : ''}` +
         `${appointment.barber_name ? `👨‍💼 *Barbeiro:* ${appointment.barber_name}\n` : ''}\n` +
         `Não se esqueça! Estamos te esperando! 🎉`;
  
  if (mapsLink) {
    message += `\n\n📍 *Localização:*\n${mapsLink}`;
  }
  
  return message;
};

// Send reminder via Evolution API
const sendReminder = async (phone: string, message: string, instanceName: string): Promise<boolean> => {
  const formattedPhone = formatPhoneNumber(phone);
  
  try {
    const response = await fetch(
      `${evolutionApiUrl}/message/sendText/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: message,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[Reminder] Error sending reminder to ${formattedPhone}:`, errorData);
      return false;
    }

    console.log(`[Reminder] Reminder sent successfully to ${formattedPhone}`);
    return true;
  } catch (error: any) {
    console.error(`[Reminder] Error sending reminder to ${formattedPhone}:`, error.message || error);
    return false;
  }
};

// Process reminders
const processReminders = async (supabase: any) => {
  // Get active instance
  const activeInstanceName = await getActiveInstanceName(supabase);
  if (!activeInstanceName) {
    console.log('[Reminder] No active WhatsApp instance configured');
    return { processed: 0, error: 'No active instance' };
  }

  // Get maps link once
  const mapsLink = await getBarbershopMapsLink(supabase);

  // Calculate the time window: appointments starting in 10 minutes (± 1 minute window)
  const now = new Date();
  const reminderTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
  const windowStart = new Date(reminderTime.getTime() - 60 * 1000); // 1 minute before
  const windowEnd = new Date(reminderTime.getTime() + 60 * 1000); // 1 minute after

  // Format times for SQL query
  const today = now.toISOString().split('T')[0];
  const timeStart = windowStart.toTimeString().slice(0, 5); // HH:MM
  const timeEnd = windowEnd.toTimeString().slice(0, 5); // HH:MM

  console.log(`[Reminder] Checking appointments for ${today} between ${timeStart} and ${timeEnd}`);

  // Find appointments that:
  // 1. Are today
  // 2. Are in the time window (10 minutes from now ± 1 minute)
  // 3. Are confirmed or pending
  // 4. Haven't had reminder sent yet (reminder_sent = false, since DEFAULT is FALSE)
  // 5. Client has a valid phone number
  const { data: appointmentsData, error: appointmentsError } = await supabase
    .from('appointments')
    .select('id, appointment_date, appointment_time, client_id, service_id, barber_id, status, booking_type, reminder_sent')
    .eq('appointment_date', today)
    .gte('appointment_time', timeStart)
    .lte('appointment_time', timeEnd)
    .in('status', ['confirmed', 'pending'])
    .eq('reminder_sent', false)
    .neq('booking_type', 'api');

  if (appointmentsError) {
    console.error('[Reminder] Error fetching appointments:', appointmentsError);
    return { processed: 0, error: appointmentsError.message };
  }

  if (!appointmentsData || appointmentsData.length === 0) {
    console.log('[Reminder] No appointments found for reminder');
    return { processed: 0 };
  }

  // Fetch related data separately - prioritize 'whatsapp' field, fallback to 'phone'
  const appointmentsWithDetails = await Promise.all(
    appointmentsData.map(async (apt) => {
      const [profile, service, barber] = await Promise.all([
        supabase.from('profiles').select('name, phone, whatsapp').eq('id', apt.client_id).maybeSingle(),
        apt.service_id ? supabase.from('services').select('title').eq('id', apt.service_id).maybeSingle() : Promise.resolve({ data: null }),
        apt.barber_id ? supabase.from('barbers').select('name').eq('id', apt.barber_id).maybeSingle() : Promise.resolve({ data: null })
      ]);

      return {
        ...apt,
        profiles: profile.data,
        services: service.data,
        barbers: barber.data
      };
    })
  );

  // Format WhatsApp number helper function
  const formatWhatsAppNumber = (phone: string | null | undefined): string | null => {
    if (!phone || phone === '' || phone === '00000000000') return null;
    
    // Remove any non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If it's 10 digits (DDD + 8 digits without 9), add country code 55
    if (cleaned.length === 10) {
      return '55' + cleaned;
    }
    // If it's 11 digits (DDD + 9 + 8 digits), add country code 55
    if (cleaned.length === 11) {
      return '55' + cleaned;
    }
    // If it already has country code (12+ digits), use as is
    if (cleaned.length >= 12) {
      return cleaned;
    }
    
    return null;
  };

  // Filter out appointments without valid whatsapp/phone and format the number
  const appointments = appointmentsWithDetails
    .map(apt => {
      const whatsappField = apt.profiles?.whatsapp || apt.profiles?.phone;
      const formattedWhatsApp = formatWhatsAppNumber(whatsappField);
      return {
        ...apt,
        formattedWhatsApp
      };
    })
    .filter(apt => apt.formattedWhatsApp !== null);

  if (!appointments || appointments.length === 0) {
    console.log('[Reminder] No appointments found for reminder');
    return { processed: 0 };
  }

  console.log(`[Reminder] Found ${appointments.length} appointment(s) to remind`);

  let processed = 0;
  let failed = 0;

  for (const appointment of appointments) {
    try {
      const clientWhatsApp = appointment.formattedWhatsApp;
      const clientName = appointment.profiles?.name;
      
      if (!clientWhatsApp) {
        console.log(`[Reminder] Skipping appointment ${appointment.id} - no valid whatsapp`);
        continue;
      }

      const message = generateReminderMessage({
        client_name: clientName || 'Cliente',
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        service_name: appointment.services?.title,
        barber_name: appointment.barbers?.name,
      }, mapsLink);

      const success = await sendReminder(clientWhatsApp, message, activeInstanceName);

      if (success) {
        // Mark reminder as sent (with race condition protection - only update if still false)
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ reminder_sent: true })
          .eq('id', appointment.id)
          .eq('reminder_sent', false); // Only update if still false (race condition protection)
        
        if (updateError) {
          console.warn(`[Reminder] Could not update reminder_sent for appointment ${appointment.id}:`, updateError);
        } else {
          processed++;
          console.log(`[Reminder] Reminder sent for appointment ${appointment.id}`);
        }
      } else {
        failed++;
        console.error(`[Reminder] Failed to send reminder for appointment ${appointment.id}`);
      }

      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`[Reminder] Error processing appointment ${appointment.id}:`, error.message || error);
      failed++;
    }
  }

  return { processed, failed };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!evolutionApiUrl || !evolutionApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurados' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const result = await processReminders(supabase);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Reminder] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
