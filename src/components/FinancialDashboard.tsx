import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Calendar, Users, Filter, Loader2 } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuRadioGroup, 
  DropdownMenuRadioItem 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, endOfMonth, startOfWeek, startOfMonth, startOfYear, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { IndividualCommissionManager } from '@/components/IndividualCommissionManager';
import BarberAdvancesManager from '@/components/admin/BarberAdvancesManager';
import ReportsManager from '@/components/admin/ReportsManager';
import { useBarberCommissions } from '@/hooks/useBarberCommissions';
import { useBarberFixedCommissions } from '@/hooks/useBarberFixedCommissions';
import { useBarberProductCommissions } from '@/hooks/useBarberProductCommissions';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  booking_type: string;
  status: string;
  created_at: string;
  payment_method?: string;
  barber_id: string;
  service_id: string;
  service: { price: number; title: string } | null;
  barber: { name: string } | null;
  appointment_payments?: { amount: number; payment_method: string }[];
}

interface Barber {
  id: string;
  name: string;
}

interface Service {
  id: string;
  title: string;
}

interface Product {
  id: string;
  name: string;
  price?: number;
}

interface ProductSale {
  id: string;
  sale_date: string;
  sale_time: string;
  total_price: number;
  commission_value: number;
  barber_id: string;
  product_id: string;
  barber?: { name: string } | null;
  product?: { name: string } | null;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

const FinancialDashboard = () => {
  const { role } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('week');
  const [dateFrom, setDateFrom] = useState<string>(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState<string>(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterType, setFilterType] = useState<'all' | 'local' | 'online' | 'manual'>('all');
  const [filterBarber, setFilterBarber] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'confirmed' | 'cancelled'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'commissions' | 'advances' | 'reports'>('overview');
  const [showFilters, setShowFilters] = useState(false);
  const [recentTab, setRecentTab] = useState<'appointments' | 'products'>('appointments');
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualType, setManualType] = useState<'service' | 'product'>('service');
  const [manualBarberId, setManualBarberId] = useState<string>('');
  const [manualServiceId, setManualServiceId] = useState<string>('');
  const [manualProductId, setManualProductId] = useState<string>('');
  const [manualQuantity, setManualQuantity] = useState<number>(1);
  const [manualDate, setManualDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [manualTime, setManualTime] = useState<string>(() => format(new Date(), 'HH:mm'));
  const [manualClientName, setManualClientName] = useState<string>('');
  const [manualSaving, setManualSaving] = useState(false);
  
  const isManager = role === 'admin' || role === 'gestor';

  const { 
    calculateCommission: calculateIndividualCommission,
    loadAllCommissions: loadAllIndividualCommissions,
  } = useBarberCommissions(null);

  const {
    calculateServiceCommission: calculateFixedServiceCommission,
    loadAllCommissions: loadAllFixedCommissions,
    getProductCommissionPercentage: getFixedProductCommissionPercentage,
  } = useBarberFixedCommissions(null);

  const {
    loadAllCommissions: loadAllProductCommissions,
    getCommissionPercentage: getIndividualProductCommissionPercentage,
  } = useBarberProductCommissions(null);

  useEffect(() => {
    loadBarbers();
    loadServices();
    loadProducts();
  }, []);

  useEffect(() => {
    if (isManager) {
      loadAllIndividualCommissions();
      loadAllFixedCommissions();
      loadAllProductCommissions();
    }
  }, [isManager, loadAllIndividualCommissions, loadAllFixedCommissions, loadAllProductCommissions]);

  useEffect(() => {
    loadAppointments();
    loadProductSales();
  }, [period, dateFrom, dateTo, filterType, filterBarber, filterService, filterProduct, filterStatus]);

  // Subscriptions Realtime separadas — criadas apenas uma vez
  useEffect(() => {
    let apptRemoved = false;
    const appointmentsChannel = supabase
      .channel('financial-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' },
        () => { loadAppointments(); }
      )
      .subscribe((status: string) => {
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !apptRemoved) {
          apptRemoved = true;
          setTimeout(() => { try { supabase.removeChannel(appointmentsChannel); } catch { /* ignore */ } }, 0);
        }
      });

    let salesRemoved = false;
    const productSalesChannel = supabase
      .channel('financial-product-sales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_sales' },
        () => { loadProductSales(); }
      )
      .subscribe((status: string) => {
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !salesRemoved) {
          salesRemoved = true;
          setTimeout(() => { try { supabase.removeChannel(productSalesChannel); } catch { /* ignore */ } }, 0);
        }
      });

