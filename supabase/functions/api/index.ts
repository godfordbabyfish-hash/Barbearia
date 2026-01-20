import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Validate optional API Key
const validateApiKey = (req: Request): { valid: boolean; message?: string } => {
  const authHeader = req.headers.get('authorization');
  
  // If no auth header, authentication is optional - allow request
  if (!authHeader) {
    return { valid: true };
  }
  
  // If auth header exists but doesn't start with Bearer, allow (might be other auth)
  if (!authHeader.startsWith('Bearer ')) {
    return { valid: true };
  }
  
  const providedKey = authHeader.replace('Bearer ', '');
  const configuredKey = Deno.env.get('API_KEY');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  // Allow Supabase anon key (used by supabase.functions.invoke())
  if (providedKey === supabaseAnonKey) {
    return { valid: true };
  }
  
  // If no custom API_KEY configured, allow all requests
  if (!configuredKey) {
    return { valid: true };
  }
  
  // Validate the provided custom API key
  if (providedKey === configuredKey) {
    return { valid: true };
  }
  
  // Unknown key - reject only if it doesn't look like a JWT (Supabase user token)
  // JWTs typically start with "eyJ" (base64 encoded JSON)
  if (providedKey.startsWith('eyJ')) {
    return { valid: true }; // Allow Supabase user JWTs
  }
  
  return { valid: false, message: 'API Key inválida' };
};

