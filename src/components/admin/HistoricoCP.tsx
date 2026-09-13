import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Pencil, Trash2, Loader2, Calendar, Clock, User, Scissors, ShoppingBag, Filter, CheckCircle2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getOptimizedStorageImageUrl } from '@/utils/images';
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
  payment_method?: string | null;
  product?: { name: string } | null;
  barber?: { name: string } | null;
}

const HISTORICO_CP_PAGE_SIZE = 30;

const HistoricoCP = () => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setContentWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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
  const [deleteSaleDialogOpen, setDeleteSaleDialogOpen] = useState(false);
  const [deletingSale, setDeletingSale] = useState<ProductSale | null>(null);
  const [deletingSaleLoading, setDeletingSaleLoading] = useState(false);

  // Filtros
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterBarber, setFilterBarber] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'local' | 'online' | 'manual'>('all');
  const [filterPayment, setFilterPayment] = useState<'all' | 'pix' | 'dinheiro' | 'cartao' | 'none'>('all');
  const [filterClient, setFilterClient] = useState<string>('');
  const [debouncedClient, setDebouncedClient] = useState<string>('');
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualLauncherOpen, setManualLauncherOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (contentWidth >= 1100) setMobileFiltersOpen(false);
  }, [contentWidth]);
  const [manualType, setManualType] = useState<'service' | 'product'>('service');
  const [manualBarberId, setManualBarberId] = useState<string>('');
  const [manualServiceId, setManualServiceId] = useState<string>('');
  const [manualProductId, setManualProductId] = useState<string>('');
  const [manualQuantity, setManualQuantity] = useState<number>(1);
  const [manualClientName, setManualClientName] = useState<string>('');
  const [manualDate, setManualDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [manualTime, setManualTime] = useState<string>(() => format(new Date(), 'HH:mm'));
  const [manualSaving, setManualSaving] = useState(false);
  const [manualPaymentMethod, setManualPaymentMethod] = useState<'pix' | 'dinheiro' | 'cartao'>('pix');
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [completingAppointmentId, setCompletingAppointmentId] = useState<string | null>(null);
  const [completingSaleId, setCompletingSaleId] = useState<string | null>(null);
  const [servicesPage, setServicesPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const [servicesTotalCount, setServicesTotalCount] = useState(0);
  const [productsTotalCount, setProductsTotalCount] = useState(0);

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
    const timer = window.setTimeout(() => setDebouncedClient(filterClient.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [filterClient]);

  useEffect(() => {
    if (activeTab === 'services') {
      loadAppointments(servicesPage);
      return;
    }

    loadProductSales(productsPage);
  }, [
    activeTab,
    servicesPage,
    productsPage,
    filterDateFrom,
    filterDateTo,
    filterBarber,
    filterService,
    filterProduct,
    filterStatus,
    filterType,
    filterPayment,
    debouncedClient,
  ]);

  useEffect(() => {
    if (activeTab === 'services') {
      setServicesPage(1);
      return;
    }

    setProductsPage(1);
  }, [
    activeTab,
    filterDateFrom,
    filterDateTo,
    filterBarber,
    filterService,
    filterProduct,
    filterStatus,
    filterType,
    filterPayment,
    debouncedClient,
  ]);

  useEffect(() => {
    let refreshTimer: number | undefined;
    const refreshVisibleTab = () => {
      if (document.visibilityState === 'hidden') return;
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        if (activeTab === 'services') loadAppointments(servicesPage, true);
        else loadProductSales(productsPage, true);
      }, 250);
    };

    const channel = supabase.channel('historico-cp-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, refreshVisibleTab)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_payments' }, refreshVisibleTab)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_sales' }, refreshVisibleTab)
      .subscribe();
    const interval = window.setInterval(refreshVisibleTab, 10000);
    document.addEventListener('visibilitychange', refreshVisibleTab);

    return () => {
      window.clearTimeout(refreshTimer);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshVisibleTab);
      void supabase.removeChannel(channel);
    };
  }, [activeTab, servicesPage, productsPage, filterDateFrom, filterDateTo, filterBarber, filterService, filterProduct, filterStatus, filterType, filterPayment, debouncedClient]);

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

  const loadProductSales = async (page: number = 1, silent = false) => {
    if (!silent) setLoadingProductSales(true);
    try {
      const safePage = Math.max(1, page);
      const rangeFrom = (safePage - 1) * HISTORICO_CP_PAGE_SIZE;
      const rangeTo = rangeFrom + HISTORICO_CP_PAGE_SIZE - 1;

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
          payment_method,
          barber_id,
          notes,
          product:products(name),
          barber:barbers(name)
        `, { count: 'exact' });

      if (filterDateFrom) {
        query = query.gte('sale_date', filterDateFrom);
      }
      if (filterDateTo) {
        query = query.lte('sale_date', filterDateTo);
      }
      if (filterBarber !== 'all') {
        query = query.eq('barber_id', filterBarber);
      }
      if (filterProduct !== 'all') {
        query = query.eq('product_id', filterProduct);
      }
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      if (filterPayment !== 'all') {
        if (filterPayment === 'none') {
          query = query.is('payment_method', null);
        } else {
          query = query.eq('payment_method', filterPayment);
        }
      }

      const { data, error, count } = await query
        .order('sale_date', { ascending: false })
        .order('sale_time', { ascending: false })
        .range(rangeFrom, rangeTo);

      if (error) throw error;
      const list = (data || []) as ProductSale[];
      setProductSales(list);
      setProductsTotalCount(count ?? 0);

      let totalsQuery = supabase
        .from('product_sales')
        .select('total_price');

      if (filterDateFrom) {
        totalsQuery = totalsQuery.gte('sale_date', filterDateFrom);
      }
      if (filterDateTo) {
        totalsQuery = totalsQuery.lte('sale_date', filterDateTo);
      }
      if (filterBarber !== 'all') {
        totalsQuery = totalsQuery.eq('barber_id', filterBarber);
      }
      if (filterProduct !== 'all') {
        totalsQuery = totalsQuery.eq('product_id', filterProduct);
      }
      if (filterStatus !== 'all') {
        totalsQuery = totalsQuery.eq('status', filterStatus);
      }
      if (filterPayment !== 'all') {
        if (filterPayment === 'none') {
          totalsQuery = totalsQuery.is('payment_method', null);
        } else {
          totalsQuery = totalsQuery.eq('payment_method', filterPayment);
        }
      }

      const { data: totalsData, error: totalsError } = await totalsQuery;
      if (totalsError) throw totalsError;

      try {
        const total = (totalsData || []).reduce((sum: number, s: any) => sum + Number(s.total_price || 0), 0);
        setProductsTotal(total);
      } catch {
        setProductsTotal(0);
      }
    } catch (error: any) {
      console.error('Error loading product sales:', error);
      toast.error('Erro ao carregar vendas de produtos: ' + error.message);
      setProductSales([]);
      setProductsTotalCount(0);
      setProductsTotal(0);
    } finally {
      if (!silent) setLoadingProductSales(false);
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

  const loadAppointments = async (page: number = 1, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const safePage = Math.max(1, page);
      const rangeFrom = (safePage - 1) * HISTORICO_CP_PAGE_SIZE;
      const rangeTo = rangeFrom + HISTORICO_CP_PAGE_SIZE - 1;

      let clientFilterExpression = '';
      if (debouncedClient) {
        const safeText = debouncedClient
          .replace(/[,%()]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const phoneDigits = debouncedClient.replace(/\D/g, '');

        if (safeText) {
          const profileFilters = [`name.ilike.%${safeText}%`];
          if (phoneDigits) profileFilters.push(`phone.ilike.%${phoneDigits}%`);

          const { data: matchedProfiles, error: profileSearchError } = await supabase
            .from('profiles')
            .select('id')
            .or(profileFilters.join(','))
            .limit(500);

          if (profileSearchError) throw profileSearchError;

          const clientClauses = [`client_name.ilike.%${safeText}%`];
          const matchedIds = (matchedProfiles || []).map((profile) => profile.id);
          if (matchedIds.length > 0) {
            clientClauses.push(`client_id.in.(${matchedIds.join(',')})`);
          }
          clientFilterExpression = clientClauses.join(',');
        }
      }

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
          client_name,
          barber_id,
          service_id,
          payment_method,
          photo_url,
          service:services(title, price),
          barber:barbers(name),
          appointment_payments(amount, payment_method)
        `, { count: 'exact' });

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
      if (clientFilterExpression) {
        query = query.or(clientFilterExpression);
      }

      if (filterPayment !== 'all') {
        if (filterPayment === 'none') {
          query = query.is('payment_method', null);
        } else {
          query = query.eq('payment_method', filterPayment);
        }
      }

      const { data, error, count } = await query
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .range(rangeFrom, rangeTo);

      if (error) throw error;

      setServicesTotalCount(count ?? 0);

      const raw = (data || []) as any[];
      if (raw && raw.length > 0) {
        const clientIds = [...new Set(raw.map(apt => apt.client_id))];
        const { data: clientsData } = await supabase
          .from('profiles')
          .select('id, name, phone')
          .in('id', clientIds);

        const clientsMap = new Map(clientsData?.map(c => [c.id, c]) || []);
        const appointmentsWithClients = raw.map(apt => ({
          ...apt,
          client: clientsMap.get(apt.client_id) || null,
        }));

        setAppointments(appointmentsWithClients as Appointment[]);

        let totalsQuery = supabase
          .from('appointments')
          .select(`
            status,
            payment_method,
            service:services(price)
          `);

        if (filterDateFrom) {
          totalsQuery = totalsQuery.gte('appointment_date', filterDateFrom);
        }
        if (filterDateTo) {
          totalsQuery = totalsQuery.lte('appointment_date', filterDateTo);
        }
        if (filterBarber !== 'all') {
          totalsQuery = totalsQuery.eq('barber_id', filterBarber);
        }
        if (filterService !== 'all') {
          totalsQuery = totalsQuery.eq('service_id', filterService);
        }
        if (filterStatus !== 'all') {
          totalsQuery = totalsQuery.eq('status', filterStatus);
        }
        if (filterType !== 'all') {
          totalsQuery = totalsQuery.eq('booking_type', filterType);
        }
        if (clientFilterExpression) {
          totalsQuery = totalsQuery.or(clientFilterExpression);
        }
        if (filterPayment !== 'all') {
          if (filterPayment === 'none') {
            totalsQuery = totalsQuery.is('payment_method', null);
          } else {
            totalsQuery = totalsQuery.eq('payment_method', filterPayment);
          }
        }

        const { data: totalsData, error: totalsError } = await totalsQuery;
        if (totalsError) throw totalsError;

        try {
          const servicesSum = (totalsData || []).reduce((sum: number, apt: any) => {
            const status = String(apt.status || '');
            if (status === 'confirmed' || status === 'completed') {
              const price = Number(apt.service?.price || 0);
              return sum + (price || 0);
            }
            return sum;
          }, 0);
          setServicesTotal(servicesSum);
        } catch {
          setServicesTotal(0);
        }
      } else {
        setAppointments([]);
        setServicesTotal(0);
      }
    } catch (error: any) {
      console.error('Error loading appointments:', error);
      toast.error('Erro ao carregar agendamentos: ' + error.message);
      setAppointments([]);
      setServicesTotalCount(0);
      setServicesTotal(0);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const [servicesTotal, setServicesTotal] = useState<number>(0);
  const [productsTotal, setProductsTotal] = useState<number>(0);

  const servicesTotalPages = Math.max(1, Math.ceil(servicesTotalCount / HISTORICO_CP_PAGE_SIZE));
  const productsTotalPages = Math.max(1, Math.ceil(productsTotalCount / HISTORICO_CP_PAGE_SIZE));

  const servicesStartIndex = servicesTotalCount === 0 ? 0 : (servicesPage - 1) * HISTORICO_CP_PAGE_SIZE + 1;
  const servicesEndIndex = Math.min(servicesPage * HISTORICO_CP_PAGE_SIZE, servicesTotalCount);
  const productsStartIndex = productsTotalCount === 0 ? 0 : (productsPage - 1) * HISTORICO_CP_PAGE_SIZE + 1;
  const productsEndIndex = Math.min(productsPage * HISTORICO_CP_PAGE_SIZE, productsTotalCount);

  useEffect(() => {
    if (servicesPage > servicesTotalPages) {
      setServicesPage(servicesTotalPages);
    }
  }, [servicesPage, servicesTotalPages]);

  useEffect(() => {
    if (productsPage > productsTotalPages) {
      setProductsPage(productsTotalPages);
    }
  }, [productsPage, productsTotalPages]);

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
      loadAppointments(servicesPage);
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

      // Verificar se ainda existe (política RLS pode impedir delete silenciosamente em alguns cenários)
      const { data: stillThere } = await supabase
        .from('appointments')
        .select('id')
        .eq('id', deletingAppointment.id)
        .maybeSingle();

      if (stillThere?.id) {
        // Fallback: marca como cancelado para ocultar de fluxos operacionais
        const { error: updError } = await supabase
          .from('appointments')
          .update({
            status: 'cancelled',
            notes: (deletingAppointment.notes ? deletingAppointment.notes + ' | ' : '') + 'Excluído (cancelado) pelo gestor',
          })
          .eq('id', deletingAppointment.id);
        if (updError) throw updError;
        toast.success('Agendamento cancelado (sem excluir por política)');
      } else {
        toast.success('Agendamento excluído com sucesso!');
      }

      setDeleteDialogOpen(false);
      setDeletingAppointment(null);
      await loadAppointments(servicesPage);
    } catch (error: any) {
      console.error('Error deleting appointment:', error);
      toast.error('Erro ao excluir agendamento: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSale = async () => {
    if (!deletingSale) return;
    setDeletingSaleLoading(true);
    try {
      const { error } = await supabase
        .from('product_sales')
        .delete()
        .eq('id', deletingSale.id);
      if (error) throw error;
      toast.success('Venda de produto excluída com sucesso!');
      setDeleteSaleDialogOpen(false);
      setDeletingSale(null);
      loadProductSales(productsPage);
    } catch (error: any) {
      console.error('Error deleting product sale:', error);
      toast.error('Erro ao excluir venda: ' + error.message);
    } finally {
      setDeletingSaleLoading(false);
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

  const handleCompleteAppointment = async (appointment: Appointment) => {
    if (appointment.status === 'completed') return;
    setCompletingAppointmentId(appointment.id);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointment.id);

      if (error) {
        throw error;
      }

      toast.success('Serviço marcado como concluído.');
      loadAppointments(servicesPage);
    } catch (error: any) {
      console.error('Error completing appointment:', error);
      toast.error(error.message || 'Erro ao concluir o serviço.');
    } finally {
      setCompletingAppointmentId(null);
    }
  };

  const handleCompleteProductSale = async (sale: ProductSale) => {
    if (sale.status === 'confirmed') return;
    setCompletingSaleId(sale.id);
    try {
      const { error } = await supabase
        .from('product_sales')
        .update({ status: 'confirmed' })
        .eq('id', sale.id);

      if (error) {
        throw error;
      }

      toast.success('Venda marcada como concluída.');
      loadProductSales(productsPage);
    } catch (error: any) {
      console.error('Error completing product sale:', error);
      toast.error(error.message || 'Erro ao concluir a venda.');
    } finally {
      setCompletingSaleId(null);
    }
  };

  // Componentes Mobile
  const MobileAppointmentCard = ({ appointment }: { appointment: Appointment }) => (
    <Card className={contentWidth >= 900 ? 'min-w-0 rounded-none border-x-0 border-t-0 border-border/50 shadow-none' : 'min-w-0 border-border/50'}>
      <CardContent className="p-3">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {format(new Date(appointment.appointment_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{appointment.appointment_time}</span>
          </div>
          <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
            {appointment.status !== 'completed' && (
              <Button
                size="sm"
                variant="default"
                onClick={() => handleCompleteAppointment(appointment)}
                disabled={completingAppointmentId === appointment.id}
                className="h-11 min-w-[96px] bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700"
                aria-label="Concluir agendamento"
              >
                {completingAppointmentId === appointment.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>Concluir</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEdit(appointment)}
              className="h-11 min-w-[84px] border-sky-500/40 bg-sky-500/10 px-3 text-xs text-sky-300 hover:bg-sky-500/20"
              aria-label="Editar agendamento"
            >
              <Pencil className="h-4 w-4" />
              <span>Editar</span>
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setDeletingAppointment(appointment);
                setDeleteDialogOpen(true);
              }}
              className="h-11 min-w-[84px] px-3 text-xs"
              aria-label="Excluir agendamento"
            >
              <Trash2 className="h-4 w-4" />
              <span>Excluir</span>
            </Button>
          </div>
        </div>
        
        <div className={contentWidth >= 900 ? 'grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] items-start gap-4' : 'space-y-2'}>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="flex flex-col gap-1">
                <div className="break-words text-sm font-medium">{appointment.client_name || appointment.client?.name || 'N/A'}</div>
                {(() => {
                  try {
                    const n = appointment.notes ? JSON.parse(appointment.notes) : null;
                    if (n && n.fit === true) {
                      return (
                        <Badge className="bg-purple-600 text-white border-none text-[10px] h-5 w-fit px-2 font-bold uppercase shadow-sm">
                          Encaixe
                        </Badge>
                      );
                    }
                  } catch {}
                  return null;
                })()}
              </div>
              {appointment.client?.phone && (
                <div className="text-xs text-muted-foreground">{appointment.client.phone}</div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="break-words text-sm">{appointment.barber?.name || 'N/A'}</div>
              <div className="break-words text-xs text-muted-foreground">{appointment.service?.title || 'N/A'}</div>
              {appointment.service?.price && (
                <div className="text-xs font-medium text-primary">R$ {appointment.service.price.toFixed(2)}</div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {getStatusBadge(appointment.status)}
              {getTypeBadge(appointment.booking_type)}
            </div>
            {appointment.photo_url && (
              <button
                type="button"
                onClick={() => {
                  setImagePreviewUrl(appointment.photo_url || null);
                  setImageDialogOpen(true);
                }}
                className="ml-auto"
              >
                <img
                  src={getOptimizedStorageImageUrl(appointment.photo_url, { width: 96, height: 96, quality: 60, resize: 'cover' })}
                  alt="Foto do atendimento"
                  onError={(event) => { if (event.currentTarget.src !== appointment.photo_url) event.currentTarget.src = appointment.photo_url || ''; }}
                  className="w-8 h-8 rounded-md object-cover border border-border"
                />
              </button>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Pagamento: </span>
            {appointment.appointment_payments && appointment.appointment_payments.length > 0
              ? appointment.appointment_payments.map((p, idx) => (
                  <span key={idx} className="mr-2 inline-block">
                    {p.payment_method === 'pix' ? 'Pix' : p.payment_method === 'cartao' ? 'Cartão' : p.payment_method === 'dinheiro' ? 'Dinheiro' : 'Outro'}: R$ {Number(p.amount).toFixed(2)}
                  </span>
                ))
              : appointment.payment_method
                ? appointment.payment_method === 'pix' ? 'Pix' : appointment.payment_method === 'cartao' ? 'Cartão' : appointment.payment_method === 'dinheiro' ? 'Dinheiro' : appointment.payment_method
                : '-'}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const MobileProductCard = ({ sale }: { sale: ProductSale }) => (
    <Card className={contentWidth >= 900 ? 'min-w-0 rounded-none border-x-0 border-t-0 border-border/50 shadow-none' : 'min-w-0 border-border/50'}>
      <CardContent className="p-3">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {format(new Date(sale.sale_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{sale.sale_time}</span>
          </div>
          <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
            {sale.status !== 'confirmed' && (
              <Button
                size="sm"
                variant="default"
                onClick={() => handleCompleteProductSale(sale)}
                disabled={completingSaleId === sale.id}
                className="h-11 min-w-[106px] bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700"
                aria-label="Confirmar venda"
              >
                {completingSaleId === sale.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>Confirmar</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setDeletingSale(sale);
                setDeleteSaleDialogOpen(true);
              }}
              className="h-11 min-w-[84px] px-3 text-xs"
              aria-label="Excluir venda"
            >
              <Trash2 className="h-4 w-4" />
              <span>Excluir</span>
            </Button>
          </div>
        </div>
        
        <div className={contentWidth >= 900 ? 'grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-start gap-4' : 'space-y-2'}>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="break-words text-sm font-medium">{sale.product?.name || 'Produto'}</div>
              <div className="text-xs text-muted-foreground">Qtd: {sale.quantity}</div>
              <div className="text-sm font-medium text-primary">R$ {Number(sale.total_price).toFixed(2)}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div className="break-words text-sm">{sale.barber?.name || barbers.find(b => b.id === sale.barber_id)?.name || 'N/A'}</div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {sale.status === 'confirmed' && (
              <Badge className="bg-green-500/20 text-green-600 text-xs">Confirmado</Badge>
            )}
            {sale.status === 'pending' && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs">Pendente</Badge>
            )}
            {sale.status === 'cancelled' && (
              <Badge variant="destructive" className="text-xs">Cancelado</Badge>
            )}
            {sale.payment_method === 'pix' && (
              <Badge className="bg-green-500/20 text-green-600 text-xs">Pix</Badge>
            )}
            {sale.payment_method === 'dinheiro' && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs">Dinheiro</Badge>
            )}
            {sale.payment_method === 'cartao' && (
              <Badge className="bg-blue-500/20 text-blue-600 text-xs">Cartão</Badge>
            )}
            {!sale.payment_method && <span className="text-xs text-muted-foreground">Pagamento: -</span>}
          </div>
          
          {sale.notes && (
            <div className="break-words text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Observação: </span>{sale.notes}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

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
    setManualLauncherOpen(false);
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
            payment_method: manualPaymentMethod,
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
        setProductsPage(1);
        loadProductSales(1);
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
      setServicesPage(1);
      loadAppointments(1);
    } catch (error: any) {
      console.error('Error saving manual appointment:', error);
      toast.error(error.message || 'Erro ao lançar serviço manual');
    } finally {
      setManualSaving(false);
    }
  };

  const activeHistoryFilterCount = [
    filterDateFrom,
    filterDateTo,
    activeTab === 'services' ? filterClient : '',
    filterBarber !== 'all',
    activeTab === 'services' ? filterService !== 'all' : filterProduct !== 'all',
    filterStatus !== 'all',
    activeTab === 'services' && filterType !== 'all',
    filterPayment !== 'all',
  ].filter(Boolean).length;

  const historyFilters = (
            <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold"><Filter className="h-4 w-4 text-primary" /> Filtros do histórico</span>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterClient(''); setFilterBarber('all'); setFilterService('all'); setFilterProduct('all'); setFilterStatus('all'); setFilterType('all'); setFilterPayment('all'); }}>Limpar</Button>
              </div>
              <div className={contentWidth >= 1100
                ? activeTab === 'services'
                  ? 'grid grid-cols-[minmax(135px,0.9fr)_minmax(135px,0.9fr)_minmax(160px,1.3fr)_repeat(5,minmax(110px,1fr))] items-end gap-2'
                  : 'grid grid-cols-[repeat(2,minmax(135px,1fr))_repeat(4,minmax(145px,1fr))] items-end gap-2'
                : 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'}>
                <div className="min-w-0">
                  <Label htmlFor="history-date-from" className="mb-1.5 block text-xs text-muted-foreground">De</Label>
                  <Input id="history-date-from" type="date" value={filterDateFrom} max={filterDateTo || undefined} onChange={(event) => setFilterDateFrom(event.target.value)} className="h-10 w-full min-w-0 [color-scheme:dark]" />
                </div>
                <div className="min-w-0">
                  <Label htmlFor="history-date-to" className="mb-1.5 block text-xs text-muted-foreground">Até</Label>
                  <Input id="history-date-to" type="date" value={filterDateTo} min={filterDateFrom || undefined} onChange={(event) => setFilterDateTo(event.target.value)} className="h-10 w-full min-w-0 [color-scheme:dark]" />
                </div>
                {activeTab === 'services' && (
                  <div className="min-w-0">
                    <Label htmlFor="history-client-search" className="mb-1.5 block text-xs text-muted-foreground">Cliente</Label>
                    <Input id="history-client-search" type="search" value={filterClient} onChange={(event) => setFilterClient(event.target.value)} placeholder="Nome ou telefone" className="h-10 w-full min-w-0" />
                  </div>
                )}
                <div className="min-w-0">
                  <Label className="mb-1.5 block text-xs text-muted-foreground">Barbeiro</Label>
                  <Select value={filterBarber} onValueChange={setFilterBarber}>
                    <SelectTrigger className="h-10 w-full min-w-0"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {barbers.map((barber) => <SelectItem key={barber.id} value={barber.id}>{barber.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <Label className="mb-1.5 block text-xs text-muted-foreground">{activeTab === 'services' ? 'Serviço' : 'Produto'}</Label>
                  <Select value={activeTab === 'services' ? filterService : filterProduct} onValueChange={activeTab === 'services' ? setFilterService : setFilterProduct}>
                    <SelectTrigger className="h-10 w-full min-w-0"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {activeTab === 'services' ? services.map((service) => <SelectItem key={service.id} value={service.id}>{service.title}</SelectItem>) : products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <Label className="mb-1.5 block text-xs text-muted-foreground">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-10 w-full min-w-0"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="confirmed">Confirmado</SelectItem>
                      {activeTab === 'services' && <SelectItem value="completed">Concluído</SelectItem>}
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {activeTab === 'services' && (
                  <div className="min-w-0">
                    <Label className="mb-1.5 block text-xs text-muted-foreground">Tipo</Label>
                    <Select value={filterType} onValueChange={(value) => setFilterType(value as typeof filterType)}>
                      <SelectTrigger className="h-10 w-full min-w-0"><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="min-w-0">
                  <Label className="mb-1.5 block text-xs text-muted-foreground">Pagamento</Label>
                  <Select value={filterPayment} onValueChange={(value) => setFilterPayment(value as typeof filterPayment)}>
                    <SelectTrigger className="h-10 w-full min-w-0"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                      <SelectItem value="none">Sem pagamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <Card className="bg-card border-border shadow-lg w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex flex-wrap items-center gap-3 text-lg sm:text-xl">
            <Calendar className="h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
            <span>Histórico CP</span>
            <Button type="button" className="h-11 w-full gap-2 px-4 sm:ml-auto sm:w-auto" onClick={() => setManualLauncherOpen(true)}>
              <Plus className="h-4 w-4" />
              Novo lançamento manual
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent ref={contentRef} className="p-2 sm:p-3 md:p-4 lg:p-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>


          {/* Abas */}
          <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as 'services' | 'products'); if (value === 'products' && filterStatus === 'completed') setFilterStatus('all'); }} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="services" className="flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                Serviços
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Produtos
              </TabsTrigger>
            </TabsList>
            {contentWidth < 1100 ? (
              <>
                <Button type="button" variant="outline" className="mt-3 h-11 w-full justify-center gap-2" onClick={() => setMobileFiltersOpen(true)}>
                  <Filter className="h-4 w-4 text-primary" />
                  Filtros do histórico
                  {activeHistoryFilterCount > 0 && <Badge className="ml-1 h-5 min-w-5 justify-center px-1 text-xs">{activeHistoryFilterCount}</Badge>}
                </Button>
                <Dialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto p-3 sm:p-5">
                    <DialogHeader>
                      <DialogTitle className="sr-only">Filtros do histórico</DialogTitle>
                      <DialogDescription className="sr-only">Filtre os registros do histórico por período, cliente, barbeiro e outros critérios.</DialogDescription>
                    </DialogHeader>
                    {historyFilters}
                    <Button type="button" className="w-full" onClick={() => setMobileFiltersOpen(false)}>Ver resultados</Button>
                  </DialogContent>
                </Dialog>
              </>
            ) : historyFilters}

            {/* Aba de Serviços */}
            <TabsContent value="services" className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : appointments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 sm:py-12 text-sm">
                  Nenhum agendamento encontrado com os filtros selecionados.
                </p>
              ) : (
                <>
                  {contentWidth < 1600 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {appointments.map((apt) => (
                        <MobileAppointmentCard key={apt.id} appointment={apt} />
                      ))}
                    </div>
                  ) : (
                    // Desktop: Tabela
                    <div className="w-full overflow-hidden" style={{ maxWidth: '100%' }}>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1600px] table-fixed text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[80px] sm:w-[100px]">Data</th>
                              <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[60px] sm:w-[80px]">Horário</th>
                              <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[120px] sm:w-[150px]">Cliente</th>
                              <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[100px] sm:w-[120px]">Barbeiro</th>
                              <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[120px] sm:w-[150px]">Serviço</th>
                              <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[100px] sm:w-[120px]">Pagamento</th>
                              <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[70px] sm:w-[80px]">Tipo</th>
                              <th className="w-[140px] whitespace-nowrap px-2 py-3 text-left">Status</th>
                              <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[70px] sm:w-[80px]">Foto</th>
                              <th className="sticky right-0 z-20 w-[440px] border-l border-border bg-card px-2 py-3 text-right shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.45)]">Ações</th>
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
                                    <div className="flex items-center gap-2 mb-1">
                                      {(() => {
                                        try {
                                          const n = apt.notes ? JSON.parse(apt.notes) : null;
                                          if (n && n.fit === true) {
                                            return (
                                              <Badge className="bg-purple-600 text-white border-none text-[10px] h-5 px-2 font-bold uppercase shadow-sm">
                                                Encaixe
                                              </Badge>
                                            );
                                          }
                                        } catch {}
                                        return null;
                                      })()}
                                      <div className="text-xs sm:text-sm font-medium truncate max-w-[120px]" title={apt.service?.title || 'N/A'}>
                                        {apt.service?.title || 'N/A'}
                                      </div>
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
                                <td className="whitespace-nowrap px-2 py-3">{getStatusBadge(apt.status)}</td>
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
                                        src={getOptimizedStorageImageUrl(apt.photo_url, { width: 128, height: 128, quality: 60, resize: 'cover' })}
                                        alt="Foto do atendimento"
                                        onError={(event) => { if (event.currentTarget.src !== apt.photo_url) event.currentTarget.src = apt.photo_url || ''; }}
                                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-md object-cover border border-border"
                                      />
                                    </button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="sticky right-0 z-10 border-l border-border bg-card px-2 py-3 align-middle shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.45)]">
                                  <div className="flex w-full items-center justify-end gap-2 whitespace-nowrap">
                                    {apt.status !== 'completed' && (
                                      <Button
                                        size="sm"
                                        variant="default"
                                        onClick={() => handleCompleteAppointment(apt)}
                                        disabled={completingAppointmentId === apt.id}
                                        className="h-11 min-w-[96px] bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700"
                                        aria-label="Concluir agendamento"
                                      >
                                        {completingAppointmentId === apt.id ? (
                                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                        )}
                                        <span>Concluir</span>
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEdit(apt)}
                                      className="h-11 min-w-[84px] border-sky-500/40 bg-sky-500/10 px-3 text-xs text-sky-300 hover:bg-sky-500/20"
                                      aria-label="Editar agendamento"
                                    >
                                      <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                                      <span>Editar</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        setDeletingAppointment(apt);
                                        setDeleteDialogOpen(true);
                                      }}
                                      className="h-11 min-w-[84px] px-3 text-xs"
                                      aria-label="Excluir agendamento"
                                    >
                                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                      <span>Excluir</span>
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
                  <div className="flex justify-end mt-2">
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">Total de serviços no período</div>
                      <div className="font-bold text-primary">R$ {servicesTotal.toFixed(2)}</div>
                    </div>
                  </div>
                </>
              )}
              {appointments.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-border/60">
                  <span className="text-xs text-muted-foreground">
                    Mostrando {servicesStartIndex}-{servicesEndIndex} de {servicesTotalCount}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      disabled={servicesPage <= 1}
                      onClick={() => setServicesPage((prev) => Math.max(1, prev - 1))}
                    >
                      Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground min-w-[68px] text-center">
                      {servicesPage} / {servicesTotalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      disabled={servicesPage >= servicesTotalPages}
                      onClick={() => setServicesPage((prev) => Math.min(servicesTotalPages, prev + 1))}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Aba de Produtos */}
            <TabsContent value="products" className="mt-4">
              {loadingProductSales ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : productSales.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 sm:py-12 text-sm">
                  Nenhuma venda encontrada com os filtros selecionados.
                </p>
              ) : (
                <>
                  {contentWidth < 1300 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {productSales.map((sale) => (
                        <MobileProductCard key={sale.id} sale={sale} />
                      ))}
                    </div>
                  ) : (
                    // Desktop: Tabela
                    <div className="w-full overflow-hidden" style={{ maxWidth: '100%' }}>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1300px] table-fixed text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[80px] sm:w-[100px]">Data</th>
                              <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[60px] sm:w-[80px]">Horário</th>
                              <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[160px] sm:w-[200px]">Produto</th>
                              <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[80px] sm:w-[90px]">Qtd</th>
                              <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[110px] sm:w-[130px]">Total</th>
                              <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[120px] sm:w-[140px]">Barbeiro</th>
                              <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[110px] sm:w-[130px]">Pagamento</th>
                              <th className="w-[140px] whitespace-nowrap px-2 py-3 text-left">Status</th>
                              <th className="text-left py-2 sm:py-3 px-1 sm:px-2">Observação</th>
                              <th className="sticky right-0 z-20 w-[300px] border-l border-border bg-card px-2 py-3 text-right shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.45)]">Ações</th>
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
                                  {sale.payment_method === 'pix' && (
                                    <Badge className="bg-green-500/20 text-green-600 text-xs">Pix</Badge>
                                  )}
                                  {sale.payment_method === 'dinheiro' && (
                                    <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs">Dinheiro</Badge>
                                  )}
                                  {sale.payment_method === 'cartao' && (
                                    <Badge className="bg-blue-500/20 text-blue-600 text-xs">Cartão</Badge>
                                  )}
                                  {!sale.payment_method && (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
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
                                <td className="sticky right-0 z-10 border-l border-border bg-card px-2 py-3 align-middle shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.45)]">
                                  <div className="flex w-full items-center justify-end gap-2 whitespace-nowrap">
                                    {sale.status !== 'confirmed' && (
                                      <Button
                                        size="sm"
                                        variant="default"
                                        onClick={() => handleCompleteProductSale(sale)}
                                        disabled={completingSaleId === sale.id}
                                        className="h-11 min-w-[106px] bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700"
                                        aria-label="Confirmar venda"
                                      >
                                        {completingSaleId === sale.id ? (
                                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                        )}
                                        <span>Confirmar</span>
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        setDeletingSale(sale);
                                        setDeleteSaleDialogOpen(true);
                                      }}
                                      className="h-11 min-w-[84px] px-3 text-xs"
                                      aria-label="Excluir venda"
                                    >
                                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                      <span>Excluir</span>
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
                  <div className="flex justify-end mt-2">
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">Total de produtos no período</div>
                      <div className="font-bold text-primary">R$ {productsTotal.toFixed(2)}</div>
                    </div>
                  </div>
                </>
              )}
              {productSales.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-border/60">
                  <span className="text-xs text-muted-foreground">
                    Mostrando {productsStartIndex}-{productsEndIndex} de {productsTotalCount}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      disabled={productsPage <= 1}
                      onClick={() => setProductsPage((prev) => Math.max(1, prev - 1))}
                    >
                      Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground min-w-[68px] text-center">
                      {productsPage} / {productsTotalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      disabled={productsPage >= productsTotalPages}
                      onClick={() => setProductsPage((prev) => Math.min(productsTotalPages, prev + 1))}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
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

      <Dialog open={manualLauncherOpen} onOpenChange={setManualLauncherOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo lançamento manual</DialogTitle>
            <DialogDescription>Selecione o barbeiro e o tipo de registro que deseja criar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-1.5 block text-sm" htmlFor="manual-launcher-barber">Barbeiro</Label>
              <Select value={manualBarberId} onValueChange={setManualBarberId}>
                <SelectTrigger id="manual-launcher-barber" className="h-11 w-full">
                  <SelectValue placeholder="Selecione um barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((barber) => <SelectItem key={barber.id} value={barber.id}>{barber.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button type="button" className="h-11 w-full" disabled={!manualBarberId} onClick={() => handleOpenManualDialog('service')}>
                <Scissors className="h-4 w-4" /> Registrar serviço
              </Button>
              <Button type="button" variant="outline" className="h-11 w-full" disabled={!manualBarberId} onClick={() => handleOpenManualDialog('product')}>
                <ShoppingBag className="h-4 w-4" /> Registrar produto
              </Button>
            </div>
          </div>
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
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Pagamento</Label>
                    <Select value={manualPaymentMethod} onValueChange={(v) => setManualPaymentMethod(v as 'pix' | 'dinheiro' | 'cartao')}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">Pix</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                      </SelectContent>
                    </Select>
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

      {/* Dialog de Confirmação de Exclusão de Venda */}
      <AlertDialog open={deleteSaleDialogOpen} onOpenChange={setDeleteSaleDialogOpen}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta venda de produto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
            {deletingSale && (
              <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-left">
                <div><strong>Produto:</strong> {deletingSale.product?.name || 'N/A'}</div>
                <div><strong>Data:</strong> {format(new Date(deletingSale.sale_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</div>
                <div><strong>Horário:</strong> {deletingSale.sale_time}</div>
                <div><strong>Qtd:</strong> {deletingSale.quantity}</div>
                <div><strong>Total:</strong> R$ {Number(deletingSale.total_price).toFixed(2)}</div>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSaleLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSale}
              disabled={deletingSaleLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingSaleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HistoricoCP;
