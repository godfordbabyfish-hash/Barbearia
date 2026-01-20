import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { OperatingHours, DayHours } from '@/hooks/useOperatingHours';

export interface BarberAvailability extends OperatingHours {}

export const defaultBarberAvailability: BarberAvailability = {
  monday: { open: '09:00', close: '20:00', closed: false },
  tuesday: { open: '09:00', close: '20:00', closed: false },
  wednesday: { open: '09:00', close: '20:00', closed: false },
  thursday: { open: '09:00', close: '20:00', closed: false },
  friday: { open: '09:00', close: '20:00', closed: false },
  saturday: { open: '09:00', close: '18:00', closed: false },
  sunday: { open: '09:00', close: '18:00', closed: true },
};

export const useBarberAvailability = (barberId: string | null) => {
  const [availability, setAvailability] = useState<BarberAvailability>(defaultBarberAvailability);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (barberId) {
      loadAvailability();
    } else {
      setAvailability(defaultBarberAvailability);
      setLoading(false);
    }
  }, [barberId]);

  const loadAvailability = async () => {
    if (!barberId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('barbers')
      .select('availability')
      .eq('id', barberId)
      .maybeSingle();

    if (error) {
      console.error('Error loading barber availability:', error);
      setAvailability(defaultBarberAvailability);
    } else if (data?.availability) {
      // Merge with defaults to ensure all days are present
      setAvailability({ ...defaultBarberAvailability, ...data.availability });
    } else {
      setAvailability(defaultBarberAvailability);
    }
    setLoading(false);
  };

  const updateAvailability = async (newAvailability: BarberAvailability): Promise<{ error: Error | null }> => {
    if (!barberId) {
      return { error: new Error('Barber ID is required') };
    }

    const { error } = await supabase
      .from('barbers')
      .update({ availability: newAvailability as any })
      .eq('id', barberId);

    if (!error) {
      setAvailability(newAvailability);
    }

    return { error };
  };

  const updateDayAvailability = async (dayKey: keyof BarberAvailability, dayHours: DayHours): Promise<{ error: Error | null }> => {
    const newAvailability = { ...availability, [dayKey]: dayHours };
    return updateAvailability(newAvailability);
  };

  return {
    availability,
    loading,
    loadAvailability,
    updateAvailability,
    updateDayAvailability,
  };
};
