import { BarberAvailability, getDayKey } from '@/hooks/useOperatingHours';
import { format } from 'date-fns';

/**
 * Check if a barber is available on a specific date based on their weekly availability
 */
export const isBarberAvailableOnDate = (
  availability: BarberAvailability | null,
  date: Date
): boolean => {
  if (!availability) return true; // If no availability set, assume available (backwards compatibility)

  const dayKey = getDayKey(date);
  const dayAvailability = availability[dayKey];

  return !dayAvailability?.closed;
};

/**
 * Get barber's available hours for a specific date
 */
export const getBarberHoursForDate = (
  availability: BarberAvailability | null,
  date: Date
): { open: string; close: string; closed: boolean } | null => {
  if (!availability) return null;

  const dayKey = getDayKey(date);
  const dayAvailability = availability[dayKey];

  return {
    open: dayAvailability?.open || '09:00',
    close: dayAvailability?.close || '20:00',
    closed: dayAvailability?.closed || false,
  };
};

/**
 * Filter barbers available on a specific date
 */
export const filterAvailableBarbers = (
  barbers: Array<{ id: string; availability?: any }>,
  date: Date
): Array<{ id: string; availability?: any }> => {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  return barbers.filter(barber => {
    if (!barber.availability) return true; // Backwards compatibility
    
    try {
      const availability = typeof barber.availability === 'string' 
        ? JSON.parse(barber.availability) 
        : barber.availability;
      
      return isBarberAvailableOnDate(availability, date);
    } catch (error) {
      console.error('Error parsing barber availability:', error);
      return true; // If error parsing, assume available
    }
  });
};
