import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';

export type BusyAppointmentSlot = {
  appointment_time: string;
  service: { duration: number };
};

const availabilityKeys = {
  busySlots: (barberId: string, date: string) => ['booking-availability', 'busy-slots', barberId, date] as const,
  breaks: (barberId: string, date: string) => ['booking-availability', 'breaks', barberId, date] as const,
  schedule: (barberId: string, date: string) => ['booking-availability', 'schedule', barberId, date] as const,
  barber: (barberId: string) => ['booking-availability', 'barber', barberId] as const,
};

type QueryResult<T> = { data: T | null; error: { code?: string; message?: string } | null };

export async function getBarberBusySlots(
  barberId: string,
  date: string,
  fresh = false,
): Promise<BusyAppointmentSlot[]> {
  return queryClient.fetchQuery({
    queryKey: availabilityKeys.busySlots(barberId, date),
    staleTime: fresh ? 0 : 1_500,
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_barber_busy_slots', {
        p_barber_id: barberId,
        p_date: date,
      });

      if (error) throw error;

      return (data || []).map((row: { appointment_time: string; duration: number }) => ({
        appointment_time: String(row.appointment_time).slice(0, 5),
        service: { duration: Number(row.duration) || 30 },
      }));
    },
  });
}

export async function getBarberBreaks(
  barberId: string,
  date: string,
  fresh = false,
): Promise<QueryResult<{ start_time: string; end_time: string }[]>> {
  return queryClient.fetchQuery({
    queryKey: availabilityKeys.breaks(barberId, date),
    staleTime: fresh ? 0 : 15_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('barber_breaks')
        .select('start_time, end_time')
        .eq('barber_id', barberId)
        .eq('date', date);

      if (error) throw error;
      return { data: data || [], error: null };
    },
  });
}

export async function getBarberSchedule(
  barberId: string,
  date: string,
  fresh = false,
): Promise<QueryResult<any>> {
  return queryClient.fetchQuery({
    queryKey: availabilityKeys.schedule(barberId, date),
    staleTime: fresh ? 0 : 30_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('barber_schedules')
        .select('*')
        .eq('barber_id', barberId)
        .eq('date', date)
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    },
  });
}

export async function getBarberWeeklyAvailability(barberId: string, fresh = false): Promise<QueryResult<any>> {
  return queryClient.fetchQuery({
    queryKey: availabilityKeys.barber(barberId),
    staleTime: fresh ? 0 : 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('barbers')
        .select('availability')
        .eq('id', barberId)
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    },
  });
}

export function invalidateBarberBusySlots(barberId: string, date?: string) {
  void queryClient.invalidateQueries({
    queryKey: date
      ? availabilityKeys.busySlots(barberId, date)
      : ['booking-availability', 'busy-slots', barberId],
  });
}

export function invalidateBarberBreaks(barberId: string, date?: string) {
  void queryClient.invalidateQueries({
    queryKey: date
      ? availabilityKeys.breaks(barberId, date)
      : ['booking-availability', 'breaks', barberId],
  });
}

export function invalidateBarberSchedule(barberId: string, date?: string) {
  void queryClient.invalidateQueries({
    queryKey: date
      ? availabilityKeys.schedule(barberId, date)
      : ['booking-availability', 'schedule', barberId],
  });
}

export function invalidateBarberWeeklyAvailability(barberId: string) {
  void queryClient.invalidateQueries({ queryKey: availabilityKeys.barber(barberId) });
}

export function invalidateBarberAvailability(barberId: string, date?: string) {
  invalidateBarberBusySlots(barberId, date);
  invalidateBarberBreaks(barberId, date);
  invalidateBarberSchedule(barberId, date);
  invalidateBarberWeeklyAvailability(barberId);
}
