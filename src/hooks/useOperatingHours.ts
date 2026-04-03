import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
  lunchStart?: string;
  lunchEnd?: string;
  hasLunchBreak?: boolean;
}

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export const defaultOperatingHours: OperatingHours = {
  monday: { open: '09:00', close: '20:00', closed: false, lunchStart: '12:00', lunchEnd: '13:00', hasLunchBreak: false },
  tuesday: { open: '09:00', close: '20:00', closed: false, lunchStart: '12:00', lunchEnd: '13:00', hasLunchBreak: false },
  wednesday: { open: '09:00', close: '20:00', closed: false, lunchStart: '12:00', lunchEnd: '13:00', hasLunchBreak: false },
  thursday: { open: '09:00', close: '20:00', closed: false, lunchStart: '12:00', lunchEnd: '13:00', hasLunchBreak: false },
  friday: { open: '09:00', close: '20:00', closed: false, lunchStart: '12:00', lunchEnd: '13:00', hasLunchBreak: false },
  saturday: { open: '09:00', close: '18:00', closed: false, lunchStart: '12:00', lunchEnd: '13:00', hasLunchBreak: false },
  sunday: { open: '09:00', close: '18:00', closed: true, lunchStart: '12:00', lunchEnd: '13:00', hasLunchBreak: false },
};

export const dayNames: Record<keyof OperatingHours, string> = {
  sunday: 'Domingo',
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
};

export const dayOrder: (keyof OperatingHours)[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
];

// Maps JS Date.getDay() (0-6, Sunday=0) to our day keys
export const getDayKey = (date: Date): keyof OperatingHours => {
  const dayIndex = date.getDay();
  return dayOrder[dayIndex];
};

export const useOperatingHours = () => {
  const [operatingHours, setOperatingHours] = useState<OperatingHours>(defaultOperatingHours);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOperatingHours();
  }, []);

  const loadOperatingHours = async () => {
    const { data, error } = await supabase
      .from('site_config')
      .select('config_value')
      .eq('config_key', 'operating_hours')
      .maybeSingle();

    if (!error && data) {
      setOperatingHours(data.config_value as unknown as OperatingHours);
    }
    setLoading(false);
  };

  const saveOperatingHours = async (hours: OperatingHours) => {
    const { error } = await supabase
      .from('site_config')
      .upsert({
        config_key: 'operating_hours',
        config_value: hours as any,
      }, { onConflict: 'config_key' });

    if (!error) {
      setOperatingHours(hours);
    }
    return { error };
  };

  // Generate time slots based on operating hours for a specific date
  const getTimeSlotsForDate = (date: Date): string[] => {
    const dayKey = getDayKey(date);
    const dayHours = operatingHours[dayKey];

    if (dayHours.closed) return [];

    const slots: string[] = [];
    const [openHour, openMin] = dayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = dayHours.close.split(':').map(Number);
    
    // Parse lunch break times if enabled
    let lunchStartTime = 0;
    let lunchEndTime = 0;
    if (dayHours.hasLunchBreak && dayHours.lunchStart && dayHours.lunchEnd) {
      const [lunchStartHour, lunchStartMin] = dayHours.lunchStart.split(':').map(Number);
      const [lunchEndHour, lunchEndMin] = dayHours.lunchEnd.split(':').map(Number);
      lunchStartTime = lunchStartHour * 60 + lunchStartMin;
      lunchEndTime = lunchEndHour * 60 + lunchEndMin;
    }
    
    let currentHour = openHour;
    let currentMin = openMin;
    
    const closeTime = closeHour * 60 + closeMin;
    
    // O loop deve ser estritamente MENOR que o horário de fechamento.
    // Se fecha às 20:00, o último slot de início deve ser 19:30 (ou anterior dependendo do intervalo).
    while (currentHour * 60 + currentMin < closeTime) {
      const currentTime = currentHour * 60 + currentMin;
      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      
      // Skip lunch break slots
      const isDuringLunch = dayHours.hasLunchBreak && 
        currentTime >= lunchStartTime && 
        currentTime < lunchEndTime;
      
      if (!isDuringLunch) {
        slots.push(timeStr);
      }
      
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour += 1;
      }
    }
    
    return slots;
  };

  const isDateOpen = (date: Date): boolean => {
    const dayKey = getDayKey(date);
    return !operatingHours[dayKey].closed;
  };

  return {
    operatingHours,
    setOperatingHours,
    saveOperatingHours,
    getTimeSlotsForDate,
    isDateOpen,
    loading,
  };
};
