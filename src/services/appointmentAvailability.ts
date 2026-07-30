import { supabase } from '@/integrations/supabase/client';

export type BusyAppointmentSlot = {
  appointment_time: string;
  service: { duration: number };
};

export async function getBarberBusySlots(barberId: string, date: string): Promise<BusyAppointmentSlot[]> {
  const { data, error } = await (supabase as any).rpc('get_barber_busy_slots', {
    p_barber_id: barberId,
    p_date: date,
  });

  if (error) throw error;

  return (data || []).map((row: { appointment_time: string; duration: number }) => ({
    appointment_time: String(row.appointment_time).slice(0, 5),
    service: { duration: Number(row.duration) || 30 },
  }));
}

export async function getServiceBookingCounts(): Promise<Map<string, number>> {
  const { data, error } = await (supabase as any).rpc('get_service_booking_counts');
  if (error) throw error;

  return new Map(
    (data || []).map((row: { service_id: string; booking_count: number | string }) => [
      row.service_id,
      Number(row.booking_count) || 0,
    ]),
  );
}
