import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BarberProductCommission {
  id: string;
  barber_id: string;
  product_id: string;
  commission_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface ProductCommissionData {
  barber_id: string;
  product_id: string;
  commission_percentage: number;
}

export const useBarberProductCommissions = (barberId: string | null = null) => {
  const [commissions, setCommissions] = useState<BarberProductCommission[]>([]);
  const [loading, setLoading] = useState(true);

  // Load commissions for a specific barber
  const loadCommissions = useCallback(async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('barber_product_commissions')
      .select('*')
      .eq('barber_id', id)
      .order('product_id', { ascending: true });

    if (error) {
      console.error('Error loading product commissions:', error);
      toast.error('Erro ao carregar comissões de produtos');
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
      .from('barber_product_commissions')
      .select('*')
      .order('barber_id', { ascending: true })
      .order('product_id', { ascending: true });

    if (error) {
      console.error('Error loading all product commissions:', error);
      toast.error('Erro ao carregar comissões de produtos');
      setCommissions([]);
    } else {
      setCommissions(data || []);
    }
    setLoading(false);
  }, []);

  // Update or create a commission
  const updateCommission = useCallback(async (
    barberId: string,
    productId: string,
    percentage: number
  ): Promise<{ error: Error | null }> => {
    if (percentage < 0 || percentage > 100) {
      return { error: new Error('Percentual deve estar entre 0 e 100') };
    }

    // Check if commission exists
    const { data: existing } = await supabase
      .from('barber_product_commissions')
      .select('id')
      .eq('barber_id', barberId)
      .eq('product_id', productId)
      .maybeSingle();

    let error;
    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('barber_product_commissions')
        .update({ commission_percentage: percentage })
        .eq('id', existing.id);
      error = updateError;
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('barber_product_commissions')
        .insert({
          barber_id: barberId,
          product_id: productId,
          commission_percentage: percentage,
        });
      error = insertError;
    }

    if (error) {
      console.error('Error updating product commission:', error);
      return { error: new Error('Erro ao salvar comissão de produto') };
    }

    // Reload commissions
    if (barberId) {
      await loadCommissions(barberId);
    } else {
      await loadAllCommissions();
    }

    return { error: null };
  }, [loadCommissions, loadAllCommissions]);

  // Calculate commission value for a specific barber and product
  const calculateCommission = useCallback((
    barberId: string,
    productId: string,
    productPrice: number
  ): number => {
    const commission = commissions.find(
      c => c.barber_id === barberId && c.product_id === productId
    );

    if (!commission) return 0;

    return (productPrice * commission.commission_percentage) / 100;
  }, [commissions]);

  // Get commission percentage for a specific barber and product
  const getCommissionPercentage = useCallback((
    barberId: string,
    productId: string
  ): number => {
    const commission = commissions.find(
      c => c.barber_id === barberId && c.product_id === productId
    );

    return commission?.commission_percentage ?? 0;
  }, [commissions]);

  // Delete a commission
  const deleteCommission = useCallback(async (
    barberId: string,
    productId: string
  ): Promise<{ error: Error | null }> => {
    const { error } = await supabase
      .from('barber_product_commissions')
      .delete()
      .eq('barber_id', barberId)
      .eq('product_id', productId);

    if (error) {
      console.error('Error deleting product commission:', error);
      return { error: new Error('Erro ao deletar comissão de produto') };
    }

    // Reload commissions
    if (barberId) {
      await loadCommissions(barberId);
    } else {
      await loadAllCommissions();
    }

    return { error: null };
  }, [loadCommissions, loadAllCommissions]);

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
    deleteCommission,
  };
};
