/**
 * Barber Availability Checking Utilities
 * 
 * This module provides core functions for checking barber availability
 * considering appointments, breaks, and service duration.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface Appointment {
  appointment_time: string;
  service?: {
    duration?: number;
  };
}

export interface BarberBreak {
  start_time: string;
  end_time: string;
}

export interface Barber {
  id: string;
  name: string;
  specialty: string;
  image_url?: string;
  rating?: number;
  availability?: any;
}

export interface SlotAvailability {
  time: string;
  availableBarberIds: string[];
  availableCount: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Add minutes to a time string and return new time string
 */
const addMinutesToTime = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
};

/**
 * Check if two time ranges overlap
 * Range 1: [start1, end1)
 * Range 2: [start2, end2)
 * Overlap occurs if: start1 < end2 AND end1 > start2
 */
const timeRangesOverlap = (
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean => {
  return start1 < end2 && end1 > start2;
};

// ============================================================================
// Core Availability Functions
// ============================================================================

/**
 * Check if a specific barber is available for a time slot
 * 
 * @param barberId - The barber's ID
 * @param date - The date in YYYY-MM-DD format
 * @param time - The time slot in HH:MM format
 * @param duration - Service duration in minutes
 * @param appointments - Array of existing appointments for this barber on this date
 * @param breaks - Array of breaks for this barber on this date
 * @returns true if barber is available, false otherwise
 * 
 * Requirements: 1.1, 1.3, 1.4, 3.1
 */
export const checkBarberAvailableForSlot = (
  barberId: string,
  date: string,
  time: string,
  duration: number,
  appointments: Appointment[],
  breaks: BarberBreak[]
): boolean => {
  // Calculate end time for the requested slot
  const slotEndTime = addMinutesToTime(time, duration);

  // Check for conflicts with existing appointments
  const hasAppointmentConflict = appointments.some((apt) => {
    const aptDuration = apt.service?.duration || 30;
    const aptEndTime = addMinutesToTime(apt.appointment_time, aptDuration);
    
    // Check if time ranges overlap
    return timeRangesOverlap(time, slotEndTime, apt.appointment_time, aptEndTime);
  });

  if (hasAppointmentConflict) {
    return false;
  }

  // Check for conflicts with breaks
  const hasBreakConflict = breaks.some((breakItem) => {
    return timeRangesOverlap(
      time,
      slotEndTime,
      breakItem.start_time,
      breakItem.end_time
    );
  });

  if (hasBreakConflict) {
    return false;
  }

  // No conflicts found - barber is available
  return true;
};

/**
 * Get list of available barbers for a specific time slot
 * 
 * @param barbers - Array of all barbers
 * @param date - The date in YYYY-MM-DD format
 * @param time - The time slot in HH:MM format
 * @param serviceId - The service ID (used to get duration)
 * @param appointments - Map of barber ID to their appointments for this date
 * @param breaks - Map of barber ID to their breaks for this date
 * @param serviceDuration - Duration of the service in minutes
 * @returns Array of barber IDs that are available for this slot
 * 
 * Requirements: 2.1, 3.1
 */
export const getAvailableBarbersForSlot = (
  barbers: Barber[],
  date: string,
  time: string,
  serviceId: string,
  appointments: Map<string, Appointment[]>,
  breaks: Map<string, BarberBreak[]>,
  serviceDuration: number
): string[] => {
  const availableBarberIds: string[] = [];

  for (const barber of barbers) {
    const barberAppointments = appointments.get(barber.id) || [];
    const barberBreaks = breaks.get(barber.id) || [];

    const isAvailable = checkBarberAvailableForSlot(
      barber.id,
      date,
      time,
      serviceDuration,
      barberAppointments,
      barberBreaks
    );

    if (isAvailable) {
      availableBarberIds.push(barber.id);
    }
  }

  return availableBarberIds;
};

/**
 * Calculate availability metadata for multiple time slots
 * 
 * This function checks all barbers for each time slot and returns
 * availability information including which barbers are available
 * and how many barbers are available per slot.
 * 
 * @param barbers - Array of all barbers
 * @param date - The date in YYYY-MM-DD format
 * @param timeSlots - Array of time slots in HH:MM format
 * @param serviceId - The service ID (used to get duration)
 * @param appointments - Map of barber ID to their appointments for this date
 * @param breaks - Map of barber ID to their breaks for this date
 * @param serviceDuration - Duration of the service in minutes
 * @returns Array of SlotAvailability objects with availability metadata
 * 
 * Requirements: 1.1, 1.3, 1.4, 2.1, 2.4
 */
export const calculateSlotAvailability = (
  barbers: Barber[],
  date: string,
  timeSlots: string[],
  serviceId: string,
  appointments: Map<string, Appointment[]>,
  breaks: Map<string, BarberBreak[]>,
  serviceDuration: number
): SlotAvailability[] => {
  const slotsWithAvailability: SlotAvailability[] = [];

  for (const time of timeSlots) {
    const availableBarberIds = getAvailableBarbersForSlot(
      barbers,
      date,
      time,
      serviceId,
      appointments,
      breaks,
      serviceDuration
    );

    // Only include slots where at least one barber is available
    // Requirement 1.1: Show slot as available if at least 1 barber is free
    if (availableBarberIds.length > 0) {
      slotsWithAvailability.push({
        time,
        availableBarberIds,
        availableCount: availableBarberIds.length,
      });
    }
  }

  return slotsWithAvailability;
};
