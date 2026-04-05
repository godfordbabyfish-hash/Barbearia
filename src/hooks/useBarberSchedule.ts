import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDayKey, OperatingHours, DayHours } from './useOperatingHours';

export interface BarberDaySchedule {
  open: string;
  close: string;
  closed: boolean;
  observation?: string;
}

export const useBarberSchedule = (barberId: string | null, date: Date | null) => {
  const [schedule, setSchedule] = useState<BarberDaySchedule | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (barberId && date) {
      loadSchedule();
    }
  }, [barberId, date?.toISOString().split('T')[0]]);

  const loadSchedule = async () => {
    if (!barberId || !date) return;
    setLoading(true);

    try {
      const dateStr = date.toISOString().split('T')[0];
      const dayKey = getDayKey(date);

      // 1. Try to get specific day schedule from barber_schedules
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('barber_schedules' as any)
        .select('*')
        .eq('barber_id', barberId)
        .eq('date', dateStr)
        .maybeSingle();

      if (!monthlyError && monthlyData) {
        setSchedule({
          open: monthlyData.open,
          close: monthlyData.close,
          closed: monthlyData.closed,
          observation: monthlyData.observation
        });
        setLoading(false);
        return;
      }

      // 2. Try to get weekly availability from barbers table
      const { data: barberData, error: barberError } = await supabase
        .from('barbers')
        .select('availability')
        .eq('id', barberId)
        .maybeSingle();

      if (!barberError && barberData?.availability) {
        const availability = (typeof barberData.availability === 'string' 
          ? JSON.parse(barberData.availability) 
          : barberData.availability) as OperatingHours;
        
        const dayAvailability = availability[dayKey];
        if (dayAvailability) {
          setSchedule({
            open: dayAvailability.open,
            close: dayAvailability.close,
            closed: dayAvailability.closed,
          });
          setLoading(false);
          return;
        }
      }

      // 3. Fallback to site configuration
      const { data: shopData, error: shopError } = await supabase
        .from('site_config')
        .select('config_value')
        .eq('config_key', 'operating_hours')
        .maybeSingle();

      if (!shopError && shopData?.config_value) {
        const shopHours = shopData.config_value as unknown as OperatingHours;
        const dayHours = shopHours[dayKey];
        if (dayHours) {
          setSchedule({
            open: dayHours.open,
            close: dayHours.close,
            closed: dayHours.closed,
          });
          setLoading(false);
          return;
        }
      }

      // 4. Ultimate default
      setSchedule({
        open: '09:00',
        close: '20:00',
        closed: dayKey === 'sunday',
      });

    } catch (e) {
      console.error('Error loading barber schedule:', e);
    } finally {
      setLoading(false);
    }
  };

  return { schedule, loading, reload: loadSchedule };
};