// Helper to format date for local display (Brazil timezone)
const formatLocalDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('pt-BR', { 
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper to parse time string to minutes
const timeToMinutes = (time: string): number => {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
};

// Helper to convert minutes to time string
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

// Get operating hours from site_config
const getOperatingHours = async () => {
  const { data } = await supabase
    .from('site_config')
    .select('config_value')
    .eq('config_key', 'operating_hours')
    .single();
  
  return data?.config_value || null;
};

// Webhook with retry logic for UI-created appointments
const callWebhookWithRetry = async (
  payload: any,
  maxRetries: number = 3,
  delayMs: number = 5000
): Promise<boolean> => {
  const webhookUrl = 'https://projetomensagem-production.up.railway.app/api/webhooks/premium-shears/appointment-created';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Webhook attempt ${attempt}/${maxRetries} to ${webhookUrl}`);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        console.log(`Webhook called successfully on attempt ${attempt}`);
        return true;
      }
      
      console.error(`Webhook attempt ${attempt} failed with status: ${response.status}`);
      
      if (attempt < maxRetries) {
        console.log(`Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Webhook attempt ${attempt} error:`, error);
      
      if (attempt < maxRetries) {
        console.log(`Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  console.error('All webhook retry attempts failed');
  return false;
};

// Get available time slots for a given date range
const getAvailableSlots = async (
  from: Date, 
  to: Date, 
  durationMinutes: number, 
  intervalMinutes: number = 0,
  barberId?: string
) => {
  const slots: { startISO: string; startLocal: string; endISO: string; endLocal: string }[] = [];
  const operatingHours = await getOperatingHours();
  
  if (!operatingHours) {
    console.log("No operating hours configured");
    return slots;
  }

  const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  
  // Get all existing appointments in the date range
  const fromDateStr = from.toISOString().split('T')[0];
  const toDateStr = to.toISOString().split('T')[0];
  
  let appointmentsQuery = supabase
    .from('appointments')
    .select('appointment_date, appointment_time, service:services(duration)')
    .gte('appointment_date', fromDateStr)
    .lte('appointment_date', toDateStr)
    .neq('status', 'cancelled');

  if (barberId) {
    appointmentsQuery = appointmentsQuery.eq('barber_id', barberId);
  }

  const { data: appointments } = await appointmentsQuery;

  // Get barber breaks for the date range if barberId is provided
  let breaks: any[] = [];
  if (barberId) {
    const { data: breaksData } = await supabase
      .from('barber_breaks')
      .select('date, start_time, end_time')
      .eq('barber_id', barberId)
      .gte('date', fromDateStr)
      .lte('date', toDateStr);
    
    breaks = breaksData || [];
  }

  // Process each day in the range
  const currentDate = new Date(from);
  while (currentDate <= to) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay();
    const dayName = dayNames[dayOfWeek];
    const dayHours = operatingHours[dayName];

    if (dayHours && !dayHours.closed) {
      const openMinutes = timeToMinutes(dayHours.open);
      const closeMinutes = timeToMinutes(dayHours.close);
      const lunchStartMinutes = dayHours.hasLunchBreak ? timeToMinutes(dayHours.lunchStart || '12:00') : null;
      const lunchEndMinutes = dayHours.hasLunchBreak ? timeToMinutes(dayHours.lunchEnd || '13:00') : null;

      // Get appointments for this specific day
      const dayAppointments = (appointments || []).filter(
        (apt: any) => apt.appointment_date === dateStr
      );

      // Get breaks for this specific day
      const dayBreaks = breaks.filter((br: any) => br.date === dateStr);

      // Generate slots
      for (let slotStart = openMinutes; slotStart + durationMinutes <= closeMinutes; slotStart += 30) {
        const slotEnd = slotStart + durationMinutes;
        const slotTime = minutesToTime(slotStart);

        // Skip if slot is in the past
        const slotDateTime = new Date(`${dateStr}T${slotTime}:00`);
        if (slotDateTime < new Date()) continue;

        // Skip if slot overlaps with lunch break
        if (lunchStartMinutes !== null && lunchEndMinutes !== null) {
          if (slotStart < lunchEndMinutes && slotEnd > lunchStartMinutes) {
            continue;
          }
        }

        // Check if slot overlaps with a break
        const isInBreak = dayBreaks.some((br: any) => {
          const breakStart = timeToMinutes(br.start_time);
          const breakEnd = timeToMinutes(br.end_time);
          // Slot overlaps with break if: slot_start < break_end AND slot_end > break_start
          return slotStart < breakEnd && slotEnd > breakStart;
        });

        if (isInBreak) {
          continue;
        }

        // Check if slot conflicts with existing appointments
        const hasConflict = dayAppointments.some((apt: any) => {
          const aptStart = timeToMinutes(apt.appointment_time);
          const aptDuration = apt.service?.duration || 30;
          const aptEnd = aptStart + aptDuration + intervalMinutes;
          return slotStart < aptEnd && slotEnd > aptStart - intervalMinutes;
        });

        if (!hasConflict) {
          const startDateTime = new Date(`${dateStr}T${slotTime}:00`);
          const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);
          
          slots.push({
            startISO: startDateTime.toISOString(),
            startLocal: formatLocalDateTime(startDateTime.toISOString()),
            endISO: endDateTime.toISOString(),
            endLocal: formatLocalDateTime(endDateTime.toISOString()),
          });
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots;
};

// Check availability for a specific time slot
const checkSlotAvailability = async (
  startTime: Date,
  durationMinutes: number,
  intervalMinutes: number = 0,
  barberId?: string
) => {
  const dateStr = startTime.toISOString().split('T')[0];
  const timeStr = `${String(startTime.getUTCHours()).padStart(2, '0')}:${String(startTime.getUTCMinutes()).padStart(2, '0')}`;
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

  // Check operating hours
  const operatingHours = await getOperatingHours();
  if (!operatingHours) {
    return { available: false, message: 'Horários de funcionamento não configurados' };
  }

  const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const dayOfWeek = startTime.getDay();
  const dayName = dayNames[dayOfWeek];
  const dayHours = operatingHours[dayName];

  if (!dayHours || dayHours.closed) {
    return { available: false, message: 'Estabelecimento fechado neste dia' };
  }

  const slotStart = timeToMinutes(timeStr);
  const slotEnd = slotStart + durationMinutes;
  const openMinutes = timeToMinutes(dayHours.open);
  const closeMinutes = timeToMinutes(dayHours.close);

  if (slotStart < openMinutes || slotEnd > closeMinutes) {
    return { available: false, message: 'Horário fora do expediente' };
  }

  // Check lunch break
  if (dayHours.hasLunchBreak) {
    const lunchStart = timeToMinutes(dayHours.lunchStart || '12:00');
    const lunchEnd = timeToMinutes(dayHours.lunchEnd || '13:00');
    if (slotStart < lunchEnd && slotEnd > lunchStart) {
      return { available: false, message: 'Horário de almoço' };
    }
  }

  // Check for breaks if barberId is provided
  if (barberId) {
    const { data: breaks } = await supabase
      .from('barber_breaks')
      .select('start_time, end_time')
      .eq('barber_id', barberId)
      .eq('date', dateStr);

    if (breaks && breaks.length > 0) {
      const slotStart = timeToMinutes(timeStr);
      const slotEnd = slotStart + durationMinutes;

      const isInBreak = breaks.some((br: any) => {
        const breakStart = timeToMinutes(br.start_time);
        const breakEnd = timeToMinutes(br.end_time);
        // Slot overlaps with break if: slot_start < break_end AND slot_end > break_start
        return slotStart < breakEnd && slotEnd > breakStart;
      });

      if (isInBreak) {
        return { available: false, message: 'Horário em pausa do barbeiro' };
      }
    }
  }

  // Check for conflicting appointments
  let conflictsQuery = supabase
    .from('appointments')
    .select('id, appointment_time, service:services(duration), profiles:client_id(name)')
    .eq('appointment_date', dateStr)
    .neq('status', 'cancelled');

  if (barberId) {
    conflictsQuery = conflictsQuery.eq('barber_id', barberId);
  }

  const { data: conflicts } = await conflictsQuery;

  const conflictingAppointment = (conflicts || []).find((apt: any) => {
    const aptStart = timeToMinutes(apt.appointment_time);
    const aptDuration = apt.service?.duration || 30;
    const aptEnd = aptStart + aptDuration + intervalMinutes;
    return slotStart < aptEnd && slotEnd > aptStart - intervalMinutes;
  });

  if (conflictingAppointment) {
    const aptData = conflictingAppointment as any;
    const aptStart = new Date(`${dateStr}T${aptData.appointment_time}:00`);
    const aptDuration = aptData.service?.duration || 30;
    const aptEnd = new Date(aptStart.getTime() + aptDuration * 60000);
    
    return {
      available: false,
      message: 'Horário já está ocupado',
      conflictingAppointment: {
        id: aptData.id,
        clientName: aptData.profiles?.name || 'Cliente',
        startTime: aptStart.toISOString(),
        endTime: aptEnd.toISOString(),
      }
    };
  }

  return { available: true, message: 'Horário disponível' };
};

// Create a new appointment
const createAppointment = async (data: {
  clientName: string;
  phone: string;
  service: string;
  startTime: string;
  endTime: string;
  notes?: string;
}) => {
  const startDate = new Date(data.startTime);
  const dateStr = startDate.toISOString().split('T')[0];
  const timeStr = `${String(startDate.getUTCHours()).padStart(2, '0')}:${String(startDate.getUTCMinutes()).padStart(2, '0')}`;

  // Find or create client profile
  let { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', data.phone)
    .single();

  let clientId: string;

  if (!existingProfile) {
    // Create a new profile for the client
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        name: data.clientName,
        phone: data.phone,
      })
      .select('id')
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      throw new Error('Erro ao criar perfil do cliente');
    }
    clientId = newProfile.id;
  } else {
    clientId = existingProfile.id;
  }

  // Find service by title/name
  let { data: service } = await supabase
    .from('services')
    .select('id, duration, title')
    .ilike('title', `%${data.service}%`)
    .single();

  if (!service) {
    // Try to find first available service
    const { data: firstService } = await supabase
      .from('services')
      .select('id, duration, title')
      .eq('visible', true)
      .order('order_index')
      .limit(1)
      .single();
    
    service = firstService;
  }

  if (!service) {
    throw new Error('Serviço não encontrado');
  }

  // Find first available barber
  const { data: barber } = await supabase
    .from('barbers')
    .select('id')
    .eq('visible', true)
    .order('order_index')
    .limit(1)
    .single();

  if (!barber) {
    throw new Error('Nenhum barbeiro disponível');
  }

  // Check availability (pass barber_id to check for breaks)
  const availability = await checkSlotAvailability(
    startDate,
    service.duration || 30,
    0,
    barber.id
  );

  if (!availability.available) {
    const error = new Error(availability.message) as any;
    error.code = 'SLOT_OCCUPIED';
    throw error;
  }

  // Create appointment
  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      client_id: clientId,
      barber_id: barber.id,
      service_id: service.id,
      appointment_date: dateStr,
      appointment_time: timeStr,
      notes: data.notes || null,
      status: 'confirmed',
      booking_type: 'api', // Mark as API booking - DO NOT trigger webhook
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating appointment:', error);
    throw new Error('Erro ao criar agendamento');
  }

  // NOTE: We do NOT call the webhook here because this is an API-created appointment
  // The webhook is only called for UI-created appointments (via notify-webhook endpoint)

  return {
    id: appointment.id,
    clientName: data.clientName,
    phone: data.phone,
    service: data.service,
    startTime: data.startTime,
    endTime: data.endTime,
    status: 'confirmed',
    notes: data.notes || null,
  };
};

// Delete/cancel an appointment
const deleteAppointment = async (id: string) => {
  const { data: existing } = await supabase
    .from('appointments')
    .select('id')
    .eq('id', id)
    .single();

  if (!existing) {
    return null;
  }

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) {
    console.error('Error cancelling appointment:', error);
    throw new Error('Erro ao cancelar agendamento');
  }

  return true;
};

