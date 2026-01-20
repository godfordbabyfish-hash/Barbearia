import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BarberCommission {
  id: string;
  barber_id: string;
  service_id: string;
  commission_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface CommissionData {
  barber_id: string;
  service_id: string;
  commission_percentage: number;
}

export const useBarberCommissions = (barberId: string | null = null) => {
  const [commissions, setCommissions] = useState<BarberCommission[]>([]);
  const [loading, setLoading] = useState(true);

  // Load commissions for a specific barber
  const loadCommissions = useCallback(async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('barber_commissions')
      .select('*')
      .eq('barber_id', id)
      .order('service_id', { ascending: true });

    if (error) {
      console.error('Error loading commissions:', error);
      toast.error('Erro ao carregar comissões');
      setCommissions([]);
    } else {
      setCommissions(data || []);
    }
    setLoading(false);
  }, []);

  // Load all commissions (for managers)
  const loadAllCommissions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('barber_commissions')
      .select('*')
      .order('barber_id', { ascending: true })
      .order('service_id', { ascending: true });

    if (error) {
      console.error('Error loading all commissions:', error);
      toast.error('Erro ao carregar comissões');
      setCommissions([]);
    } else {
      setCommissions(data || []);
    }
    setLoading(false);
  }, []);

  // Update or create a commission
  const updateCommission = useCallback(async (
    barberId: string,
    serviceId: string,
    percentage: number
  ): Promise<{ error: Error | null }> => {
    if (percentage < 0 || percentage > 100) {
      return { error: new Error('Percentual deve estar entre 0 e 100') };
    }

    // Check if commission exists
    const { data: existing } = await supabase
      .from('barber_commissions')
      .select('id')
      .eq('barber_id', barberId)
      .eq('service_id', serviceId)
      .maybeSingle();

    let error;
    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('barber_commissions')
        .update({ commission_percentage: percentage })
        .eq('id', existing.id);
      error = updateError;
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('barber_commissions')
        .insert({
          barber_id: barberId,
          service_id: serviceId,
          commission_percentage: percentage,
        });
      error = insertError;
    }

    if (error) {
      console.error('Error updating commission:', error);
      return { error: new Error('Erro ao salvar comissão') };
    }

    // Reload commissions
    if (barberId) {
      await loadCommissions(barberId);
    } else {
      await loadAllCommissions();
    }

    return { error: null };
  }, [loadCommissions, loadAllCommissions]);

  // Calculate commission value for a specific barber and service
  const calculateCommission = useCallback((
    barberId: string,
    serviceId: string,
    servicePrice: number
  ): number => {
    const commission = commissions.find(
      c => c.barber_id === barberId && c.service_id === serviceId
    );

    if (!commission) return 0;

    return (servicePrice * commission.commission_percentage) / 100;
  }, [commissions]);

  // Get commission percentage for a specific barber and service
  const getCommissionPercentage = useCallback((
    barberId: string,
    serviceId: string
  ): number => {
    const commission = commissions.find(
      c => c.barber_id === barberId && c.service_id === serviceId
    );

    return commission?.commission_percentage ?? 0;
  }, [commissions]);

  // Load commissions on mount
  useEffect(() => {
    if (barberId) {
      loadCommissions(barberId);
    }
    // For managers loading all commissions, they should call loadAllCommissions manually
  }, [barberId, loadCommissions]);

  return {
    commissions,
    loading,
    loadCommissions,
    loadAllCommissions,
    updateCommission,
    calculateCommission,
    getCommissionPercentage,
  };
};
