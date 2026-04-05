import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBarberFixedCommissions } from '@/hooks/useBarberFixedCommissions';
import { toast } from 'sonner';
import { Save, DollarSign, Loader2, Scissors, ShoppingBag } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Barber {
  id: string;
  name: string;
}

export const CommissionManager = () => {
  const { 
    commissions, 
    loading: commissionsLoading, 
    loadAllCommissions, 
    updateFixedCommission,
    getServiceCommissionPercentage,
    getProductCommissionPercentage 
  } = useBarberFixedCommissions(null);
  
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Local state for commission values (for editing)
  const [serviceCommissionValues, setServiceCommissionValues] = useState<Record<string, number>>({});
  const [productCommissionValues, setProductCommissionValues] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
    loadAllCommissions();
  }, []);

  // Realtime subscriptions for barbers and commissions
  useEffect(() => {
    // Subscribe to barbers changes
    let barbersRemoved = false;
    const barbersChannel = supabase
      .channel('commission-manager-barbers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'barbers' },
        () => { loadData(); toast.info('Novo barbeiro detectado! Atualizando configurações de comissão...'); }
      )
      .subscribe((status: string) => {
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !barbersRemoved) {
          barbersRemoved = true;
          setTimeout(() => { try { supabase.removeChannel(barbersChannel); } catch { /* ignore */ } }, 0);
        }
      });

    // Subscribe to fixed commissions changes
    let commissionsRemoved = false;
    const commissionsChannel = supabase
      .channel('commission-manager-fixed-commissions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'barber_fixed_commissions' },
        () => { loadAllCommissions(); }
      )
      .subscribe((status: string) => {
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !commissionsRemoved) {
          commissionsRemoved = true;
          setTimeout(() => { try { supabase.removeChannel(commissionsChannel); } catch { /* ignore */ } }, 0);
        }
      });

    return () => {
      barbersRemoved = true;
      commissionsRemoved = true;
      try { supabase.removeChannel(barbersChannel); } catch { /* ignore */ }
      try { supabase.removeChannel(commissionsChannel); } catch { /* ignore */ }
    };
  }, []);

  // Initialize commission values from loaded commissions
  useEffect(() => {
    if (barbers.length === 0 || commissions.length === 0) return;
    
    setServiceCommissionValues(prev => {
      const updated = { ...prev };
      barbers.forEach(barber => {
        if (!(barber.id in updated)) {
          const commission = commissions.find(c => c.barber_id === barber.id);
          updated[barber.id] = commission?.service_commission_percentage ?? 0;
        }
      });
      return updated;
    });

    setProductCommissionValues(prev => {
      const updated = { ...prev };
      barbers.forEach(barber => {
        if (!(barber.id in updated)) {
          const commission = commissions.find(c => c.barber_id === barber.id);
          updated[barber.id] = commission?.product_commission_percentage ?? 0;
        }
      });
      return updated;
    });
  }, [commissions, barbers]);

  const loadData = async () => {
    setLoading(true);
    
    try {
      // Load barbers
      const { data: barbersData } = await supabase
        .from('barbers')
        .select('id, name')
        .eq('visible', true)
        .order('order_index');

      setBarbers(barbersData || []);

      // Initialize commission values for new barbers
      if (barbersData) {
        setServiceCommissionValues(prev => {
          const updated = { ...prev };
          barbersData.forEach(barber => {
            if (!(barber.id in updated)) {
              const commission = commissions.find(c => c.barber_id === barber.id);
              updated[barber.id] = commission?.service_commission_percentage ?? 0;
            }
          });
          return updated;
        });

        setProductCommissionValues(prev => {
          const updated = { ...prev };
          barbersData.forEach(barber => {
            if (!(barber.id in updated)) {
              const commission = commissions.find(c => c.barber_id === barber.id);
              updated[barber.id] = commission?.product_commission_percentage ?? 0;
            }
          });
          return updated;
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceCommissionChange = (barberId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0 || numValue > 100) {
      toast.error('Percentual deve estar entre 0 e 100');
      return;
    }

    setServiceCommissionValues(prev => ({
      ...prev,
      [barberId]: numValue,
    }));
  };

  const handleProductCommissionChange = (barberId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0 || numValue > 100) {
      toast.error('Percentual deve estar entre 0 e 100');
      return;
    }

    setProductCommissionValues(prev => ({
      ...prev,
      [barberId]: numValue,
    }));
  };

  const handleSaveCommission = async (barberId: string) => {
    const servicePercentage = serviceCommissionValues[barberId] ?? 0;
    const productPercentage = productCommissionValues[barberId] ?? 0;

    if (servicePercentage < 0 || servicePercentage > 100) {
      toast.error('Percentual de serviços deve estar entre 0 e 100');
      return;
    }
    if (productPercentage < 0 || productPercentage > 100) {
      toast.error('Percentual de produtos deve estar entre 0 e 100');
      return;
    }

    setSaving(barberId);
    const { error } = await updateFixedCommission(barberId, servicePercentage, productPercentage);

    if (error) {
      toast.error(error.message || 'Erro ao salvar comissão');
    } else {
      toast.success('Comissões salvas com sucesso!');
    }

    setSaving(null);
  };

  if (loading || commissionsLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Carregando comissões...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (barbers.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            Nenhum barbeiro encontrado. Configure barbeiros primeiro.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Configurar Comissões
        </CardTitle>
        <CardDescription>
          Defina o percentual fixo de comissão de cada barbeiro para todos os serviços e produtos. 
          O valor da comissão será calculado automaticamente sobre o preço de cada venda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              Comissão de Serviços
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Comissão de Produtos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-4">
            <div className="rounded-lg border border-border p-4 bg-secondary/20">
              <p className="text-sm text-muted-foreground mb-4">
                Defina o percentual fixo de comissão que cada barbeiro recebe sobre <strong>todos os serviços</strong> realizados.
                Esta porcentagem será aplicada automaticamente ao valor de cada serviço.
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Barbeiro</TableHead>
                      <TableHead className="text-center min-w-[150px]">Comissão (%)</TableHead>
                      <TableHead className="text-center min-w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {barbers.map(barber => {
                      const isSaving = saving === barber.id;
                      const percentage = serviceCommissionValues[barber.id] ?? getServiceCommissionPercentage(barber.id);

                      return (
                        <TableRow key={barber.id}>
                          <TableCell className="font-semibold">
                            {barber.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 items-center justify-center">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={percentage}
                                onChange={(e) => handleServiceCommissionChange(barber.id, e.target.value)}
                                className="w-24 text-center"
                                disabled={isSaving}
                                placeholder="0"
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleSaveCommission(barber.id)}
                              disabled={isSaving}
                              className="w-full"
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                  Salvando...
                                </>
                              ) : (
                                <>
                                  <Save className="h-3 w-3 mr-2" />
                                  Salvar
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <div className="rounded-lg border border-border p-4 bg-secondary/20">
              <p className="text-sm text-muted-foreground mb-4">
                Defina o percentual fixo de comissão que cada barbeiro recebe sobre <strong>todos os produtos</strong> vendidos.
                Esta porcentagem será aplicada automaticamente ao valor de cada produto.
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Barbeiro</TableHead>
                      <TableHead className="text-center min-w-[150px]">Comissão (%)</TableHead>
                      <TableHead className="text-center min-w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {barbers.map(barber => {
                      const isSaving = saving === barber.id;
                      const percentage = productCommissionValues[barber.id] ?? getProductCommissionPercentage(barber.id);

                      return (
                        <TableRow key={barber.id}>
                          <TableCell className="font-semibold">
                            {barber.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 items-center justify-center">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={percentage}
                                onChange={(e) => handleProductCommissionChange(barber.id, e.target.value)}
                                className="w-24 text-center"
                                disabled={isSaving}
                                placeholder="0"
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleSaveCommission(barber.id)}
                              disabled={isSaving}
                              className="w-full"
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                  Salvando...
                                </>
                              ) : (
                                <>
                                  <Save className="h-3 w-3 mr-2" />
                                  Salvar
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