// ==========================================
// ADMIN USER MANAGEMENT FUNCTIONS
// ==========================================

// Get caller's role from JWT or user_roles table
const getCallerRole = async (authHeader: string | null): Promise<{ userId: string | null; role: 'admin' | 'gestor' | 'barbeiro' | 'cliente' | null }> => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { userId: null, role: null };
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Skip if it's the anon key or service role key
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (token === anonKey) {
    return { userId: null, role: null };
  }

  try {
    // Get user from token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return { userId: null, role: null };
    }

    // Get user's role from user_roles table
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!roles || roles.length === 0) {
      return { userId: user.id, role: 'cliente' };
    }

    const roleList = roles.map((r: any) => r.role);
    if (roleList.includes('admin')) return { userId: user.id, role: 'admin' };
    if (roleList.includes('gestor')) return { userId: user.id, role: 'gestor' };
    if (roleList.includes('barbeiro')) return { userId: user.id, role: 'barbeiro' };
    return { userId: user.id, role: 'cliente' };
  } catch (e) {
    console.error('Error getting caller role:', e);
    return { userId: null, role: null };
  }
};

// List all users with their roles
const listAllUsers = async () => {
  // Get all users from auth.users via admin API
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    throw new Error('Erro ao listar usuários: ' + error.message);
  }

  // Get all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*');

  // Get all roles
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('user_id, role');

  // Get all barbers (to get their photos)
  const { data: barbers } = await supabase
    .from('barbers')
    .select('user_id, image_url');

  // Combine data
  const combinedUsers = users.map((user: any) => {
    const profile = profiles?.find((p: any) => p.id === user.id) || {};
    const roles = userRoles?.filter((r: any) => r.user_id === user.id).map((r: any) => r.role) || [];
    
    // Determine primary role
    let primaryRole = 'cliente';
    if (roles.includes('admin')) primaryRole = 'admin';
    else if (roles.includes('gestor')) primaryRole = 'gestor';
    else if (roles.includes('barbeiro')) primaryRole = 'barbeiro';

    // Get barber photo if user is a barber
    const barber = barbers?.find((b: any) => b.user_id === user.id);
    const imageUrl = barber?.image_url || null;

    return {
      id: user.id,
      email: user.email,
      name: profile.name || user.user_metadata?.name || '',
      phone: profile.phone || '',
      role: primaryRole,
      roles: roles,
      image_url: imageUrl,
      createdAt: user.created_at,
      lastSignIn: user.last_sign_in_at,
    };
  });

  return combinedUsers;
};