    return () => {
      apptRemoved = true;
      salesRemoved = true;
      try { supabase.removeChannel(appointmentsChannel); } catch { /* ignore */ }
      try { supabase.removeChannel(productSalesChannel); } catch { /* ignore */ }
    };
  }, []);

  const loadBarbers = async () => {
    const { data } = await supabase
      .from('barbers')
      .select('id, name')
      .eq('visible', true);
    setBarbers(data || []);
  };

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, title, price')
      .eq('visible', true);
    setServices(data || []);
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('visible', true);
    setProducts(data || []);
  };

  const getDateRange = () => {
    const today = new Date();
    if (period === 'custom' && dateFrom && dateTo) {
      const startParsed = startOfDay(parse(dateFrom, 'yyyy-MM-dd', new Date()));
      const endParsed = endOfDay(parse(dateTo, 'yyyy-MM-dd', new Date()));
      return { start: startParsed, end: endParsed };
    }
    switch (period) {
      case 'day':
        return { start: startOfDay(today), end: endOfDay(today) };
      case 'week':
        return { start: startOfWeek(today, { weekStartsOn: 0 }), end: today };
      case 'month':
        return { start: startOfMonth(today), end: today };
      case 'year':
        return { start: startOfYear(today), end: today };
      default:
        return { start: startOfWeek(today, { weekStartsOn: 0 }), end: today };
    }
  };

  const loadAppointments = async () => {
    const { start, end } = getDateRange();
    
    let query = supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        booking_type,
        status,
        created_at,
        payment_method,
        barber_id,
        service_id,
        service:services(price, title),
        barber:barbers(name),
        appointment_payments(amount, payment_method)
      `)
      .gte('appointment_date', format(start, 'yyyy-MM-dd'))
      .lte('appointment_date', format(end, 'yyyy-MM-dd'));

    if (filterType !== 'all') {
      query = query.eq('booking_type', filterType);
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

    const { data, error } = await query.order('appointment_date', { ascending: false });

    if (error) {
      console.error('Error loading appointments:', error);
      return;
    }

    setAppointments((data as any) || []);
  };

  const loadProductSales = async () => {
    const { start, end } = getDateRange();
    
    let query = (supabase as any)
      .from('product_sales')
      .select(`
        id,
        sale_date,
        sale_time,
        total_price,
        commission_value,
        barber_id,
        product_id,
        barber:barbers(name),
        product:products(name)
      `)
      .eq('status', 'confirmed')
      .gte('sale_date', format(start, 'yyyy-MM-dd'))
      .lte('sale_date', format(end, 'yyyy-MM-dd'));

    if (filterBarber !== 'all') {
      query = query.eq('barber_id', filterBarber);
    }
    if (filterProduct !== 'all') {
      query = query.eq('product_id', filterProduct);
    }

    const { data, error } = await query.order('sale_date', { ascending: false });

    if (error) {
      console.error('Error loading product sales:', error);
      return;
    }

    setProductSales((data as any) || []);
  };

  const handleOpenManualDialog = (type: 'service' | 'product') => {};

  const handleSaveManualSale = async () => {};

  // Helper to calculate appointment revenue considering split payments
  const getAppointmentRevenue = (apt: Appointment) => {
    const paymentsTotal = apt.appointment_payments?.reduce((pSum, p) => pSum + Number(p.amount), 0) || 0;
    return paymentsTotal > 0 ? paymentsTotal : ((apt.service as any)?.price || 0);
  };

  const getServiceCommissionValue = (apt: Appointment): number => {
    if (!apt.service || !apt.service_id || !apt.barber_id) return 0;
    const paymentsTotal = apt.appointment_payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const servicePrice = paymentsTotal > 0 ? paymentsTotal : (apt.service.price || 0);
    const individual = calculateIndividualCommission(apt.barber_id, apt.service_id, servicePrice);
    if (individual > 0) return individual;
    return calculateFixedServiceCommission(apt.barber_id, servicePrice);
  };

  // Calculate stats
  const completedAndConfirmed = appointments.filter(
    apt => apt.status === 'completed' || apt.status === 'confirmed'
  );

  const totalRevenue = completedAndConfirmed.reduce(
    (sum, apt) => sum + getAppointmentRevenue(apt),
    0
  );

  const totalServiceCommission = completedAndConfirmed.reduce(
    (sum, apt) => sum + getServiceCommissionValue(apt),
    0
  );
  
  const totalProductRevenue = productSales.reduce((sum, sale) => sum + sale.total_price, 0);
  const totalProductCommission = productSales.reduce((sum, sale) => sum + sale.commission_value, 0);
  const totalRevenueWithProducts = totalRevenue + totalProductRevenue;
  const totalCommission = totalServiceCommission + totalProductCommission;
  const serviceTicketBase = completedAndConfirmed.length;
  const averageServiceTicket =
    serviceTicketBase > 0 ? totalRevenue / serviceTicketBase : 0;
  
  const totalAppointments = appointments.length;
  const completedCount = appointments.filter(apt => apt.status === 'completed').length;
  const confirmedCount = appointments.filter(apt => apt.status === 'confirmed').length;
  const cancelledCount = appointments.filter(apt => apt.status === 'cancelled').length;
  const localCount = appointments.filter(apt => apt.booking_type === 'local').length;
  const onlineCount = appointments.filter(apt => apt.booking_type === 'online').length;
  const manualCount = appointments.filter(apt => apt.booking_type === 'manual').length;

  // Chart data by date
  const chartDataByDate = () => {
    const grouped: Record<string, { date: string; receita: number; agendamentos: number }> = {};
    
    appointments
      .filter(apt => apt.status === 'completed' || apt.status === 'confirmed')
      .forEach((apt) => {
        const dateKey = period === 'day' 
          ? apt.appointment_time.slice(0, 2) + 'h'
          : format(new Date(apt.appointment_date + 'T00:00:00'), 'dd/MM');
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = { date: dateKey, receita: 0, agendamentos: 0 };
        }
        grouped[dateKey].receita += getAppointmentRevenue(apt);
        grouped[dateKey].agendamentos += 1;
      });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  };

  // Chart data by booking type
  const chartDataByType = [
    { name: 'Local', value: localCount, color: COLORS[0] },
    { name: 'Online', value: onlineCount, color: COLORS[1] },
  ].filter(d => d.value > 0);

  // Chart data by status
  const chartDataByStatus = [
    { name: 'Confirmados', value: confirmedCount, color: '#22c55e' },
    { name: 'Concluídos', value: completedCount, color: COLORS[0] },
    { name: 'Cancelados', value: cancelledCount, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Revenue by barber (including products)
  const revenueByBarber = () => {
    const grouped: Record<string, number> = {};
    appointments
      .filter(apt => apt.status === 'completed' || apt.status === 'confirmed')
      .forEach((apt) => {
        const barberName = (apt.barber as any)?.name || 'Desconhecido';
        grouped[barberName] = (grouped[barberName] || 0) + getAppointmentRevenue(apt);
      });
    productSales.forEach((sale) => {
      const barberName = (sale.barber as any)?.name || 'Desconhecido';
      grouped[barberName] = (grouped[barberName] || 0) + sale.total_price;
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  };

  // Revenue by service
  const revenueByService = () => {
    const grouped: Record<string, { count: number; revenue: number }> = {};
    appointments
      .filter(apt => apt.status === 'completed' || apt.status === 'confirmed')
      .forEach((apt) => {
        const serviceName = (apt.service as any)?.title || 'Desconhecido';
        if (!grouped[serviceName]) {
          grouped[serviceName] = { count: 0, revenue: 0 };
        }
        grouped[serviceName].count += 1;
        grouped[serviceName].revenue += getAppointmentRevenue(apt);
      });
    return Object.entries(grouped).map(([name, data]) => ({ 
      name, 
      quantidade: data.count,
      receita: data.revenue 
    }));
  };

  // Revenue by product
  const revenueByProduct = () => {
    const grouped: Record<string, { count: number; revenue: number; commission: number }> = {};
    productSales.forEach((sale) => {
      const productName = (sale.product as any)?.name || 'Desconhecido';
      if (!grouped[productName]) {
        grouped[productName] = { count: 0, revenue: 0, commission: 0 };
      }
      grouped[productName].count += 1;
      grouped[productName].revenue += sale.total_price;
      grouped[productName].commission += sale.commission_value;
    });
    return Object.entries(grouped).map(([name, data]) => ({ 
      name, 
      quantidade: data.count,
      receita: data.revenue,
      comissao: data.commission
    }));
  };

  // Revenue by payment method
  const revenueByPaymentMethod = () => {
    const grouped: Record<string, number> = {};
    
    appointments
      .filter(apt => apt.status === 'completed' || apt.status === 'confirmed')
      .forEach((apt) => {
        if (apt.appointment_payments && apt.appointment_payments.length > 0) {
            apt.appointment_payments.forEach(p => {
                let method = p.payment_method || 'Outros';
                // Capitalize
                method = method.charAt(0).toUpperCase() + method.slice(1);
                if (method === 'Cartao') method = 'Cartão';
                
                grouped[method] = (grouped[method] || 0) + Number(p.amount);
            });
        } else {
            // Fallback
            const price = getAppointmentRevenue(apt);
            if (price > 0) {
                let method = apt.payment_method || 'Não definido';
                method = method.charAt(0).toUpperCase() + method.slice(1);
                if (method === 'Cartao') method = 'Cartão';
                
                grouped[method] = (grouped[method] || 0) + price;
            }
        }
      });
      
    return Object.entries(grouped)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
  };

  // Chart data by date (including products)
  const chartDataByDateWithProducts = () => {
    const grouped: Record<string, { date: string; receita: number; receitaProdutos: number; agendamentos: number }> = {};
    
    appointments
      .filter(apt => apt.status === 'completed' || apt.status === 'confirmed')
      .forEach((apt) => {
        const dateKey = period === 'day' 
          ? apt.appointment_time.slice(0, 2) + 'h'
          : format(new Date(apt.appointment_date + 'T00:00:00'), 'dd/MM');
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = { date: dateKey, receita: 0, receitaProdutos: 0, agendamentos: 0 };
        }
        grouped[dateKey].receita += getAppointmentRevenue(apt);
        grouped[dateKey].agendamentos += 1;
      });

    productSales.forEach((sale) => {
      const dateKey = period === 'day' 
        ? sale.sale_time.slice(0, 2) + 'h'
        : format(new Date(sale.sale_date + 'T00:00:00'), 'dd/MM');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, receita: 0, receitaProdutos: 0, agendamentos: 0 };
      }
      grouped[dateKey].receitaProdutos += sale.total_price;
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  };

  const getPeriodLabel = () => {
    if (period === 'custom' && dateFrom && dateTo) {
      const startLabel = format(parse(dateFrom, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR });
      const endLabel = format(parse(dateTo, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR });
      return `${startLabel} até ${endLabel}`;
    }
    switch (period) {
      case 'day': return 'Hoje';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mês';
      case 'year': return 'Este Ano';
      default: return 'Período';
    }
  };

  const renderContent = () => (
    <>
      {/* Filters */}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2 text-xs"
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter className="h-3 w-3 mr-1" />
          {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
        </Button>
      </div>
      <Card className={`bg-card border-border ${showFilters ? '' : 'hidden'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs w-full truncate justify-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  Período: {period === 'day' ? 'Diário' : period === 'week' ? 'Semanal' : period === 'month' ? 'Mensal' : period === 'year' ? 'Anual' : 'Personalizado'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel className="text-xs">Período</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={period} onValueChange={(v) => setPeriod(v as any)}>
                  <DropdownMenuRadioItem value="day">Diário</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="week">Semanal</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="month">Mensal</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="year">Anual</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="custom">Personalizado</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {period === 'custom' && (
              <>
                <div className="min-w-[160px]">
                  <label className="text-xs text-muted-foreground mb-1 block">Data inicial</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="min-w-[160px]">
                  <label className="text-xs text-muted-foreground mb-1 block">Data final</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs w-full truncate justify-center">
                  <Users className="h-3 w-3 mr-1" />
                  Tipo: {filterType === 'all' ? 'Todos' : filterType === 'local' ? 'Local' : filterType === 'online' ? 'Online' : 'Manual'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel className="text-xs">Tipo</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                  <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="local">Local</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="online">Online</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="manual">Manual (Retroativo)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs w-full truncate justify-center">
                  <Users className="h-3 w-3 mr-1" />
                  Barbeiro: {barbers.find(b => b.id === filterBarber)?.name || 'Todos'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel className="text-xs">Barbeiro</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={filterBarber} onValueChange={setFilterBarber}>
                  <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                  {barbers.map((b) => (
                    <DropdownMenuRadioItem key={b.id} value={b.id}>{b.name}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs w-full truncate justify-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Serviço: {services.find(s => s.id === filterService)?.title || 'Todos'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel className="text-xs">Serviço</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={filterService} onValueChange={setFilterService}>
                  <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                  {services.map((s) => (
                    <DropdownMenuRadioItem key={s.id} value={s.id}>{s.title}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs w-full truncate justify-center">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Produto: {products.find(p => p.id === filterProduct)?.name || 'Todos'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel className="text-xs">Produto</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={filterProduct} onValueChange={setFilterProduct}>
                  <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                  {products.map((p) => (
                    <DropdownMenuRadioItem key={p.id} value={p.id}>{p.name}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs w-full truncate justify-center">
                  <Filter className="h-3 w-3 mr-1" />
                  Status: {filterStatus === 'all' ? 'Todos' : filterStatus === 'confirmed' ? 'Confirmados' : filterStatus === 'completed' ? 'Concluídos' : 'Cancelados'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                  <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="confirmed">Confirmados</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="completed">Concluídos</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="cancelled">Cancelados</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita do Período ({getPeriodLabel()})</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {totalRevenueWithProducts.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {confirmedCount + completedCount} serviços + {productSales.length} produtos
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita de Produtos</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {totalProductRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {productSales.length} vendas realizadas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita de Serviços</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Apenas serviços concluídos/confirmados
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissão do Período</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {totalCommission.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Serviços e produtos no período
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissão de Produtos</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {totalProductCommission.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Comissões de produtos vendidos no período
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissão de Serviços</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {totalServiceCommission.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total de comissões de serviços no período
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Agendamentos</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalAppointments}</div>
              <p className="text-xs text-muted-foreground">
                {localCount} local • {onlineCount} online{manualCount > 0 && ` • ${manualCount} manual`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {totalAppointments > 0
                  ? Math.round(((confirmedCount + completedCount) / totalAppointments) * 100)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                {cancelledCount} cancelamentos
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio Produtos</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {productSales.length > 0
                  ? (totalProductRevenue / productSales.length).toFixed(2)
                  : '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">por venda</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio Serviços</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {averageServiceTicket.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">por atendimento de serviço</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Revenue over time (including products) */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Receita e Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartDataByDateWithProducts()}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar yAxisId="left" dataKey="receita" fill="hsl(var(--primary))" name="Receita Serviços (R$)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="receitaProdutos" fill="#22c55e" name="Receita Produtos (R$)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="agendamentos" fill="hsl(var(--secondary))" name="Agendamentos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution by type */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartDataByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartDataByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by payment method */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Receita por Método</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByPaymentMethod()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by barber */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Receita por Barbeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByBarber()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by service */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Receita por Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByService()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={120} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'receita' ? `R$ ${value.toFixed(2)}` : value,
                    name === 'receita' ? 'Receita' : 'Quantidade'
                  ]}
                />
                <Legend />
                <Bar dataKey="quantidade" fill="hsl(var(--secondary))" name="Quantidade" radius={[0, 4, 4, 0]} />
                <Bar dataKey="receita" fill="hsl(var(--primary))" name="Receita (R$)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by product */}
        {revenueByProduct().length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Receita por Produto</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByProduct()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={120} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'receita' || name === 'comissao' ? `R$ ${value.toFixed(2)}` : value,
                      name === 'receita' ? 'Receita' : name === 'comissao' ? 'Comissão' : 'Quantidade'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="quantidade" fill="hsl(var(--secondary))" name="Quantidade" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="receita" fill="#22c55e" name="Receita (R$)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="comissao" fill="#f59e0b" name="Comissão (R$)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent records table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Registros Recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6">
          <div className="w-full overflow-hidden" style={{ maxWidth: '100%' }}>
            <Tabs value={recentTab} onValueChange={(v) => setRecentTab(v as 'appointments' | 'products')} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="appointments" className="text-xs sm:text-sm">Agendamentos</TabsTrigger>
                <TabsTrigger value="products" className="text-xs sm:text-sm">Produtos</TabsTrigger>
              </TabsList>
              <TabsContent value="appointments">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: '600px' }}>
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2">Data</th>
                        <th className="text-left py-3 px-2">Horário</th>
                        <th className="text-left py-3 px-2">Serviço</th>
                        <th className="text-left py-3 px-2">Barbeiro</th>
                        <th className="text-left py-3 px-2">Tipo</th>
                        <th className="text-left py-3 px-2">Pagamento</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-right py-3 px-2">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.slice(0, 10).map((apt) => (
                        <tr key={apt.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-3 px-2">
                            {format(new Date(apt.appointment_date + 'T00:00:00'), 'dd/MM/yyyy')}
                          </td>
                          <td className="py-3 px-2">{apt.appointment_time}</td>
                          <td className="py-3 px-2">{(apt.service as any)?.title || '-'}</td>
                          <td className="py-3 px-2">{(apt.barber as any)?.name || '-'}</td>
                          <td className="py-3 px-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                apt.booking_type === 'local'
                                  ? 'bg-primary/20 text-primary'
                                  : apt.booking_type === 'manual'
                                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}
                              title={
                                apt.booking_type === 'manual'
                                  ? 'Agendamento criado manualmente pelo barbeiro (retroativo)'
                                  : ''
                              }
                            >
                              {apt.booking_type === 'local'
                                ? 'Local'
                                : apt.booking_type === 'manual'
                                ? '📝 Manual'
                                : 'Online'}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            {apt.appointment_payments && apt.appointment_payments.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {apt.appointment_payments.map((p, idx) => (
                                  <span key={idx} className="text-xs text-muted-foreground whitespace-nowrap">
                                    {p.payment_method === 'pix'
                                      ? 'Pix'
                                      : p.payment_method === 'cartao'
                                      ? 'Cartão'
                                      : p.payment_method === 'dinheiro'
                                      ? 'Dinheiro'
                                      : 'Outro'}
                                    : R$ {Number(p.amount).toFixed(2)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {apt.payment_method ? (
                                  <>
                                    {apt.payment_method === 'pix'
                                      ? 'Pix'
                                      : apt.payment_method === 'cartao'
                                      ? 'Cartão'
                                      : apt.payment_method === 'dinheiro'
                                      ? 'Dinheiro'
                                      : apt.payment_method}
                                  </>
                                ) : (
                                  '-'
                                )}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                apt.status === 'confirmed'
                                  ? 'bg-green-500/20 text-green-400'
                                  : apt.status === 'completed'
                                  ? 'bg-primary/20 text-primary'
                                  : apt.status === 'cancelled'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}
                            >
                              {apt.status === 'confirmed'
                                ? 'Confirmado'
                                : apt.status === 'completed'
                                ? 'Concluído'
                                : apt.status === 'cancelled'
                                ? 'Cancelado'
                                : 'Pendente'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right font-medium text-primary">
                            R$ {((apt.service as any)?.price || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {appointments.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-muted-foreground">
                            Nenhum agendamento encontrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              <TabsContent value="products">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: '600px' }}>
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2">Data</th>
                        <th className="text-left py-3 px-2">Hora</th>
                        <th className="text-left py-3 px-2">Produto</th>
                        <th className="text-left py-3 px-2">Barbeiro</th>
                        <th className="text-right py-3 px-2">Total</th>
                        <th className="text-right py-3 px-2">Comissão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productSales.slice(0, 10).map((sale) => (
                        <tr key={sale.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-3 px-2">
                            {format(new Date(sale.sale_date + 'T00:00:00'), 'dd/MM/yyyy')}
                          </td>
                          <td className="py-3 px-2">{sale.sale_time}</td>
                          <td className="py-3 px-2">{(sale.product as any)?.name || '-'}</td>
                          <td className="py-3 px-2">{(sale.barber as any)?.name || '-'}</td>
                          <td className="py-3 px-2 text-right">
                            R$ {Number(sale.total_price || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-2 text-right">
                            R$ {Number(sale.commission_value || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {productSales.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted-foreground">
                            Nenhuma venda de produto encontrada
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent className="max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle>
              {manualType === 'service' ? 'Lançar venda de serviço' : 'Lançar venda de produto'}
            </DialogTitle>
            <DialogDescription>
              Lançamento manual vinculado ao barbeiro selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Barbeiro</label>
              <Input
                value={barbers.find(b => b.id === manualBarberId)?.name || ''}
                readOnly
                className="h-9 text-sm"
              />
            </div>
            {manualType === 'service' ? (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Serviço</label>
                  <Select value={manualServiceId} onValueChange={setManualServiceId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nome do cliente (opcional)</label>
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
                  <label className="text-xs text-muted-foreground mb-1 block">Produto</label>
                  <Select value={manualProductId} onValueChange={setManualProductId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Quantidade</label>
                  <Input
                    type="number"
                    min={1}
                    value={manualQuantity}
                    onChange={(e) => setManualQuantity(parseInt(e.target.value) || 1)}
                    className="h-9 text-sm"
                  />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data</label>
                <Input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Hora</label>
                <Input
                  type="time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialogOpen(false)} disabled={manualSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveManualSale} disabled={manualSaving}>
              {manualSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar lançamento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return (
    <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      {isManager ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'commissions' | 'advances' | 'reports')} className="w-full" style={{ maxWidth: '100%' }}>
          <TabsList className="grid w-full max-w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Visão Geral</TabsTrigger>
            <TabsTrigger value="commissions" className="text-xs sm:text-sm">Comissões</TabsTrigger>
            <TabsTrigger value="advances" className="text-xs sm:text-sm">Vales</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm">Relatórios</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            {renderContent()}
          </TabsContent>
          
          <TabsContent value="commissions" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            <IndividualCommissionManager />
          </TabsContent>
          
          <TabsContent value="advances" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            <BarberAdvancesManager />
          </TabsContent>
          
          <TabsContent value="reports" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            <ReportsManager />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          {renderContent()}
        </div>
      )}
    </div>
  );
};

export default FinancialDashboard;
