import { format } from "date-fns";

export interface AppointmentSlotInfo {
  appointment_time: string;
  duration?: number;
}

export interface BarberBreak {
  start_time: string;
  end_time: string;
}

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = String(time || "00:00").split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

/**
 * Returns available time slots for a specific barber on a date.
 * Uses operating hours slots and removes slots occupied by the barber's appointments.
 */
export function getAvailableSlotsForBarber(
  date: Date,
  getTimeSlotsForDate: (date: Date) => string[],
  barberAppointmentsOnDate: AppointmentSlotInfo[],
  options?: { 
    filterPastSlots?: boolean; 
    breaks?: BarberBreak[];
    workingHours?: { open: string; close: string };
  }
): string[] {
  const filterPast = options?.filterPastSlots !== false;
  const todayStr = format(date, "yyyy-MM-dd");
  const now = new Date();
  const isToday = format(now, "yyyy-MM-dd") === todayStr;
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  let allSlots = getTimeSlotsForDate(date);

  // Filter slots based on barber's working hours if provided
  if (options?.workingHours) {
    const { open, close } = options.workingHours;
    allSlots = allSlots.filter(slot => slot >= open && slot < close);
  }

  const slots = filterPast && isToday
    ? allSlots.filter((slot) => {
        const [hour, minute] = slot.split(":").map(Number);
        // Permitir agendar o slot atual se ainda estivermos nos primeiros 10 minutos dele
        // Por exemplo, se agora é 15:05, ainda permitir o slot das 15:00
        const slotTotalMinutes = hour * 60 + minute;
        const nowTotalMinutes = currentHour * 60 + currentMinute;
        return slotTotalMinutes >= (nowTotalMinutes - 10);
      })
    : [...allSlots];

  return slots.filter((slot) => {
    const slotStart = timeToMinutes(slot);
    const slotEnd = slotStart + 30;

    const overlapsAppointment = barberAppointmentsOnDate.some((apt) => {
      const aptStart = timeToMinutes(apt.appointment_time);
      const aptEnd = aptStart + (apt.duration ?? 30);
      return slotStart < aptEnd && slotEnd > aptStart;
    });

    if (overlapsAppointment) {
      return false;
    }

    const overlapsBreak = (options?.breaks || []).some((br) => {
      const breakStart = timeToMinutes(br.start_time);
      const breakEnd = timeToMinutes(br.end_time);
      return slotStart < breakEnd && slotEnd > breakStart;
    });

    return !overlapsBreak;
  });
}
