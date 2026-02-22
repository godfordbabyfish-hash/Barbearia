import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Pencil, Trash2, Loader2, Calendar, Clock, User, Scissors, ShoppingBag, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  booking_type: string;
  status: string;
  notes?: string | null;
  client_id: string;
  client_name?: string | null;
  barber_id: string;
  service_id: string;
  service?: { title: string; price: number } | null;
  barber?: { name: string } | null;
  client?: { name: string; phone?: string } | null;
  payment_method?: string;
  appointment_payments?: { amount: number; payment_method?: string }[];
  photo_url?: string | null;
}

interface ProductSale {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sale_date: string;
  sale_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  barber_id: string;
  notes?: string | null;
  product?: { name: string } | null;
  barber?: { name: string } | null;
}

const HistoricoCP = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [loadingProductSales, setLoadingProductSales] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deletingAppointment, setDeletingAppointment] = useState<Appointment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Filtros
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterBarber, setFilterBarber] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'local' | 'online' | 'manual'>('all');
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualType, setManualType] = useState<'service' | 'product'>('service');
  const [manualBarberId, setManualBarberId] = useState<string>('');
  const [manualServiceId, setManualServiceId] = useState<string>('');
  const [manualProductId, setManualProductId] = useState<string>('');
  const [manualQuantity, setManualQuantity] = useState<number>(1);
  const [manualClientName, setManualClientName] = useState<string>('');
  const [manualDate, setManualDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [manualTime, setManualTime] = useState<string>(() => format(new Date(), 'HH:mm'));
  const [manualSaving, setManualSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Form de edição
  const [editForm, setEditForm] = useState({
    appointment_date: '',
    appointment_time: '',
    barber_id: '',
    service_id: '',
    status: '',
    notes: '',
  });

  useEffect(() => {
    loadBarbers();
    loadServices();
    loadProducts();
  }, []);

  useEffect(() => {
    loadAppointments();
    loadProductSales();
  }, [filterDateFrom, filterDateTo, filterBarber, filterService, filterStatus, filterType]);

  const loadBarbers = async () => {
    const { data, error } = await supabase
      .from('barbers')
      .select('id, name')
      .eq('visible', true)
      .order('name');

    if (error) {
      console.error('Error loading barbers:', error);
      toast.error('Erro ao carregar barbeiros');
    } else {
      setBarbers(data || []);
    }
  };

  const loadProductSales = async () => {
    setLoadingProductSales(true);
    try {
      let query = supabase
        .from('product_sales')
        .select(`
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          sale_date,
          sale_time,
          status,
          barber_id,
          notes,
          product:products(name),
          barber:barbers(name)
        `);

      if (filterDateFrom) {
        query = query.gte('sale_date', filterDateFrom);
      }
      if (filterDateTo) {
        query = query.lte('sale_date', filterDateTo);
      }
      if (filterBarber !== 'all') {
        query = query.eq('barber_id', filterBarber);
      }

      const { data, error } = await query
        .order('sale_date', { ascending: false })
        .order('sale_time', { ascending: false });

      if (error) throw error;
      setProductSales((data || []) as ProductSale[]);
    } catch (error: any) {
      console.error('Error loading product sales:', error);
      toast.error('Erro ao carregar vendas de produtos: ' + error.message);
      setProductSales([]);
    } finally {
      setLoadingProductSales(false);
    }
  };

  const loadServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('id, title, price')
      .eq('visible', true)
      .order('order_index');

    if (error) {
      console.error('Error loading services:', error);
      toast.error('Erro ao carregar serviços');
    } else {
      setServices(data || []);
    }
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, stock')
      .eq('visible', true)
      .order('name');

    if (error) {
      console.error('Error loading products:', error);
      toast.error('Erro ao carregar produtos');
    } else {
      setProducts(data || []);
    }
  };

  const loadAppointments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          booking_type,
          status,
          notes,
          client_id,
          barber_id,
          service_id,
          payment_method,
          photo_url,
          service:services(title, price),
          barber:barbers(name),
          appointment_payments(amount, payment_method)
        `);

      // Aplicar filtros
      if (filterDateFrom) {
        query = query.gte('appointment_date', filterDateFrom);
      }
      if (filterDateTo) {
        query = query.lte('appointment_date', filterDateTo);
      }
      if (filterBarber !== 'all') {
        query = query.eq('barber_id', filterBarber);
      }
      if (filterService !== 'all') {
        query = query.eq('service_id', filterService);
      }
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      if (filterType !== 'all') {
        query = query.eq('booking_type', filterType);
      }

      const { data, error } = await query
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

      if (error) throw error;

      // Carregar dados dos clientes separadamente
      if (data && data.length > 0) {
        const clientIds = [...new Set(data.map(apt => apt.client_id))];
        const { data: clientsData } = await supabase
          .from('profiles')
          .select('id, name, phone')
          .in('id', clientIds);

        const clientsMap = new Map(clientsData?.map(c => [c.id, c]) || []);
        const appointmentsWithClients = data.map(apt => ({
          ...apt,
          client: clientsMap.get(apt.client_id) || null,
        }));

        setAppointments(appointmentsWithClients as Appointment[]);
      } else {
        setAppointments([]);
      }
    } catch (error: any) {
      console.error('Error loading appointments:', error);
      toast.error('Erro ao carregar agendamentos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setEditForm({
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      barber_id: appointment.barber_id,
      service_id: appointment.service_id,
      status: appointment.status,
      notes: appointment.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingAppointment) return;

    if (!editForm.appointment_date || !editForm.appointment_time || !editForm.barber_id || !editForm.service_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: editForm.appointment_date,
          appointment_time: editForm.appointment_time,
          barber_id: editForm.barber_id,
          service_id: editForm.service_id,
          status: editForm.status,
          notes: editForm.notes || null,
        })
        .eq('id', editingAppointment.id);

      if (error) throw error;

      toast.success('Agendamento atualizado com sucesso!');
      setEditDialogOpen(false);
      setEditingAppointment(null);
      loadAppointments();
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      toast.error('Erro ao atualizar agendamento: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAppointment) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', deletingAppointment.id);

      if (error) throw error;

      toast.success('Agendamento excluído com sucesso!');
      setDeleteDialogOpen(false);
      setDeletingAppointment(null);
      loadAppointments();
    } catch (error: any) {
      console.error('Error deleting appointment:', error);
      toast.error('Erro ao excluir agendamento: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      confirmed: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
      pending: 'outline',
    };
    const labels: Record<string, string> = {
      confirmed: 'Confirmado',
      completed: 'Concluído',
      cancelled: 'Cancelado',
      pending: 'Pendente',
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      local: 'Local',
      online: 'Online',
      manual: 'Manual',
    };
    return (
      <Badge variant="outline">
        {labels[type] || type}
      </Badge>
    );
  };

  const handleOpenManualDialog = (type: 'service' | 'product') => {
    if (!manualBarberId) {
      toast.error('Selecione um barbeiro para lançar o registro manual');
      return;
    }
    setManualType(type);
    setManualDate(format(new Date(), 'yyyy-MM-dd'));
    setManualTime(format(new Date(), 'HH:mm'));
    setManualServiceId('');
    setManualProductId('');
    setManualQuantity(1);
    setManualClientName('');
    setManualDialogOpen(true);
  };

  const handleSaveManualAppointment = async () => {
    if (manualType === 'product') {
      if (!manualBarberId) {
        toast.error('Selecione um barbeiro');
        return;
      }
      if (!manualProductId) {
        toast.error('Selecione um produto');
        return;
      }
      if (manualQuantity <= 0) {
        toast.error('Quantidade deve ser maior que zero');
        return;
      }

      setManualSaving(true);
      try {
        const product = products.find(p => p.id === manualProductId);
        if (!product) {
          toast.error('Produto não encontrado');
          setManualSaving(false);
          return;
        }

        if (product.stock !== null && product.stock < manualQuantity) {
          toast.error(`Estoque insuficiente. Disponível: ${product.stock}`);
          setManualSaving(false);
          return;
        }

        const unitPrice = product.price;
        const totalPrice = unitPrice * manualQuantity;

        const { error } = await supabase
          .from('product_sales')
          .insert({
            barber_id: manualBarberId,
            product_id: manualProductId,
            quantity: manualQuantity,
            unit_price: unitPrice,
            total_price: totalPrice,
            sale_date: manualDate,
            sale_time: manualTime,
            status: 'confirmed',
            notes: manualClientName.trim() ? `Histórico CP: ${manualClientName.trim()}` : 'Histórico CP: venda manual',
          });

        if (error) {
          toast.error(error.message || 'Erro ao lançar venda de produto');
          setManualSaving(false);
          return;
        }

        toast.success('Venda de produto lançada com sucesso!');
        setManualDialogOpen(false);
        setManualProductId('');
        setManualQuantity(1);
        setManualClientName('');
        loadProducts();
      } catch (error: any) {
        console.error('Error saving manual product sale:', error);
        toast.error(error.message || 'Erro ao lançar venda de produto');
      } finally {
        setManualSaving(false);
      }
      return;
    }

    if (!manualBarberId) {
      toast.error('Selecione um barbeiro');
      return;
    }
    if (!manualServiceId) {
      toast.error('Selecione um serviço');
      return;
    }
    setManualSaving(true);
    try {
      const service = services.find(s => s.id === manualServiceId);
      if (!service) {
        toast.error('Serviço não encontrado');
        setManualSaving(false);
        return;
      }

      const clientName = manualClientName.trim() || 'Cliente Local';
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .insert({
          name: clientName,
          is_temp_user: true,
        })
        .select('id')
        .single();

      if (profileError || !profile?.id) {
        toast.error('Erro ao criar cliente para o lançamento');
        setManualSaving(false);
        return;
      }

      const bookingType = 'manual';
      const { error: appointmentError } = await (supabase as any)
        .from('appointments')
        .insert({
          client_id: profile.id,
          barber_id: manualBarberId,
          service_id: manualServiceId,
          appointment_date: manualDate,
          appointment_time: manualTime,
          status: 'confirmed',
          booking_type: bookingType,
          notes: 'Lançamento manual pelo gestor (Histórico CP)',
        });

      if (appointmentError) {
        toast.error(appointmentError.message || 'Erro ao lançar serviço manual');
        setManualSaving(false);
        return;
      }

      toast.success('Serviço manual lançado com sucesso!');
      setManualDialogOpen(false);
      setManualServiceId('');
      setManualClientName('');
      loadAppointments();
    } catch (error: any) {
      console.error('Error saving manual appointment:', error);
      toast.error(error.message || 'Erro ao lançar serviço manual');
    } finally {
      setManualSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <Card className="bg-card border-border shadow-lg w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex items-center justify-between gap-2 text-lg sm:text-xl">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <span className="hidden sm:inline">Histórico CP - Agendamentos</span>
            <span className="sm:hidden">Histórico CP</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs ml-auto"
              onClick={() => setShowFilters(v => !v)}
            >
              <Filter className="h-3 w-3 mr-1" />
              {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          <div className={`${showFilters ? '' : 'hidden'} mb-4 sm:mb-6 pb-3 border-b border-border`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Data Inicial</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Data Final</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Barbeiro</Label>
              <Select value={filterBarber} onValueChange={setFilterBarber}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Serviço</Label>
              <Select value={filterService} onValueChange={setFilterService}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Tipo</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </div>
          </div>

          <div className="mb-4 sm:mb-6">
            <Card className="bg-card border-primary/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center justify-between">
                  <span>Lançamentos manuais para barbeiros</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Barbeiro</Label>
                    <Select value={manualBarberId} onValueChange={setManualBarberId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione um barbeiro" />
                      </SelectTrigger>
                      <SelectContent>
                        {barbers.map((barber) => (
                          <SelectItem key={barber.id} value={barber.id}>
                            {barber.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => handleOpenManualDialog('service')}
                      disabled={!manualBarberId}
                    >
                      Registrar serviço manual
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      onClick={() => handleOpenManualDialog('product')}
                      disabled={!manualBarberId}
                    >
                      Registrar venda de produto
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de agendamentos */}
          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : appointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 sm:py-12 text-sm">
              Nenhum agendamento encontrado com os filtros selecionados.
            </p>
          ) : (
            <div className="w-full overflow-hidden" style={{ maxWidth: '100%' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: '860px' }}>
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[80px] sm:w-[100px]">Data</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[60px] sm:w-[80px]">Horário</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[120px] sm:w-[150px]">Cliente</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[100px] sm:w-[120px]">Barbeiro</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[120px] sm:w-[150px]">Serviço</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[100px] sm:w-[120px]">Pagamento</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[70px] sm:w-[80px]">Tipo</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[80px] sm:w-[100px]">Status</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[70px] sm:w-[80px]">Foto</th>
                      <th className="text-right py-2 sm:py-3 px-1 sm:px-2 w-[80px] sm:w-[100px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          <div className="text-xs sm:text-sm">
                            {format(new Date(apt.appointment_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm">{apt.appointment_time}</td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          <div>
                            <div className="font-medium text-xs sm:text-sm truncate" title={apt.client_name || apt.client?.name || 'N/A'}>
                              {apt.client_name || apt.client?.name || 'N/A'}
                            </div>
                            {apt.client?.phone && (
                              <div className="text-xs text-muted-foreground truncate" title={apt.client.phone}>
                                {apt.client.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          <div className="text-xs sm:text-sm truncate" title={apt.barber?.name || 'N/A'}>
                            {apt.barber?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          <div>
                            <div className="text-xs sm:text-sm truncate" title={apt.service?.title || 'N/A'}>
                              {apt.service?.title || 'N/A'}
                            </div>
                            {apt.service?.price && (
                              <div className="text-xs text-muted-foreground">
                                R$ {apt.service.price.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          {apt.appointment_payments && apt.appointment_payments.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {apt.appointment_payments.map((p, idx) => (
                                <span key={idx} className="text-xs text-muted-foreground whitespace-nowrap">
                                  {p.payment_method === 'pix' ? 'Pix' : 
                                   p.payment_method === 'cartao' ? 'Cartão' : 
                                   p.payment_method === 'dinheiro' ? 'Dinheiro' : 'Outro'}: R$ {Number(p.amount).toFixed(2)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              {apt.payment_method ? (
                                <>
                                  {apt.payment_method === 'pix' ? 'Pix' : 
                                   apt.payment_method === 'cartao' ? 'Cartão' : 
                                   apt.payment_method === 'dinheiro' ? 'Dinheiro' : apt.payment_method}
                                </>
                              ) : '-'}
                            </div>
                          )}
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">{getTypeBadge(apt.booking_type)}</td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">{getStatusBadge(apt.status)}</td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          {apt.photo_url ? (
                            <button
                              type="button"
                              onClick={() => {
                                setImagePreviewUrl(apt.photo_url || null);
                                setImageDialogOpen(true);
                              }}
                              className="block"
                              title="Ver foto"
                            >
                              <img
                                src={apt.photo_url}
                                alt="Foto do atendimento"
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-md object-cover border border-border"
                              />
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(apt)}
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                            >
                              <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setDeletingAppointment(apt);
                                setDeleteDialogOpen(true);
                              }}
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de vendas de produtos */}
      <Card className="bg-card border-border mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Vendas de Produtos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProductSales ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : productSales.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 sm:py-12 text-sm">
              Nenhuma venda encontrada com os filtros selecionados.
            </p>
          ) : (
            <div className="w-full overflow-hidden" style={{ maxWidth: '100%' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: '800px' }}>
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[80px] sm:w-[100px]">Data</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[60px] sm:w-[80px]">Horário</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[160px] sm:w-[200px]">Produto</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[80px] sm:w-[90px]">Qtd</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[110px] sm:w-[130px]">Total</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[120px] sm:w-[140px]">Barbeiro</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[90px] sm:w-[110px]">Status</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productSales.map((sale) => (
                      <tr key={sale.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          <div className="text-xs sm:text-sm">
                            {format(new Date(sale.sale_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm">{sale.sale_time}</td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          <div className="text-xs sm:text-sm truncate" title={sale.product?.name || 'Produto'}>
                            {sale.product?.name || 'Produto'}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">{sale.quantity}</td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">R$ {Number(sale.total_price).toFixed(2)}</td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          <div className="text-xs sm:text-sm truncate" title={sale.barber?.name || barbers.find(b => b.id === sale.barber_id)?.name || 'N/A'}>
                            {sale.barber?.name || barbers.find(b => b.id === sale.barber_id)?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          {sale.status === 'confirmed' && (
                            <Badge className="bg-green-500/20 text-green-600 text-xs">Confirmado</Badge>
                          )}
                          {sale.status === 'pending' && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs">Pendente</Badge>
                          )}
                          {sale.status === 'cancelled' && (
                            <Badge variant="destructive" className="text-xs">Cancelado</Badge>
                          )}
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          <div className="text-xs text-muted-foreground truncate" title={sale.notes || ''}>
                            {sale.notes || '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>
              Altere as informações do agendamento abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label className="text-sm">Data</Label>
              <Input
                type="date"
                value={editForm.appointment_date}
                onChange={(e) => setEditForm({ ...editForm, appointment_date: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <Label className="text-sm">Horário</Label>
              <Input
                type="time"
                value={editForm.appointment_time}
                onChange={(e) => setEditForm({ ...editForm, appointment_time: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <Label className="text-sm">Barbeiro</Label>
              <Select
                value={editForm.barber_id}
                onValueChange={(value) => setEditForm({ ...editForm, barber_id: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Serviço</Label>
              <Select
                value={editForm.service_id}
                onValueChange={(value) => setEditForm({ ...editForm, service_id: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.title} - R$ {service.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Observações (opcional)</Label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Observações sobre o agendamento"
                className="w-full"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4 sm:mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setEditingAppointment(null);
              }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Visualizar foto do atendimento</DialogTitle>
            <DialogDescription>Pré-visualização da foto anexada ao agendamento.</DialogDescription>
          </DialogHeader>
          <img
            src={imagePreviewUrl || ''}
            alt="Foto do atendimento"
            className="w-full h-full max-h-[85vh] object-contain bg-black"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent className="max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle>
              {manualType === 'service' ? 'Lançar serviço manual' : 'Registrar venda de produto'}
            </DialogTitle>
            <DialogDescription>
              {manualType === 'service'
                ? 'Cria um agendamento manual vinculado ao barbeiro selecionado.'
                : 'Registra uma venda de produto vinculada ao barbeiro selecionado.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Barbeiro</Label>
              <Input
                value={barbers.find(b => b.id === manualBarberId)?.name || ''}
                readOnly
                className="h-9 text-sm"
              />
            </div>
            {manualType === 'service' ? (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Serviço</Label>
                  <Select value={manualServiceId} onValueChange={setManualServiceId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Nome do cliente (opcional)</Label>
                  <Input
                    value={manualClientName}
                    onChange={(e) => setManualClientName(e.target.value)}
                    placeholder="Ex: Cliente local"
                    className="h-9 text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Produto</Label>
                  <Select value={manualProductId} onValueChange={setManualProductId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - R$ {Number(product.price).toFixed(2)}
                          {product.stock !== null && ` (Estoque: ${product.stock})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Quantidade</Label>
                  <Input
                    type="number"
                    min={1}
                    value={manualQuantity}
                    onChange={(e) => setManualQuantity(Number(e.target.value) || 1)}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Observação (opcional)</Label>
                  <Input
                    value={manualClientName}
                    onChange={(e) => setManualClientName(e.target.value)}
                    placeholder="Ex: Cliente local ou detalhes da venda"
                    className="h-9 text-sm"
                  />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Data</Label>
                <Input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Hora</Label>
                <Input
                  type="time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setManualDialogOpen(false)} disabled={manualSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveManualAppointment} disabled={manualSaving}>
              {manualSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar lançamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
            {deletingAppointment && (
              <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-left">
                <div><strong>Cliente:</strong> {deletingAppointment.client?.name || 'N/A'}</div>
                <div><strong>Data:</strong> {format(new Date(deletingAppointment.appointment_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</div>
                <div><strong>Horário:</strong> {deletingAppointment.appointment_time}</div>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HistoricoCP;
