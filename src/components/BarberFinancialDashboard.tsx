import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Calendar, Users, Plus, Banknote } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useBarberFixedCommissions } from '@/hooks/useBarberFixedCommissions';
import { useBarberCommissions } from '@/hooks/useBarberCommissions';
import { useBarberProductCommissions } from '@/hooks/useBarberProductCommissions';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  booking_type: string;
  status: string;
  created_at: string;
  service_id: string;
  service: { price: number; title: string } | null;
}

interface Service {
  id: string;
  title: string;
}

interface ProductSale {
  id: string;
  sale_date: string;
  sale_time: string;
  total_price: number;
  commission_value: number;
  product?: { name: string } | null;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

interface BarberFinancialDashboardProps {
  barberId: string;
}

const BarberFinancialDashboard = ({ barberId }: BarberFinancialDashboardProps) => {
  // Hooks for different commission types (priority: individual > fixed)
  const { calculateCommission: calculateIndividualCommission } = useBarberCommissions(barberId);
  const { calculateServiceCommission: calculateFixedServiceCommission, calculateProductCommission: calculateFixedProductCommission } = useBarberFixedCommissions(barberId);
  const { calculateCommission: calculateIndividualProductCommission } = useBarberProductCommissions(barberId);
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('week');
  const [dateFrom, setDateFrom] = useState<string>(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState<string>(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterType, setFilterType] = useState<'all' | 'local' | 'online' | 'manual'>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'confirmed' | 'cancelled'>('all');
  const [totalAdvances, setTotalAdvances] = useState(0);
  
  // Estados para solicitação de vale
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');
  const [advanceRequestDate, setAdvanceRequestDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [submittingAdvance, setSubmittingAdvance] = useState(false);

  // Helper function to calculate commission for an appointment
  // Priority: 1) Individual commission per service, 2) Fixed commission
  const getCommissionValue = (apt: Appointment): number => {
    if (!apt.service || !apt.service_id) return 0;
    const servicePrice = apt.service.price || 0;
    
    // Try individual commission first
    const individualCommission = calculateIndividualCommission(barberId, apt.service_id, servicePrice);
    if (individualCommission > 0) {
      return individualCommission;
    }
    
    // Fallback to fixed commission
    return calculateFixedServiceCommission(barberId, servicePrice);
  };

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (barberId) {
      loadAppointments();
      loadProductSales();
      loadAdvances();
    }
  }, [barberId, period, dateFrom, dateTo, filterType, filterService, filterStatus]);

  // Realtime subscription - separate effect to avoid re-subscribing on filter changes
  useEffect(() => {
    if (!barberId) return;

    const channel = supabase
      .channel(`financial-barber-${barberId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `barber_id=eq.${barberId}`
        },
        (payload) => {
          // Reload appointments when any change occurs
          loadAppointments();
        }
      )
      .subscribe();

    const salesChannel = supabase
      .channel(`product-sales-barber-${barberId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_sales',
          filter: `barber_id=eq.${barberId}`
        },
        () => {
          loadProductSales();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(salesChannel);
    };
  }, [barberId]);

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, title')
      .eq('visible', true);
    setServices(data || []);
  };

  const getDateRange = () => {
    const today = new Date();
    let start: Date;
    let end: Date;

    if (period === 'custom' && dateFrom && dateTo) {
      start = startOfDay(new Date(dateFrom));
      end = endOfDay(new Date(dateTo));
      return { start, end };
    }

    switch (period) {
      case 'day':
        start = startOfDay(today);
        end = endOfDay(today);
        break;
      case 'week':
        start = startOfWeek(today, { weekStartsOn: 0 });
        end = today;
        break;
      case 'month':
        start = startOfMonth(today);
        end = today;
        break;
      case 'year':
        start = startOfYear(today);
        end = today;
        break;
      default:
        start = startOfWeek(today, { weekStartsOn: 0 });
        end = today;
    }

    return { start, end };
  };

  const loadAppointments = async () => {
    if (!barberId) return;

    const { start, end } = getDateRange();
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');
    
    let query = supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        booking_type,
        status,
        created_at,
        service_id,
        service:services(price, title)
      `)
      .eq('barber_id', barberId);
    
    // Apply date range filter
    if (startDate && endDate) {
      query = query.gte('appointment_date', startDate).lte('appointment_date', endDate);
    }

    if (filterType !== 'all') {
      query = query.eq('booking_type', filterType);
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
    if (!barberId) return;

    const { start, end } = getDateRange();
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');

    let query = supabase
      .from('product_sales')
      .select(`
        id,
        sale_date,
        sale_time,
        total_price,
        commission_value,
        product:products(name)
      `)
      .eq('barber_id', barberId);

    if (startDate && endDate) {
      query = query.gte('sale_date', startDate).lte('sale_date', endDate);
    }

    const { data, error } = await query.order('sale_date', { ascending: false }).order('sale_time', { ascending: false });

    if (error) {
      console.error('Error loading product sales:', error);
      return;
    }

    setProductSales((data as any) || []);
  };

  const loadAdvances = async () => {
    if (!barberId) return;

    const { start, end } = getDateRange();
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');

    let query = supabase
      .from('barber_advances')
      .select('amount, status, effective_date')
      .eq('barber_id', barberId)
      .eq('status', 'approved');

    if (startDate && endDate) {
      query = query.gte('effective_date', startDate).lte('effective_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading advances:', error);
      return;
    }

    const total = (data || []).reduce((sum, adv: any) => sum + Number(adv.amount || 0), 0);
    setTotalAdvances(total);
  };

  // Função para solicitar vale
  const handleAdvanceRequest = async () => {
    if (!advanceAmount || !advanceReason.trim() || !advanceRequestDate) {
      toast.error('Preencha o valor, motivo e data da solicitação');
      return;
    }

    const amount = parseFloat(advanceAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valor deve ser um número positivo');
      return;
    }

    // Verificar se a data não é futura
    const requestDate = new Date(advanceRequestDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Fim do dia de hoje
    
    if (requestDate > today) {
      toast.error('Data da solicitação não pode ser futura');
      return;
    }

    // Verificar se o valor não excede a comissão disponível
    const availableCommission = netCommission;
    if (amount > availableCommission) {
      toast.error(`Valor solicitado (R$ ${amount.toFixed(2)}) excede a comissão disponível (R$ ${availableCommission.toFixed(2)})`);
      return;
    }

    setSubmittingAdvance(true);

    try {
      const { error } = await supabase
        .from('barber_advances')
        .insert({
          barber_id: barberId,
          amount: amount,
          reason: advanceReason.trim(),
          status: 'pending',
          request_date: advanceRequestDate, // Usar a data informada pelo barbeiro
          effective_date: advanceRequestDate, // Data efetiva também será a data da solicitação
        });

      if (error) {
        console.error('Error requesting advance:', error);
        toast.error('Erro ao solicitar vale: ' + error.message);
      } else {
        toast.success('Vale solicitado com sucesso!', {
          description: `Data da solicitação: ${format(new Date(advanceRequestDate), 'dd/MM/yyyy', { locale: ptBR })}`,
          duration: 3000,
        });
        setAdvanceDialogOpen(false);
        setAdvanceAmount('');
        setAdvanceReason('');
        setAdvanceRequestDate(format(new Date(), 'yyyy-MM-dd')); // Reset para hoje
        // Não recarregar advances aqui pois ainda está pendente
      }
    } catch (error: any) {
      console.error('Error requesting advance:', error);
      toast.error('Erro ao solicitar vale: ' + error.message);
    } finally {
      setSubmittingAdvance(false);
    }
  };

  // Calculate stats (using commissions instead of full price)
  const completedAndConfirmed = appointments.filter(apt => apt.status === 'completed' || apt.status === 'confirmed');
  const serviceCommission = completedAndConfirmed.reduce((sum, apt) => {
    const commission = getCommissionValue(apt);
    return sum + commission;
  }, 0);
  
  const productCommission = productSales.reduce((sum, sale) => sum + sale.commission_value, 0);
  const totalCommission = serviceCommission + productCommission;
  const netCommission = totalCommission - totalAdvances;
  
  const totalAppointments = appointments.length;
  const completedCount = appointments.filter(apt => apt.status === 'completed').length;
  const confirmedCount = appointments.filter(apt => apt.status === 'confirmed').length;
  const cancelledCount = appointments.filter(apt => apt.status === 'cancelled').length;
  const localCount = appointments.filter(apt => apt.booking_type === 'local').length;
  const onlineCount = appointments.filter(apt => apt.booking_type === 'online').length;
  const manualCount = appointments.filter(apt => apt.booking_type === 'manual').length;

  // Chart data by date (using commissions)
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
        grouped[dateKey].receita += getCommissionValue(apt);
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

  // Commission by service
  const commissionByService = () => {
    const grouped: Record<string, { count: number; commission: number }> = {};
    appointments
      .filter(apt => apt.status === 'completed' || apt.status === 'confirmed')
      .forEach((apt) => {
        const serviceName = (apt.service as any)?.title || 'Desconhecido';
        if (!grouped[serviceName]) {
          grouped[serviceName] = { count: 0, commission: 0 };
        }
        grouped[serviceName].count += 1;
        grouped[serviceName].commission += getCommissionValue(apt);
      });
    return Object.entries(grouped).map(([name, data]) => ({ 
      name, 
      quantidade: data.count,
      receita: data.commission 
    }));
  };

  const getPeriodLabel = () => {
    if (period === 'custom' && dateFrom && dateTo) {
      return `${format(new Date(dateFrom), 'dd/MM/yyyy', { locale: ptBR })} até ${format(new Date(dateTo), 'dd/MM/yyyy', { locale: ptBR })}`;
    }
    switch (period) {
      case 'day': return 'Hoje';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mês';
      case 'year': return 'Este Ano';
      default: return 'Período';
    }
  };

  if (!barberId) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione um barbeiro para ver os dados financeiros
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {period === 'custom' && (
              <>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Data inicial</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Data final</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </>
            )}
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
                  <SelectItem value="manual">Manual (Barbeiro)</SelectItem>
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
            <CardTitle className="text-sm font-medium">Minha Comissão Líquida ({getPeriodLabel()})</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              R$ {netCommission.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {confirmedCount + completedCount} serviços + {productSales.length} vendas
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
              {localCount} local • {onlineCount} online{manualCount > 0 ? ` • ${manualCount} manual` : ''}
            </p>
          </CardContent>
        </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vales no Período</CardTitle>
          <div className="flex items-center gap-2">
            <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-6 px-2 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Solicitar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-primary" />
                    Solicitar Vale
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Comissão Disponível:</p>
                    <p className="text-lg font-bold text-primary">R$ {netCommission.toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="advance-amount">Valor do Vale *</Label>
                    <Input
                      id="advance-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={netCommission}
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      placeholder="0,00"
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Máximo: R$ {netCommission.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="advance-request-date">Data da Solicitação *</Label>
                    <Input
                      id="advance-request-date"
                      type="date"
                      value={advanceRequestDate}
                      onChange={(e) => setAdvanceRequestDate(e.target.value)}
                      max={format(new Date(), 'yyyy-MM-dd')} // Não permitir datas futuras
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Data em que você realmente pegou o vale (não pode ser futura)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="advance-reason">Motivo *</Label>
                    <Textarea
                      id="advance-reason"
                      value={advanceReason}
                      onChange={(e) => setAdvanceReason(e.target.value)}
                      placeholder="Ex: Despesas pessoais, emergência, etc."
                      className="mt-2 min-h-[80px]"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAdvanceDialogOpen(false);
                        setAdvanceAmount('');
                        setAdvanceReason('');
                        setAdvanceRequestDate(format(new Date(), 'yyyy-MM-dd')); // Reset para hoje
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAdvanceRequest}
                      disabled={submittingAdvance || !advanceAmount || !advanceReason.trim() || !advanceRequestDate}
                      className="flex-1"
                    >
                      {submittingAdvance ? 'Enviando...' : 'Solicitar Vale'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            R$ {totalAdvances.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Descontados da sua comissão neste período.
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
              R$ {(confirmedCount + completedCount) > 0 
                ? (totalCommission / (confirmedCount + completedCount)).toFixed(2) 
                : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">comissão média</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Commission over time */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Comissão e Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartDataByDate()}>
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
                <Bar yAxisId="left" dataKey="receita" fill="hsl(var(--primary))" name="Comissão (R$)" radius={[4, 4, 0, 0]} />
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

        {/* Commission by service */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Comissão por Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={commissionByService()} layout="vertical">
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
                    name === 'receita' ? 'Comissão' : 'Quantidade'
                  ]}
                />
                <Legend />
                <Bar dataKey="quantidade" fill="hsl(var(--secondary))" name="Quantidade" radius={[0, 4, 4, 0]} />
                <Bar dataKey="receita" fill="hsl(var(--primary))" name="Comissão (R$)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartDataByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartDataByStatus.map((entry, index) => (
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
                  <th className="text-left py-3 px-2">Tipo</th>
                  <th className="text-left py-3 px-2">Status</th>
                  <th className="text-right py-3 px-2">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {appointments.slice(0, 10).map((apt) => (
                  <tr key={apt.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      {format(new Date(apt.appointment_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="py-3 px-2">{apt.appointment_time}</td>
                    <td className="py-3 px-2">{(apt.service as any)?.title || '-'}</td>
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
                      R$ {getCommissionValue(apt).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {appointments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nenhum agendamento encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BarberFinancialDashboard;
