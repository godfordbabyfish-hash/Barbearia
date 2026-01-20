import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Calendar, Users } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBarberFixedCommissions } from '@/hooks/useBarberFixedCommissions';

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

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

interface BarberFinancialDashboardProps {
  barberId: string;
}

const BarberFinancialDashboard = ({ barberId }: BarberFinancialDashboardProps) => {
  const { calculateServiceCommission, loading: commissionsLoading } = useBarberFixedCommissions(barberId);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [filterType, setFilterType] = useState<'all' | 'local' | 'online'>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'confirmed' | 'cancelled'>('all');

  // Helper function to calculate commission for an appointment
  const getCommissionValue = (apt: Appointment): number => {
    if (!apt.service) return 0;
    const servicePrice = apt.service.price || 0;
    return calculateServiceCommission(barberId, servicePrice);
  };

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (barberId) {
      loadAppointments();
    }
  }, [barberId, period, filterType, filterService, filterStatus]);

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

    return () => {
      supabase.removeChannel(channel);
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
    let end: Date = today;
    
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

  // Calculate stats (using commissions instead of full price)
  const completedAndConfirmed = appointments.filter(apt => apt.status === 'completed' || apt.status === 'confirmed');
  const totalCommission = completedAndConfirmed.reduce((sum, apt) => {
    const commission = getCommissionValue(apt);
    return sum + commission;
  }, 0);
  
  const totalAppointments = appointments.length;
  const completedCount = appointments.filter(apt => apt.status === 'completed').length;
  const confirmedCount = appointments.filter(apt => apt.status === 'confirmed').length;
  const cancelledCount = appointments.filter(apt => apt.status === 'cancelled').length;
  const localCount = appointments.filter(apt => apt.booking_type === 'local').length;
  const onlineCount = appointments.filter(apt => apt.booking_type === 'online').length;

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
    switch (period) {
      case 'day': return 'Hoje';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mês';
      case 'year': return 'Este Ano';
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
            <CardTitle className="text-sm font-medium">Minha Comissão ({getPeriodLabel()})</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              R$ {totalCommission.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {confirmedCount + completedCount} atendimentos concluídos
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
              {localCount} local • {onlineCount} online
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
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {apt.booking_type === 'local' ? 'Local' : 'Online'}
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
    </div>
  );
};

export default BarberFinancialDashboard;
