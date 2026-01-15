import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Calendar, Users, Filter } from 'lucide-react';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

const FinancialDashboard = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [filterType, setFilterType] = useState<'all' | 'local' | 'online'>('all');
  const [filterBarber, setFilterBarber] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'confirmed' | 'cancelled'>('all');

  useEffect(() => {
    loadBarbers();
    loadServices();
  }, []);

  useEffect(() => {
    loadAppointments();

    // Realtime subscription
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [period, filterType, filterBarber, filterService, filterStatus]);

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

  // Calculate stats
  const totalRevenue = appointments
    .filter(apt => apt.status === 'completed' || apt.status === 'confirmed')
    .reduce((sum, apt) => sum + ((apt.service as any)?.price || 0), 0);
  
  const totalAppointments = appointments.length;
  const completedCount = appointments.filter(apt => apt.status === 'completed').length;
  const confirmedCount = appointments.filter(apt => apt.status === 'confirmed').length;
  const cancelledCount = appointments.filter(apt => apt.status === 'cancelled').length;
  const localCount = appointments.filter(apt => apt.booking_type === 'local').length;
  const onlineCount = appointments.filter(apt => apt.booking_type === 'online').length;

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

  // Revenue by barber
  const revenueByBarber = () => {
    const grouped: Record<string, number> = {};
    appointments
      .filter(apt => apt.status === 'completed' || apt.status === 'confirmed')
      .forEach((apt) => {
        const barberName = (apt.barber as any)?.name || 'Desconhecido';
        grouped[barberName] = (grouped[barberName] || 0) + ((apt.service as any)?.price || 0);
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

  const getPeriodLabel = () => {
    switch (period) {
      case 'day': return 'Hoje';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mês';
      case 'year': return 'Este Ano';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              R$ {totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {confirmedCount + completedCount} atendimentos faturados
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
                ? (totalRevenue / (confirmedCount + completedCount)).toFixed(2) 
                : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">por atendimento</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue over time */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Receita e Agendamentos</CardTitle>
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
                <Bar yAxisId="left" dataKey="receita" fill="hsl(var(--primary))" name="Receita (R$)" radius={[4, 4, 0, 0]} />
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
                      R$ {((apt.service as any)?.price || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialDashboard;