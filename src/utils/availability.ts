import { format, addMinutes } from "date-fns";

export interface AppointmentSlotInfo {
  appointment_time: string;
  duration?: number;
}

export interface BarberBreak {
  start_time: string;
  end_time: string;
}

/**
 * Returns available time slots for a specific barber on a date.
 * Uses operating hours slots and removes slots occupied by the barber's appointments.
 */
export function getAvailableSlotsForBarber(
  date: Date,
  getTimeSlotsForDate: (date: Date) => string[],
  barberAppointmentsOnDate: AppointmentSlotInfo[],
  options?: { filterPastSlots?: boolean; breaks?: BarberBreak[] }
): string[] {
  const filterPast = options?.filterPastSlots !== false;
  const todayStr = format(date, "yyyy-MM-dd");
  const now = new Date();
  const isToday = format(now, "yyyy-MM-dd") === todayStr;
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const allSlots = getTimeSlotsForDate(date);

  const slots = filterPast && isToday
    ? allSlots.filter((slot) => {
        const [hour, minute] = slot.split(":").map(Number);
        return hour > currentHour || (hour === currentHour && minute > currentMinute);
      })
    : [...allSlots];

  const bookedSlots = new Set<string>();
  barberAppointmentsOnDate.forEach((apt) => {
    const startTime = apt.appointment_time;
    const duration = apt.duration ?? 30;
    const [hours, minutes] = startTime.split(":").map(Number);
    let currentSlotTime = new Date(date);
    currentSlotTime.setHours(hours, minutes, 0, 0);

    for (let i = 0; i < Math.ceil(duration / 30); i++) {
      bookedSlots.add(format(currentSlotTime, "HH:mm"));
      currentSlotTime = addMinutes(currentSlotTime, 30);
    }
  });

  const breakSlots = new Set<string>();
  if (options?.breaks && options.breaks.length > 0) {
    options.breaks.forEach((br) => {
      const [startH, startM] = br.start_time.split(":").map(Number);
      const [endH, endM] = br.end_time.split(":").map(Number);
      let cursor = new Date(date);
      cursor.setHours(startH, startM, 0, 0);
      const end = new Date(date);
      end.setHours(endH, endM, 0, 0);
      while (cursor < end) {
        breakSlots.add(format(cursor, "HH:mm"));
        cursor = addMinutes(cursor, 30);
      }
      // Bloquear também o slot que inicia exatamente no fim da pausa
      breakSlots.add(br.end_time);
    });
  }

  return slots.filter((slot) => !bookedSlots.has(slot) && !breakSlots.has(slot));
}
