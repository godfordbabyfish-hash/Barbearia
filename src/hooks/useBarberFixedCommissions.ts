import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BarberFixedCommission {
  id: string;
  barber_id: string;
  service_commission_percentage: number;
  product_commission_percentage: number;
  created_at: string;
  updated_at: string;
}

export const useBarberFixedCommissions = (barberId: string | null = null) => {
  const [commissions, setCommissions] = useState<BarberFixedCommission[]>([]);
  const [loading, setLoading] = useState(true);

  // Load fixed commission for a specific barber
  const loadCommission = useCallback(async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('barber_fixed_commissions')
      .select('*')
      .eq('barber_id', id)
      .maybeSingle();

    if (error) {
      console.error('Error loading fixed commission:', error);
      // Don't show error if no commission exists yet (will be created when needed)
      if (error.code !== 'PGRST116') {
        toast.error('Erro ao carregar comissão fixa');
      }
      setCommissions([]);
    } else {
      setCommissions(data ? [data] : []);
    }
    setLoading(false);
  }, []);

  // Load all fixed commissions (for managers)
  const loadAllCommissions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('barber_fixed_commissions')
      .select('*')
      .order('barber_id', { ascending: true });

    if (error) {
      console.error('Error loading all fixed commissions:', error);
      toast.error('Erro ao carregar comissões fixas');
      setCommissions([]);
    } else {
      setCommissions(data || []);
    }
    setLoading(false);
  }, []);

  // Update or create a fixed commission
  const updateFixedCommission = useCallback(async (
    barberId: string,
    servicePercentage: number,
    productPercentage: number
  ): Promise<{ error: Error | null }> => {
    if (servicePercentage < 0 || servicePercentage > 100) {
      return { error: new Error('Percentual de serviços deve estar entre 0 e 100') };
    }
    if (productPercentage < 0 || productPercentage > 100) {
      return { error: new Error('Percentual de produtos deve estar entre 0 e 100') };
    }

    // Check if commission exists
    const { data: existing } = await supabase
      .from('barber_fixed_commissions')
      .select('id')
      .eq('barber_id', barberId)
      .maybeSingle();

    let error;
    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('barber_fixed_commissions')
        .update({ 
          service_commission_percentage: servicePercentage,
          product_commission_percentage: productPercentage
        })
        .eq('id', existing.id);
      error = updateError;
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('barber_fixed_commissions')
        .insert({
          barber_id: barberId,
          service_commission_percentage: servicePercentage,
          product_commission_percentage: productPercentage,
        });
      error = insertError;
    }

    if (error) {
      console.error('Error updating fixed commission:', error);
      return { error: new Error('Erro ao salvar comissão fixa') };
    }

    // Reload commissions
    if (barberId) {
      await loadCommission(barberId);
    } else {
      await loadAllCommissions();
    }

    return { error: null };
  }, [loadCommission, loadAllCommissions]);

  // Get service commission percentage for a specific barber
  const getServiceCommissionPercentage = useCallback((
    barberId: string
  ): number => {
    const commission = commissions.find(c => c.barber_id === barberId);
    return commission?.service_commission_percentage ?? 0;
  }, [commissions]);

  // Get product commission percentage for a specific barber
  const getProductCommissionPercentage = useCallback((
    barberId: string
  ): number => {
    const commission = commissions.find(c => c.barber_id === barberId);
    return commission?.product_commission_percentage ?? 0;
  }, [commissions]);

  // Calculate service commission value for a specific barber
  const calculateServiceCommission = useCallback((
    barberId: string,
    servicePrice: number
  ): number => {
    const percentage = getServiceCommissionPercentage(barberId);
    if (!percentage || percentage === 0) return 0;
    return (servicePrice * percentage) / 100;
  }, [getServiceCommissionPercentage]);

  // Calculate product commission value for a specific barber
  const calculateProductCommission = useCallback((
    barberId: string,
    productPrice: number
  ): number => {
    const percentage = getProductCommissionPercentage(barberId);
    if (!percentage || percentage === 0) return 0;
    return (productPrice * percentage) / 100;
  }, [getProductCommissionPercentage]);

  // Load commissions on mount
  useEffect(() => {
    if (barberId) {
      loadCommission(barberId);
    }
    // For managers loading all commissions, they should call loadAllCommissions manually
  }, [barberId, loadCommission]);

  return {
    commissions,
    loading,
    loadCommission,
    loadAllCommissions,
    updateFixedCommission,
    getServiceCommissionPercentage,
    getProductCommissionPercentage,
    calculateServiceCommission,
    calculateProductCommission,
  };
};