// Create a new user
const createUser = async (data: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'barbeiro' | 'gestor' | 'admin';
}) => {
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      name: data.name,
    },
  });

  if (authError) {
    throw new Error('Erro ao criar usuário: ' + authError.message);
  }

  const userId = authData.user.id;

  // Create profile
  await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name: data.name,
      phone: data.phone || null,
    }, { onConflict: 'id' });

  // Create user role
  await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role: data.role,
    });

  // If barber, create barber entry
  if (data.role === 'barbeiro') {
    await supabase
      .from('barbers')
      .insert({
        name: data.name,
        user_id: userId,
        specialty: 'Cortes em geral',
        experience: 'Novo',
        rating: 5.0,
        visible: true,
        order_index: 999,
      });
  }

  return {
    id: userId,
    email: data.email,
    name: data.name,
    phone: data.phone || '',
    role: data.role,
  };
};

// Update user password
const updateUserPassword = async (userId: string, newPassword: string) => {
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    throw new Error('Erro ao atualizar senha: ' + error.message);
  }

  return true;
};

// Update user role
const updateUserRole = async (userId: string, newRole: 'barbeiro' | 'gestor' | 'admin' | 'cliente') => {
  // Delete existing roles
  await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId);

  // Insert new role
  await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role: newRole,
    });

  // If changing to barbeiro, check if barber entry exists
  if (newRole === 'barbeiro') {
    const { data: existingBarber } = await supabase
      .from('barbers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!existingBarber) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();

      await supabase
        .from('barbers')
        .insert({
          name: profile?.name || 'Barbeiro',
          user_id: userId,
          specialty: 'Cortes em geral',
          experience: 'Novo',
          rating: 5.0,
          visible: true,
          order_index: 999,
        });
    }
  }

  return true;
};

