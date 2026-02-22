import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BarberBreak {
  id: string;
  barber_id: string;
  date: string;
  start_time: string;
  end_time: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConflictInfo {
  hasConflict: boolean;
  appointment?: {
    clientName: string;
    serviceTitle: string;
    appointmentTime: string;
    appointmentEndTime: string;
  };
}

export const useBarberBreaks = (barberId: string | null) => {
  const [breaks, setBreaks] = useState<BarberBreak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (barberId) {
      loadBreaks();
    } else {
      setBreaks([]);
      setLoading(false);
    }
  }, [barberId]);

  const loadBreaks = async () => {
    if (!barberId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('barber_breaks')
      .select('*')
      .eq('barber_id', barberId)
      .gte('date', new Date().toISOString().split('T')[0]) // Only future breaks
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      // Ignore 404/table not found errors (table might not exist) - this is expected if table doesn't exist yet
      if (error.code === 'PGRST116' || error.code === 'PGRST205' || error.code === '42P01') {
        // Silently ignore - table doesn't exist yet
        setBreaks([]);
      } else {
        console.error('Error loading breaks:', error);
        setBreaks([]);
      }
    } else {
      setBreaks(data || []);
    }
    setLoading(false);
  };

  const checkConflict = async (
    barberId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBreakId?: string
  ): Promise<ConflictInfo> => {
    // Convert times to minutes for comparison
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const pauseStartMinutes = timeToMinutes(startTime);
    const pauseEndMinutes = timeToMinutes(endTime);

    // Query appointments for the date
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        appointment_time,
        client_name,
        service:services(duration, title)
      `)
      .eq('barber_id', barberId)
      .eq('appointment_date', date)
      .in('status', ['confirmed', 'pending']); // Only check active appointments

    if (error) {
      console.error('Error checking conflicts:', error);
      return { hasConflict: false };
    }

    // Check each appointment for overlap
    for (const apt of appointments || []) {
      if (!apt.service || !apt.appointment_time) continue;

      const aptStartMinutes = timeToMinutes(apt.appointment_time);
      const aptDuration = apt.service.duration || 30;
      const aptEndMinutes = aptStartMinutes + aptDuration;

      // Check if pause overlaps with appointment
      // Overlap occurs if: pause_start < apt_end AND pause_end > apt_start
      if (pauseStartMinutes < aptEndMinutes && pauseEndMinutes > aptStartMinutes) {
        const minutesToTime = (minutes: number): string => {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        };

        return {
          hasConflict: true,
          appointment: {
            clientName: apt.client_name || 'Cliente',
            serviceTitle: apt.service.title || 'Serviço',
            appointmentTime: apt.appointment_time,
            appointmentEndTime: minutesToTime(aptEndMinutes),
          },
        };
      }
    }

    return { hasConflict: false };
  };

  const createBreak = async (
    barberId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<{ error: Error | null }> => {
    // Validate times
    if (endTime <= startTime) {
      return { error: new Error('Horário de fim deve ser maior que horário de início') };
    }

    // Check for conflicts before creating
    const conflict = await checkConflict(barberId, date, startTime, endTime);
    if (conflict.hasConflict && conflict.appointment) {
      return {
        error: new Error(
          `Não é possível criar pausa. Cliente ${conflict.appointment.clientName} tem agendamento de ${conflict.appointment.serviceTitle} das ${conflict.appointment.appointmentTime} às ${conflict.appointment.appointmentEndTime}`
        ),
      };
    }

    const { error } = await supabase
      .from('barber_breaks')
      .insert([{
        barber_id: barberId,
        date,
        start_time: startTime,
        end_time: endTime,
      }])
      .select()
      .single();

    if (!error) {
      await loadBreaks();
    }

    return { error };
  };

  const updateBreak = async (
    breakId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<{ error: Error | null }> => {
    // Get the break to find barber_id
    const breakData = breaks.find(b => b.id === breakId);
    if (!breakData) {
      return { error: new Error('Pausa não encontrada') };
    }

    // Validate times
    if (endTime <= startTime) {
      return { error: new Error('Horário de fim deve ser maior que horário de início') };
    }

    // Check for conflicts before updating (exclude current break)
    const conflict = await checkConflict(breakData.barber_id, date, startTime, endTime, breakId);
    if (conflict.hasConflict && conflict.appointment) {
      return {
        error: new Error(
          `Não é possível atualizar pausa. Cliente ${conflict.appointment.clientName} tem agendamento de ${conflict.appointment.serviceTitle} das ${conflict.appointment.appointmentTime} às ${conflict.appointment.appointmentEndTime}`
        ),
      };
    }

    const { error } = await supabase
      .from('barber_breaks')
      .update({
        date,
        start_time: startTime,
        end_time: endTime,
      })
      .eq('id', breakId);

    if (!error) {
      await loadBreaks();
    }

    return { error };
  };

  const deleteBreak = async (breakId: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase
      .from('barber_breaks')
      .delete()
      .eq('id', breakId);

    if (!error) {
      await loadBreaks();
    }

    return { error };
  };

  const getBreaksForDate = (date: string): BarberBreak[] => {
    return breaks.filter(b => b.date === date);
  };

  return {
    breaks,
    loading,
    loadBreaks,
    createBreak,
    updateBreak,
    deleteBreak,
    checkConflict,
    getBreaksForDate,
  };
};
