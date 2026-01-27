import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Calendar, Users, Filter } from 'lucide-react';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { IndividualCommissionManager } from '@/components/IndividualCommissionManager';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  booking_type: string;
  status: string;
  created_at: string;
  service: { price: number; title: string } | null;
  barber: { name: string } | null;
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
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [filterType, setFilterType] = useState<'all' | 'local' | 'online' | 'manual'>('all');
  const [filterBarber, setFilterBarber] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'confirmed' | 'cancelled'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'commissions'>('overview');
  
  const isManager = role === 'admin' || role === 'gestor';

  useEffect(() => {
    loadBarbers();
    loadServices();
    loadProducts();
  }, []);

  useEffect(() => {
    loadAppointments();
    loadProductSales();

    // Realtime subscription
    const appointmentsChannel = supabase
      .channel('financial-appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        () => {
          loadAppointments();
        }
      )
      .subscribe();

    const productSalesChannel = supabase
      .channel('financial-product-sales')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_sales',
        },
        () => {
          loadProductSales();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(productSalesChannel);
    };
  }, [period, filterType, filterBarber, filterService, filterProduct, filterStatus]);

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
      .select('id, title')
      .eq('visible', true);
    setServices(data || []);
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name')
      .eq('visible', true);
    setProducts(data || []);
  };

  const getDateRange = () => {
    const today = new Date();
    switch (period) {
      case 'day':
        return { start: startOfDay(today), end: endOfDay(today) };
      case 'week':
        return { start: startOfWeek(today, { weekStartsOn: 0 }), end: today };
      case 'month':
        return { start: startOfMonth(today), end: today };
      case 'year':
        return { start: startOfYear(today), end: today };
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
        barber_id,
        service_id,
        service:services(price, title),
        barber:barbers(name)
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
    
    let query = supabase
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

  // Calculate stats
  const totalRevenue = appointments
    .filter(apt => apt.status === 'completed' || apt.status === 'confirmed')
    .reduce((sum, apt) => sum + ((apt.service as any)?.price || 0), 0);
  
  const totalProductRevenue = productSales.reduce((sum, sale) => sum + sale.total_price, 0);
  const totalProductCommission = productSales.reduce((sum, sale) => sum + sale.commission_value, 0);
  const totalRevenueWithProducts = totalRevenue + totalProductRevenue;
  
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
        grouped[dateKey].receita += (apt.service as any)?.price || 0;
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
        grouped[barberName] = (grouped[barberName] || 0) + ((apt.service as any)?.price || 0);
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
        grouped[serviceName].revenue += (apt.service as any)?.price || 0;
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
        grouped[dateKey].receita += (apt.service as any)?.price || 0;
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
    switch (period) {
      case 'day': return 'Hoje';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mês';
      case 'year': return 'Este Ano';
    }
  };

  const renderContent = () => (
    <>
      {/* Filters */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Período</label>
              <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Diário</SelectItem>
                  <SelectItem value="week">Semanal</SelectItem>
                  <SelectItem value="month">Mensal</SelectItem>
                  <SelectItem value="year">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Tipo</label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="manual">📝 Manual (Retroativo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Barbeiro</label>
              <Select value={filterBarber} onValueChange={setFilterBarber}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Serviço</label>
              <Select value={filterService} onValueChange={setFilterService}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Produto</label>
              <Select value={filterProduct} onValueChange={setFilterProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Status</label>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="confirmed">Confirmados</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita ({getPeriodLabel()})</CardTitle>
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
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {cancelledCount} cancelamentos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              R$ {(confirmedCount + completedCount + productSales.length) > 0 
                ? (totalRevenueWithProducts / (confirmedCount + completedCount + productSales.length)).toFixed(2) 
                : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">por atendimento/produto</p>
          </CardContent>
        </Card>
      </div>

      {/* Product Stats Cards */}
      {productSales.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
              <CardTitle className="text-sm font-medium">Comissões de Produtos</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {totalProductCommission.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total de comissões pagas
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
        </div>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
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

      {/* Recent appointments table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Últimos Agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2">Data</th>
                  <th className="text-left py-3 px-2">Horário</th>
                  <th className="text-left py-3 px-2">Serviço</th>
                  <th className="text-left py-3 px-2">Barbeiro</th>
                  <th className="text-left py-3 px-2">Tipo</th>
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
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        apt.booking_type === 'local' 
                          ? 'bg-primary/20 text-primary' 
                          : apt.booking_type === 'manual'
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'bg-blue-500/20 text-blue-400'
                      }`} title={apt.booking_type === 'manual' ? 'Agendamento criado manualmente pelo barbeiro (retroativo)' : ''}>
                        {apt.booking_type === 'local' ? 'Local' : apt.booking_type === 'manual' ? '📝 Manual' : 'Online'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        apt.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                        apt.status === 'completed' ? 'bg-primary/20 text-primary' :
                        apt.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {apt.status === 'confirmed' ? 'Confirmado' :
                         apt.status === 'completed' ? 'Concluído' :
                         apt.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-primary">
                      R$ {((apt.service as any)?.price || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {appointments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nenhum agendamento encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Product Sales table */}
      {productSales.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Vendas de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2">Data</th>
                    <th className="text-left py-3 px-2">Horário</th>
                    <th className="text-left py-3 px-2">Produto</th>
                    <th className="text-left py-3 px-2">Barbeiro</th>
                    <th className="text-right py-3 px-2">Valor Total</th>
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
                      <td className="py-3 px-2 text-right font-medium text-primary">
                        R$ {sale.total_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-green-400">
                        R$ {sale.commission_value.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );

  return (
    <div className="space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      {isManager ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'commissions')} className="w-full" style={{ maxWidth: '100%' }}>
          <TabsList className="grid w-full max-w-full grid-cols-2">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Visão Geral</TabsTrigger>
            <TabsTrigger value="commissions" className="text-xs sm:text-sm">Comissões</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6 mt-6">
            {renderContent()}
          </TabsContent>
          
          <TabsContent value="commissions" className="space-y-6 mt-6 w-full overflow-x-hidden">
            <IndividualCommissionManager />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          {renderContent()}
        </div>
      )}
    </div>
  );
};

export default FinancialDashboard;