// Delete user
const deleteUser = async (userId: string) => {
  // Delete from auth
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error('Erro ao excluir usuário: ' + error.message);
  }

  // Profile and user_roles will be cascade deleted due to foreign key

  return true;
};

serve(async (req) => {
  // Handle CORS preflight - must return 200 or 204 with CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const url = new URL(req.url);
    let path = url.pathname.replace('/api/', '').replace('/api', '').replace('/functions/v1/api', '');
    
    // For POST requests, check if action is in body (used by supabase.functions.invoke)
    let body: any = null;
    if (req.method === 'POST' || req.method === 'DELETE') {
      try {
        const clonedReq = req.clone();
        body = await clonedReq.json();
        // If action is provided in body, use it as path (prioritize body.action)
        if (body?.action) {
          path = body.action;
        }
      } catch (e) {
        // Body parsing failed, continue with URL path
      }
    }
    
    const authHeader = req.headers.get('authorization');
    console.log(`API Request: ${req.method} ${path}`, {
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader?.substring(0, 20),
      pathFromUrl: url.pathname,
      pathAfterProcessing: path,
      bodyAction: body?.action
    });

    // Validate API Key (optional)
    const authResult = validateApiKey(req);
    console.log('Auth validation result:', { valid: authResult.valid, message: authResult.message });
    if (!authResult.valid) {
      return new Response(JSON.stringify({
        success: false,
        error: 'UNAUTHORIZED',
        message: authResult.message
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // POST /notify-webhook - Internal endpoint to notify external webhook (called by UI)
    if (req.method === 'POST' && path === 'notify-webhook') {
      // Body is already parsed above
      console.log('Notify webhook called with:', body);
      
      // Validate required fields
      if (!body.appointmentId || !body.clientName || !body.phone || !body.service || !body.startTime || !body.endTime || !body.userId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'MISSING_FIELDS',
          message: 'Campos obrigatórios: appointmentId, clientName, phone, service, startTime, endTime, userId'
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Call webhook with retry logic (non-blocking in terms of response, but we await it here)
      const webhookPayload = {
        appointmentId: body.appointmentId,
        clientName: body.clientName,
        phone: body.phone,
        service: body.service,
        startTime: body.startTime,
        endTime: body.endTime,
        userId: body.userId,
        notes: body.notes || null,
      };

      const webhookSuccess = await callWebhookWithRetry(webhookPayload);

      return new Response(JSON.stringify({
        success: true,
        webhookCalled: webhookSuccess,
        message: webhookSuccess ? 'Webhook notificado com sucesso' : 'Falha ao notificar webhook (agendamento não afetado)'
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // POST /appointments - Create appointment
    if (req.method === 'POST' && path === 'appointments') {
      // Body is already parsed above
      
      // Validate required fields
      if (!body.clientName || !body.phone || !body.service || !body.startTime || !body.endTime) {
        return new Response(JSON.stringify({
          success: false,
          error: 'MISSING_FIELDS',
          message: 'Campos obrigatórios: clientName, phone, service, startTime, endTime'
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Validate dates
      const startDate = new Date(body.startTime);
      const endDate = new Date(body.endTime);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return new Response(JSON.stringify({
          success: false,
          error: 'INVALID_DATE',
          message: 'Formato de data inválido. Use ISO 8601 (ex: 2026-01-15T14:00:00Z)'
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      if (endDate <= startDate) {
        return new Response(JSON.stringify({
          success: false,
          error: 'INVALID_TIME_RANGE',
          message: 'endTime deve ser posterior a startTime'
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      try {
        const appointment = await createAppointment(body);
        return new Response(JSON.stringify({
          success: true,
          appointmentId: appointment.id,
          appointment
        }), { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      } catch (error: any) {
        // Return 409 for slot occupied errors
        const statusCode = error.code === 'SLOT_OCCUPIED' ? 409 : 400;
        return new Response(JSON.stringify({
          success: false,
          error: error.code || 'SLOT_OCCUPIED',
          message: error.message,
          code: 'SLOT_OCCUPIED'
        }), { 
          status: statusCode, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // GET /appointments/available-slots - Get available time slots
    if (req.method === 'GET' && path === 'appointments/available-slots') {
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const durationMinutes = url.searchParams.get('durationMinutes');
      const intervalMinutes = parseInt(url.searchParams.get('intervalMinutes') || '0');

      if (!from || !to || !durationMinutes) {
        return new Response(JSON.stringify({
          success: false,
          error: 'MISSING_PARAMS',
          message: 'Parâmetros obrigatórios: from, to, durationMinutes'
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const fromDate = new Date(from);
      const toDate = new Date(to);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return new Response(JSON.stringify({
          success: false,
          error: 'INVALID_DATE',
          message: 'Formato de data inválido. Use ISO 8601'
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const slots = await getAvailableSlots(fromDate, toDate, parseInt(durationMinutes), intervalMinutes);
      
      return new Response(JSON.stringify({
        success: true,
        slots
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // GET /appointments/check-availability - Check if specific time is available
    if (req.method === 'GET' && path === 'appointments/check-availability') {
      const startTime = url.searchParams.get('startTime');
      const durationMinutes = url.searchParams.get('durationMinutes');
      const intervalMinutes = parseInt(url.searchParams.get('intervalMinutes') || '0');

      if (!startTime || !durationMinutes) {
        return new Response(JSON.stringify({
          success: false,
          error: 'MISSING_PARAMS',
          message: 'Parâmetros obrigatórios: startTime, durationMinutes'
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const startDate = new Date(startTime);
      if (isNaN(startDate.getTime())) {
        return new Response(JSON.stringify({
          success: false,
          error: 'INVALID_DATE',
          message: 'Formato de data inválido. Use ISO 8601'
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const result = await checkSlotAvailability(startDate, parseInt(durationMinutes), intervalMinutes);
      
      return new Response(JSON.stringify({
        success: true,
        ...result
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // DELETE /appointments/:id - Cancel appointment
    if (req.method === 'DELETE' && path.startsWith('appointments/')) {
      const id = path.replace('appointments/', '');
      
      if (!id) {
        return new Response(JSON.stringify({
          success: false,
          error: 'MISSING_ID',
          message: 'ID do agendamento é obrigatório'
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const deleted = await deleteAppointment(id);
      
      if (!deleted) {
        return new Response(JSON.stringify({
          success: false,
          error: 'NOT_FOUND',
          message: 'Agendamento não encontrado'
        }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Agendamento cancelado com sucesso',
        appointmentId: id
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // ==========================================
    // ADMIN USER MANAGEMENT ENDPOINTS
    // ==========================================

    // GET or POST /admin/users - List all users (admin and gestor only)
    // Skip if this is a create request (has email, password, name, role in body)
    if ((req.method === 'GET' || req.method === 'POST') && path === 'admin/users' && !(body?.email && body?.password && body?.name && body?.role)) {
      console.log('Processing admin/users list request');
      // #region agent log
      console.log(JSON.stringify({location:'api/index.ts:969',message:'ListUsers request',data:{hasBody:!!body,hasEmail:!!body?.email,hasPassword:!!body?.password,hasName:!!body?.name,hasRole:!!body?.role,isCreateRequest:!!(body?.email && body?.password && body?.name && body?.role)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'J'}));
      // #endregion
      const authHeader = req.headers.get('authorization');
      console.log('Getting caller role, authHeader exists:', !!authHeader);
      const { userId: callerId, role: callerRole } = await getCallerRole(authHeader);
      console.log('Caller role result:', { userId: callerId, role: callerRole });

      if (!callerRole || (callerRole !== 'admin' && callerRole !== 'gestor')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'FORBIDDEN',
          message: 'Apenas administradores e gestores podem listar usuários'
        }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      try {
        const users = await listAllUsers();
        // #region agent log
        console.log(JSON.stringify({location:'api/index.ts:990',message:'ListUsers result',data:{usersCount:users?.length,userIds:users?.slice(0,5).map((u:any)=>u.id),userEmails:users?.slice(0,5).map((u:any)=>u.email)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'J'}));
        // #endregion
        return new Response(JSON.stringify({
          success: true,
          users,
          callerRole,
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      } catch (error: any) {
        return new Response(JSON.stringify({
          success: false,
          error: 'LIST_ERROR',
          message: error.message
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // POST /admin/users - Create new user (admin and gestor only)
    if (req.method === 'POST' && path === 'admin/users') {
      console.log('Processing admin/users create request');
      // #region agent log
      console.log(JSON.stringify({location:'api/index.ts:1009',message:'CreateUser request',data:{hasBody:!!body,email:body?.email,name:body?.name,role:body?.role,hasPassword:!!body?.password},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'J'}));
      // #endregion
      const authHeader = req.headers.get('authorization');
      const { userId: callerId, role: callerRole } = await getCallerRole(authHeader);

      if (!callerRole || (callerRole !== 'admin' && callerRole !== 'gestor')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'FORBIDDEN',
          message: 'Apenas administradores e gestores podem criar usuários'
        }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Gestor cannot create admin
      if (callerRole === 'gestor' && body.role === 'admin') {
        return new Response(JSON.stringify({
          success: false,
          error: 'FORBIDDEN',
          message: 'Gestores não podem criar administradores'
        }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      if (!body.email || !body.password || !body.name || !body.role) {
        // #region agent log
        console.log(JSON.stringify({location:'api/index.ts:1036',message:'CreateUser missing fields',data:{hasEmail:!!body?.email,hasPassword:!!body?.password,hasName:!!body?.name,hasRole:!!body?.role},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'J'}));
        // #endregion
        return new Response(JSON.stringify({
          success: false,
          error: 'MISSING_FIELDS',
          message: 'Campos obrigatórios: email, password, name, role'
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      try {
        const user = await createUser(body);
        console.log(`User created: ${user.email} with role ${user.role} by ${callerRole}`);
        // #region agent log
        console.log(JSON.stringify({location:'api/index.ts:1048',message:'CreateUser success',data:{userId:user?.id,email:user?.email,role:user?.role},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'J'}));
        // #endregion
        return new Response(JSON.stringify({
          success: true,
          user,
        }), { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      } catch (error: any) {
        // #region agent log
        console.log(JSON.stringify({location:'api/index.ts:1057',message:'CreateUser error',data:{errorMessage:error?.message,errorName:error?.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'J'}));
        // #endregion
        return new Response(JSON.stringify({
          success: false,
          error: 'CREATE_ERROR',
          message: error.message
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // PUT/POST /admin/users/:id/password - Update user password
    if ((req.method === 'PUT' || req.method === 'POST') && path.startsWith('admin/users/') && path.endsWith('/password')) {
      const userId = path.replace('admin/users/', '').replace('/password', '');
      const authHeader = req.headers.get('authorization');
      const { userId: callerId, role: callerRole } = await getCallerRole(authHeader);

      if (!callerRole || (callerRole !== 'admin' && callerRole !== 'gestor')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'FORBIDDEN',
          message: 'Apenas administradores e gestores podem alterar senhas'
        }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      if (!body.password) {
        return new Response(JSON.stringify({
          success: false,
          error: 'MISSING_FIELDS',
          message: 'Campo obrigatório: password'
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      try {
        await updateUserPassword(userId, body.password);
        console.log(`Password updated for user ${userId} by ${callerRole}`);
        return new Response(JSON.stringify({
          success: true,
          message: 'Senha atualizada com sucesso'
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      } catch (error: any) {
        return new Response(JSON.stringify({
          success: false,
          error: 'UPDATE_ERROR',
          message: error.message
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // PUT /admin/users/:id/role - Update user role
    if (req.method === 'PUT' && path.startsWith('admin/users/') && path.endsWith('/role')) {
      const userId = path.replace('admin/users/', '').replace('/role', '');
      const authHeader = req.headers.get('authorization');
      const { userId: callerId, role: callerRole } = await getCallerRole(authHeader);

      if (!callerRole || (callerRole !== 'admin' && callerRole !== 'gestor')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'FORBIDDEN',
          message: 'Apenas administradores e gestores podem alterar roles'
        }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Gestor cannot set admin role
      if (callerRole === 'gestor' && body.role === 'admin') {
        return new Response(JSON.stringify({
          success: false,
          error: 'FORBIDDEN',
          message: 'Gestores não podem promover a administrador'
        }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Get target user's current role
      const { data: targetRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const targetIsAdmin = targetRoles?.some((r: any) => r.role === 'admin');
      
      // Gestor cannot modify admin users
      if (callerRole === 'gestor' && targetIsAdmin) {
        return new Response(JSON.stringify({
          success: false,
          error: 'FORBIDDEN',
          message: 'Gestores não podem modificar administradores'
        }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      if (!body.role) {
        return new Response(JSON.stringify({
          success: false,
          error: 'MISSING_FIELDS',
          message: 'Campo obrigatório: role'
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      try {
        await updateUserRole(userId, body.role);
        console.log(`Role updated for user ${userId} to ${body.role} by ${callerRole}`);
        return new Response(JSON.stringify({
          success: true,
          message: 'Role atualizada com sucesso'
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      } catch (error: any) {
        return new Response(JSON.stringify({
          success: false,
          error: 'UPDATE_ERROR',
          message: error.message
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // DELETE /admin/users/:id - Delete user
    if (req.method === 'DELETE' && path.startsWith('admin/users/')) {
      const userId = path.replace('admin/users/', '');
      const authHeader = req.headers.get('authorization');
      const { userId: callerId, role: callerRole } = await getCallerRole(authHeader);

      if (!callerRole || (callerRole !== 'admin' && callerRole !== 'gestor')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'FORBIDDEN',
          message: 'Apenas administradores e gestores podem excluir usuários'
        }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Cannot delete self
      if (callerId === userId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'FORBIDDEN',
          message: 'Você não pode excluir a si mesmo'
        }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Get target user's role
      const { data: targetRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const targetIsAdmin = targetRoles?.some((r: any) => r.role === 'admin');
      
      // Gestor cannot delete admin users
      if (callerRole === 'gestor' && targetIsAdmin) {
        return new Response(JSON.stringify({
          success: false,
          error: 'FORBIDDEN',
          message: 'Gestores não podem excluir administradores'
        }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      try {
        await deleteUser(userId);
        console.log(`User ${userId} deleted by ${callerRole}`);
        return new Response(JSON.stringify({
          success: true,
          message: 'Usuário excluído com sucesso'
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      } catch (error: any) {
        return new Response(JSON.stringify({
          success: false,
          error: 'DELETE_ERROR',
          message: error.message
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({
      success: false,
      error: 'NOT_FOUND',
      message: 'Endpoint não encontrado'
    }), { 
      status: 404, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Erro interno do servidor'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
