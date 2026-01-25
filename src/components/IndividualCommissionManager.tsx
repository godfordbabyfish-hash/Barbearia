import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBarberCommissions } from '@/hooks/useBarberCommissions';
import { useBarberProductCommissions } from '@/hooks/useBarberProductCommissions';
import { toast } from 'sonner';
import { Save, DollarSign, Loader2, Scissors, ShoppingBag, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Barber {
  id: string;
  name: string;
}

interface Service {
  id: string;
  title: string;
  price: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

export const IndividualCommissionManager = () => {
  const { 
    commissions: serviceCommissions, 
    loading: serviceCommissionsLoading, 
    loadAllCommissions: loadAllServiceCommissions,
    updateCommission: updateServiceCommission
  } = useBarberCommissions(null);

  const { 
    commissions: productCommissions, 
    loading: productCommissionsLoading, 
    loadAllCommissions: loadAllProductCommissions,
    updateCommission: updateProductCommission
  } = useBarberProductCommissions(null);
  
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Local state for commission values (for editing)
  // Format: { "barberId-serviceId": percentage }
  const [serviceCommissionValues, setServiceCommissionValues] = useState<Record<string, number>>({});
  const [productCommissionValues, setProductCommissionValues] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
    loadAllServiceCommissions();
    loadAllProductCommissions();
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const barbersChannel = supabase
      .channel('individual-commission-manager-barbers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, () => {
        loadData();
      })
      .subscribe();

    const servicesChannel = supabase
      .channel('individual-commission-manager-services')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        loadData();
      })
      .subscribe();

    const productsChannel = supabase
      .channel('individual-commission-manager-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadData();
      })
      .subscribe();

    // Only subscribe to barber_commissions if the table exists
    // Note: This subscription will fail silently if the table doesn't exist
    const serviceCommissionsChannel = supabase
      .channel('individual-commission-manager-service-commissions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barber_commissions' }, () => {
        loadAllServiceCommissions();
      })
      .subscribe();

    const productCommissionsChannel = supabase
      .channel('individual-commission-manager-product-commissions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barber_product_commissions' }, () => {
        loadAllProductCommissions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(barbersChannel);
      supabase.removeChannel(servicesChannel);
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(serviceCommissionsChannel);
      supabase.removeChannel(productCommissionsChannel);
    };
  }, []);

  // Initialize commission values from loaded commissions
  useEffect(() => {
    if (barbers.length === 0 || services.length === 0) return;
    
    setServiceCommissionValues(prev => {
      const updated = { ...prev };
      barbers.forEach(barber => {
        services.forEach(service => {
          const key = `${barber.id}-${service.id}`;
          if (!(key in updated)) {
            const commission = serviceCommissions.find(
              c => c.barber_id === barber.id && c.service_id === service.id
            );
            updated[key] = commission?.commission_percentage ?? 0;
          }
        });
      });
      return updated;
    });
  }, [serviceCommissions, barbers, services]);

  useEffect(() => {
    if (barbers.length === 0 || products.length === 0) return;
    
    setProductCommissionValues(prev => {
      const updated = { ...prev };
      barbers.forEach(barber => {
        products.forEach(product => {
          const key = `${barber.id}-${product.id}`;
          if (!(key in updated)) {
            const commission = productCommissions.find(
              c => c.barber_id === barber.id && c.product_id === product.id
            );
            updated[key] = commission?.commission_percentage ?? 0;
          }
        });
      });
      return updated;
    });
  }, [productCommissions, barbers, products]);

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

      // Load services
      const { data: servicesData } = await supabase
        .from('services')
        .select('id, title, price')
        .eq('visible', true)
        .order('order_index');

      setServices(servicesData || []);

      // Load products
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('visible', true)
        .order('name');

      setProducts(productsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceCommissionChange = (barberId: string, serviceId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0 || numValue > 100) {
      toast.error('Percentual deve estar entre 0 e 100');
      return;
    }

    const key = `${barberId}-${serviceId}`;
    setServiceCommissionValues(prev => ({
      ...prev,
      [key]: numValue,
    }));
  };

  const handleProductCommissionChange = (barberId: string, productId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0 || numValue > 100) {
      toast.error('Percentual deve estar entre 0 e 100');
      return;
    }

    const key = `${barberId}-${productId}`;
    setProductCommissionValues(prev => ({
      ...prev,
      [key]: numValue,
    }));
  };

  const handleSaveServiceCommission = async (barberId: string, serviceId: string) => {
    const key = `${barberId}-${serviceId}`;
    const percentage = serviceCommissionValues[key] ?? 0;

    if (percentage < 0 || percentage > 100) {
      toast.error('Percentual deve estar entre 0 e 100');
      return;
    }

    setSaving(key);
    const { error } = await updateServiceCommission(barberId, serviceId, percentage);

    if (error) {
      toast.error(error.message || 'Erro ao salvar comissão');
    } else {
      toast.success('Comissão salva com sucesso!');
    }

    setSaving(null);
  };

  const handleSaveProductCommission = async (barberId: string, productId: string) => {
    const key = `${barberId}-${productId}`;
    const percentage = productCommissionValues[key] ?? 0;

    if (percentage < 0 || percentage > 100) {
      toast.error('Percentual deve estar entre 0 e 100');
      return;
    }

    setSaving(key);
    const { error } = await updateProductCommission(barberId, productId, percentage);

    if (error) {
      toast.error(error.message || 'Erro ao salvar comissão');
    } else {
      toast.success('Comissão salva com sucesso!');
    }

    setSaving(null);
  };

  if (loading || serviceCommissionsLoading || productCommissionsLoading) {
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
    <Card className="bg-card border-border w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <CardHeader className="w-full" style={{ maxWidth: '100%' }}>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <span className="truncate">Configurar Comissões Individuais</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm break-words">
          Defina o percentual de comissão individualmente para cada barbeiro em cada serviço e produto.
          Exemplo: Corte de cabelo (R$ 25) pode ter 50% para um barbeiro e 40% para outro.
        </CardDescription>
      </CardHeader>
      <CardContent className="w-full p-3 sm:p-4 md:p-6" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        <Tabs defaultValue="services" className="w-full" style={{ maxWidth: '100%' }}>
          <TabsList className="grid w-full max-w-full grid-cols-2 mb-4 sm:mb-6">
            <TabsTrigger value="services" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Scissors className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Comissão por Serviço</span>
              <span className="sm:hidden">Serviço</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Comissão por Produto</span>
              <span className="sm:hidden">Produto</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-4">
            {services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum serviço encontrado. Configure serviços primeiro.
              </div>
            ) : (
              services.map(service => (
                <div key={service.id} className="rounded-lg border border-border p-2 sm:p-3 md:p-4 bg-secondary/20 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base sm:text-lg truncate">{service.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Preço: R$ {service.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="w-full overflow-hidden" style={{ maxWidth: '100%' }}>
                    <div className="relative w-full overflow-hidden" style={{ maxWidth: '100%' }}>
                      <table className="w-full caption-bottom text-sm" style={{ tableLayout: 'fixed', width: '100%', maxWidth: '100%' }}>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="px-1 sm:px-2" style={{ width: '30%' }}>Barbeiro</TableHead>
                            <TableHead className="text-center px-1 sm:px-2" style={{ width: '25%' }}>Comissão (%)</TableHead>
                            <TableHead className="text-center px-1 sm:px-2" style={{ width: '25%' }}>Valor</TableHead>
                            <TableHead className="text-center px-1 sm:px-2" style={{ width: '20%' }}>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {barbers.map(barber => {
                            const key = `${barber.id}-${service.id}`;
                            const isSaving = saving === key;
                            const percentage = serviceCommissionValues[key] ?? 
                              serviceCommissions.find(
                                c => c.barber_id === barber.id && c.service_id === service.id
                              )?.commission_percentage ?? 0;
                            const commissionValue = (service.price * percentage) / 100;

                            return (
                              <TableRow key={barber.id}>
                                <TableCell className="font-semibold px-1 sm:px-2">
                                  <span className="truncate block" title={barber.name}>{barber.name}</span>
                                </TableCell>
                                <TableCell className="px-1 sm:px-2">
                                  <div className="flex gap-1 sm:gap-2 items-center justify-center">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      value={percentage}
                                      onChange={(e) => handleServiceCommissionChange(barber.id, service.id, e.target.value)}
                                      className="w-16 sm:w-20 text-center text-xs sm:text-sm h-8 sm:h-10"
                                      disabled={isSaving}
                                      placeholder="0"
                                    />
                                    <span className="text-xs sm:text-sm text-muted-foreground">%</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center px-1 sm:px-2">
                                  <span className="font-semibold text-green-600 text-xs sm:text-sm">
                                    R$ {commissionValue.toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell className="px-1 sm:px-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveServiceCommission(barber.id, service.id)}
                                    disabled={isSaving}
                                    className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                                  >
                                    {isSaving ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        <span className="hidden sm:inline">Salvando...</span>
                                        <span className="sm:hidden">...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Save className="h-3 w-3 mr-1" />
                                        <span className="hidden sm:inline">Salvar</span>
                                        <span className="sm:hidden">Salvar</span>
                                      </>
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </table>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            {products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum produto encontrado. Configure produtos primeiro.
              </div>
            ) : (
              products.map(product => (
                <div key={product.id} className="rounded-lg border border-border p-2 sm:p-3 md:p-4 bg-secondary/20 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base sm:text-lg truncate">{product.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Preço: R$ {product.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="w-full overflow-hidden" style={{ maxWidth: '100%' }}>
                    <div className="relative w-full overflow-hidden" style={{ maxWidth: '100%' }}>
                      <table className="w-full caption-bottom text-sm" style={{ tableLayout: 'fixed', width: '100%', maxWidth: '100%' }}>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="px-1 sm:px-2" style={{ width: '30%' }}>Barbeiro</TableHead>
                            <TableHead className="text-center px-1 sm:px-2" style={{ width: '25%' }}>Comissão (%)</TableHead>
                            <TableHead className="text-center px-1 sm:px-2" style={{ width: '25%' }}>Valor</TableHead>
                            <TableHead className="text-center px-1 sm:px-2" style={{ width: '20%' }}>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {barbers.map(barber => {
                            const key = `${barber.id}-${product.id}`;
                            const isSaving = saving === key;
                            const percentage = productCommissionValues[key] ?? 
                              productCommissions.find(
                                c => c.barber_id === barber.id && c.product_id === product.id
                              )?.commission_percentage ?? 0;
                            const commissionValue = (product.price * percentage) / 100;

                            return (
                              <TableRow key={barber.id}>
                                <TableCell className="font-semibold px-1 sm:px-2">
                                  <span className="truncate block" title={barber.name}>{barber.name}</span>
                                </TableCell>
                                <TableCell className="px-1 sm:px-2">
                                  <div className="flex gap-1 sm:gap-2 items-center justify-center">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      value={percentage}
                                      onChange={(e) => handleProductCommissionChange(barber.id, product.id, e.target.value)}
                                      className="w-16 sm:w-20 text-center text-xs sm:text-sm h-8 sm:h-10"
                                      disabled={isSaving}
                                      placeholder="0"
                                    />
                                    <span className="text-xs sm:text-sm text-muted-foreground">%</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center px-1 sm:px-2">
                                  <span className="font-semibold text-green-600 text-xs sm:text-sm">
                                    R$ {commissionValue.toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell className="px-1 sm:px-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveProductCommission(barber.id, product.id)}
                                    disabled={isSaving}
                                    className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                                  >
                                    {isSaving ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        <span className="hidden sm:inline">Salvando...</span>
                                        <span className="sm:hidden">...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Save className="h-3 w-3 mr-1" />
                                        <span className="hidden sm:inline">Salvar</span>
                                        <span className="sm:hidden">Salvar</span>
                                      </>
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </table>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
