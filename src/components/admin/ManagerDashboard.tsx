import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { endOfWeek, format, startOfDay, startOfWeek, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Gift,
  MessageCircleWarning,
  PackageSearch,
  RefreshCw,
  Scissors,
  TrendingUp,
  UserRoundX,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import BarberProductivityDashboard from '@/components/admin/BarberProductivityDashboard';
import ManagementForecastDashboard from '@/components/admin/ManagementForecastDashboard';
import BarberRevenueAnalytics from '@/components/admin/BarberRevenueAnalytics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type ManagerDashboardProps = {
  onNavigate: (tab: string) => void;
};

type DashboardData = {
  revenue: number;
  servicesRevenue: number;
  productsRevenue: number;
  appointments: number;
  completed: number;
  cancelled: number;
  averageTicket: number;
  weeklyGoal: number;
  activeClients: number;
  atRiskClients: number;
  inactiveClients: number;
  whatsappFailures: number;
  overdueAppointments: number;
  lowStock: number;
  expiringStock: number;
  pendingReferrals: number;
  availableCredits: number;
  topBarbers: Array<{ name: string; revenue: number; appointments: number }>;
};

const emptyData: DashboardData = {
  revenue: 0,
  servicesRevenue: 0,
  productsRevenue: 0,
  appointments: 0,
  completed: 0,
  cancelled: 0,
  averageTicket: 0,
  weeklyGoal: 0,
  activeClients: 0,
  atRiskClients: 0,
  inactiveClients: 0,
  whatsappFailures: 0,
  overdueAppointments: 0,
  lowStock: 0,
  expiringStock: 0,
  pendingReferrals: 0,
  availableCredits: 0,
  topBarbers: [],
};

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const db = supabase as any;
type MonthlyFinancial = {
  month_start: string; service_revenue: number; product_revenue: number; gross_revenue: number;
  service_commissions: number; product_commissions: number; operational_expenses: number;
  supply_consumption_cost: number; net_profit: number; estimated_commission_rate_count: number;
};
type BarberOption = { barber_id: string; barber_name: string; image_url: string | null };

export default function ManagerDashboard({ onNavigate }: ManagerDashboardProps) {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [financialLoading, setFinancialLoading] = useState(true);
  const [financialError, setFinancialError] = useState(false);
  const financialRequestVersion = useRef(0);
  const [financialYear, setFinancialYear] = useState(String(new Date().getFullYear()));
  const [section, setSection] = useState('overview');
  const [focusMonth, setFocusMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [monthlyFinancials, setMonthlyFinancials] = useState<MonthlyFinancial[]>([]);
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekEnd = useMemo(() => endOfWeek(new Date(), { weekStartsOn: 1 }), []);

  const loadMonthlyFinancials = useCallback(async () => {
    const version = ++financialRequestVersion.current;
    setFinancialLoading(true);
    setFinancialError(false);
    setMonthlyFinancials([]);
    try {
      const [{ data: rows, error }, { data: barberRows }] = await Promise.all([
        db.rpc('get_managerial_monthly_financial_summary', { p_year: Number(financialYear) }),
        db.from('barbers').select('id, name, image_url').eq('visible', true).order('name'),
      ]);
      if (version !== financialRequestVersion.current) return;
      if (error) throw error;
      setMonthlyFinancials((rows || []).map((row: any) => ({
        ...row,
        service_revenue: Number(row.service_revenue || 0),
        product_revenue: Number(row.product_revenue || 0),
        gross_revenue: Number(row.gross_revenue || 0),
        service_commissions: Number(row.service_commissions || 0),
        product_commissions: Number(row.product_commissions || 0),
        operational_expenses: Number(row.operational_expenses || 0),
        supply_consumption_cost: Number(row.supply_consumption_cost || 0),
        net_profit: Number(row.net_profit || 0),
        estimated_commission_rate_count: Number(row.estimated_commission_rate_count || 0),
      })) as MonthlyFinancial[]);
      setBarbers((barberRows || []).map((barber: any) => ({ barber_id: barber.id, barber_name: barber.name, image_url: barber.image_url || null })));
    } catch (error: any) {
      if (version !== financialRequestVersion.current) return;
      console.error('Erro ao carregar resumo financeiro mensal:', error);
      setFinancialError(true);
      toast.error('Não foi possível carregar o resumo financeiro mensal', { description: error?.message });
    } finally {
      if (version === financialRequestVersion.current) setFinancialLoading(false);
    }
  }, [financialYear]);

  useEffect(() => {
    void loadMonthlyFinancials();
    return () => { financialRequestVersion.current += 1; };
  }, [loadMonthlyFinancials]);

  useEffect(() => {
    const currentYear = String(new Date().getFullYear());
    if (financialYear === currentYear) setFocusMonth(format(new Date(), 'yyyy-MM'));
    else setFocusMonth(`${financialYear}-12`);
  }, [financialYear]);

  const load = useCallback(async () => {
    setLoading(true);
    const from = format(weekStart, 'yyyy-MM-dd');
    const to = format(weekEnd, 'yyyy-MM-dd');
    const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const expiryLimit = format(subDays(new Date(Date.now() + 30 * 86400000), 15), 'yyyy-MM-dd');

    try {
      const [
        appointmentsResult,
        salesResult,
        rolesResult,
        completedVisitsResult,
        failedWhatsappResult,
        overdueResult,
        stockResult,
        batchesResult,
        referralsResult,
        creditsResult,
        goalsResult,
      ] = await Promise.all([
        db.from('appointments').select('id, client_id, barber_id, status, final_price, original_price, service:services(price), barber:barbers(name), appointment_payments(amount)').gte('appointment_date', from).lte('appointment_date', to),
        db.from('product_sales').select('total_price, barber_id, barber:barbers(name)').eq('status', 'confirmed').gte('sale_date', from).lte('sale_date', to),
        db.from('user_roles').select('user_id').eq('role', 'cliente'),
        db.from('appointments').select('client_id, appointment_date').eq('status', 'completed').order('appointment_date', { ascending: false }),
        db.from('whatsapp_notifications_queue').select('id', { count: 'exact', head: true }).eq('status', 'failed').or('target_type.eq.client,target_type.is.null'),
        db.from('appointments').select('id', { count: 'exact', head: true }).in('status', ['pending', 'confirmed']).lt('appointment_date', today),
        db.rpc('get_supply_stock'),
        db.from('supply_batches').select('quantity_remaining, expires_on').gt('quantity_remaining', 0).not('expires_on', 'is', null),
        db.from('referrals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        db.from('referral_coupons').select('id', { count: 'exact', head: true }).eq('status', 'available').gt('expires_at', new Date().toISOString()),
        db.from('site_config').select('config_value').eq('config_key', 'whatsapp_daily_report').maybeSingle(),
      ]);

      const firstError = [appointmentsResult, salesResult, rolesResult, completedVisitsResult, stockResult, batchesResult]
        .find((result) => result.error)?.error;
      if (firstError) throw firstError;

      const appointments = appointmentsResult.data || [];
      const sales = salesResult.data || [];
      const paidAppointments = appointments.filter((appointment: any) => ['completed', 'confirmed'].includes(appointment.status));
      const appointmentRevenue = (appointment: any) => {
        const payments = (appointment.appointment_payments || []).reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
        return Number(appointment.final_price ?? (payments > 0 ? payments : appointment.service?.price || 0));
      };
      const servicesRevenue = paidAppointments.reduce((sum: number, appointment: any) => sum + appointmentRevenue(appointment), 0);
      const productsRevenue = sales.reduce((sum: number, sale: any) => sum + Number(sale.total_price || 0), 0);
      const revenue = servicesRevenue + productsRevenue;

      const clientIds = new Set((rolesResult.data || []).map((role: any) => role.user_id));
      const latestVisit = new Map<string, string>();
      (completedVisitsResult.data || []).forEach((visit: any) => {
        if (clientIds.has(visit.client_id) && !latestVisit.has(visit.client_id)) latestVisit.set(visit.client_id, visit.appointment_date);
      });
      let activeClients = 0;
      let atRiskClients = 0;
      let inactiveClients = 0;
      clientIds.forEach((clientId: any) => {
        const last = latestVisit.get(clientId);
        if (!last) {
          inactiveClients += 1;
          return;
        }
        const days = Math.max(0, Math.floor((startOfDay(new Date()).getTime() - new Date(`${last}T00:00:00`).getTime()) / 86400000));
        if (days <= 20) activeClients += 1;
        else if (days <= 30) atRiskClients += 1;
        else inactiveClients += 1;
      });

      const barberMap = new Map<string, { name: string; revenue: number; appointments: number }>();
      paidAppointments.forEach((appointment: any) => {
        const id = appointment.barber_id || 'unknown';
        const current = barberMap.get(id) || { name: appointment.barber?.name || 'Barbeiro', revenue: 0, appointments: 0 };
        current.revenue += appointmentRevenue(appointment);
        current.appointments += 1;
        barberMap.set(id, current);
      });
      sales.forEach((sale: any) => {
        const id = sale.barber_id || 'unknown';
        const current = barberMap.get(id) || { name: sale.barber?.name || 'Barbeiro', revenue: 0, appointments: 0 };
        current.revenue += Number(sale.total_price || 0);
        barberMap.set(id, current);
      });

      const stock = stockResult.data || [];
      const lowStock = stock.filter((item: any) => item.active && Number(item.current_stock) <= Number(item.minimum_stock)).length;
      const expiringStock = (batchesResult.data || []).filter((batch: any) => batch.expires_on && batch.expires_on <= expiryLimit).length;
      const goals = goalsResult.data?.config_value?.goals || {};

      setData({
        revenue,
        servicesRevenue,
        productsRevenue,
        appointments: appointments.length,
        completed: appointments.filter((appointment: any) => appointment.status === 'completed').length,
        cancelled: appointments.filter((appointment: any) => appointment.status === 'cancelled').length,
        averageTicket: paidAppointments.length ? servicesRevenue / paidAppointments.length : 0,
        weeklyGoal: Number(goals.weekly_gross_revenue || 0),
        activeClients,
        atRiskClients,
        inactiveClients,
        whatsappFailures: failedWhatsappResult.count || 0,
        overdueAppointments: overdueResult.count || 0,
        lowStock,
        expiringStock,
        pendingReferrals: referralsResult.count || 0,
        availableCredits: creditsResult.count || 0,
        topBarbers: Array.from(barberMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 3),
      });
    } catch (error: any) {
      console.error('Erro ao carregar Dashboard Gerencial:', error);
      toast.error('Não foi possível atualizar o Dashboard Gerencial', { description: error?.message });
    } finally {
      setLoading(false);
    }
  }, [weekEnd, weekStart]);

  useEffect(() => {
    if (section !== 'productivity') return;
    void load();
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        void load();
      }, 350);
    };
    const channel = supabase
      .channel('manager-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_sales' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_notifications_queue' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supply_batches' }, scheduleRefresh)
      .subscribe();
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [load, section]);

  const completionRate = data.appointments > 0 ? Math.round((data.completed / data.appointments) * 100) : 0;
  const goalProgress = data.weeklyGoal > 0 ? Math.min(100, (data.revenue / data.weeklyGoal) * 100) : 0;
  const cards = [
    { label: 'Faturamento', value: money(data.revenue), detail: 'Semana atual', icon: CircleDollarSign, tab: 'financial' },
    { label: 'Agendamentos', value: data.appointments, detail: `${data.completed} concluídos`, icon: CalendarCheck2, tab: 'fila' },
    { label: 'Conclusão', value: `${completionRate}%`, detail: `${data.cancelled} cancelados`, icon: CheckCircle2, tab: 'financial' },
    { label: 'Ticket médio', value: money(data.averageTicket), detail: 'Serviços', icon: TrendingUp, tab: 'financial' },
    { label: 'Clientes ativos', value: data.activeClients, detail: 'Últimos 20 dias', icon: Users, tab: 'users' },
    { label: 'Em atenção', value: data.atRiskClients, detail: '21 a 30 dias', icon: AlertTriangle, tab: 'users' },
  ];
  const alerts = [
    { label: 'Finalizações pendentes', value: data.overdueAppointments, icon: Clock3, tab: 'fila', critical: true },
    { label: 'Falhas no WhatsApp', value: data.whatsappFailures, icon: MessageCircleWarning, tab: 'users', critical: true },
    { label: 'Estoque abaixo do mínimo', value: data.lowStock, icon: PackageSearch, tab: 'supplies', critical: true },
    { label: 'Lotes vencendo/vencidos', value: data.expiringStock, icon: AlertTriangle, tab: 'supplies', critical: true },
    { label: 'Clientes inativos', value: data.inactiveClients, icon: UserRoundX, tab: 'users', critical: false },
    { label: 'Indicações aguardando', value: data.pendingReferrals, icon: Gift, tab: 'referrals', critical: false },
  ];
  const focusedFinancial = monthlyFinancials.find((row) => row.month_start.slice(0, 7) === focusMonth);
  const financialChart = monthlyFinancials.map((row) => ({
    month: format(new Date(`${row.month_start}T12:00:00`), 'MMM', { locale: ptBR }),
    faturamento: row.month_start.slice(0, 7) > format(new Date(), 'yyyy-MM') ? null : row.gross_revenue,
    lucro: row.month_start.slice(0, 7) > format(new Date(), 'yyyy-MM') ? null : row.net_profit,
  }));
  const selectedMonthLabel = format(new Date(`${focusMonth}-01T12:00:00`), 'MMMM yyyy', { locale: ptBR });
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: Math.min(7, currentYear - 2019) }, (_, index) => String(currentYear - index));
  const monthOptions = Array.from({ length: financialYear === String(currentYear) ? new Date().getMonth() + 1 : 12 }, (_, index) => {
    const month = `${financialYear}-${String(index + 1).padStart(2, '0')}`;
    return { value: month, label: format(new Date(`${month}-01T12:00:00`), 'MMMM', { locale: ptBR }) };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Dashboard Gerencial</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">Visão geral do faturamento, resultado e operação da barbearia</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { if (section === 'productivity') void load(); void loadMonthlyFinancials(); }} disabled={loading || financialLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading || financialLoading ? 'animate-spin' : ''}`} />Atualizar
        </Button>
      </div>

      <Tabs value={section} onValueChange={setSection} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-4">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="productivity">Produtividade</TabsTrigger>
          <TabsTrigger value="planning">Planejamento</TabsTrigger>
          <TabsTrigger value="opportunity">Oportunidade</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="text-lg font-bold capitalize">Resultado da barbearia · {selectedMonthLabel}</h2><p className="text-xs text-muted-foreground">Faturamento e lucro líquido apurados pela regra do fechamento financeiro.</p></div>
            <div className="flex gap-2"><Select value={focusMonth} onValueChange={setFocusMonth}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{monthOptions.map((month) => <SelectItem key={month.value} value={month.value} className="capitalize">{month.label}</SelectItem>)}</SelectContent></Select><Select value={financialYear} onValueChange={setFinancialYear}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent>{yearOptions.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent></Select></div>
          </div>
          {financialError && <Card role="alert" className="border-amber-500/40"><CardContent className="p-3 text-sm text-amber-200">Não foi possível consultar o resumo financeiro. Os resultados estão ocultos; atualize para tentar novamente.</CardContent></Card>}
          {!financialError && <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Faturamento', focusedFinancial?.gross_revenue || 0, CircleDollarSign, 'Serviços concluídos + vendas confirmadas'],
              ['Lucro líquido registrado', focusedFinancial?.net_profit || 0, TrendingUp, 'Após comissões, despesas pagas e insumos'],
              ['Comissões', (focusedFinancial?.service_commissions || 0) + (focusedFinancial?.product_commissions || 0), Users, 'Serviços e produtos'],
              ['Despesas + insumos', (focusedFinancial?.operational_expenses || 0) + (focusedFinancial?.supply_consumption_cost || 0), PackageSearch, 'Despesas pagas e custo consumido'],
            ].map(([label, value, Icon, detail]) => <Card key={String(label)}><CardContent className="p-4"><div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{String(label)}</p><Icon className="h-4 w-4 text-primary" /></div>{financialLoading ? <Skeleton className="mt-2 h-7 w-28" /> : <p className="mt-2 text-xl font-bold">{money(Number(value))}</p>}<p className="mt-1 text-[11px] text-muted-foreground">{String(detail)}</p></CardContent></Card>)}
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
            <Card><CardHeader><CardTitle className="text-base">Evolução mensal</CardTitle><CardDescription>Faturamento bruto comparado ao lucro líquido registrado no ano selecionado; mês atual apurado até ontem.</CardDescription></CardHeader><CardContent className="h-80">{financialLoading ? <Skeleton className="h-full w-full" /> : <ResponsiveContainer width="100%" height="100%"><ComposedChart data={financialChart}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="month" fontSize={11} /><YAxis fontSize={10} tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 0 }).format(Number(value))} /><Tooltip formatter={(value: number) => money(Number(value))} /><Legend /><Bar dataKey="faturamento" name="Faturamento" fill="hsl(var(--primary))" radius={[4,4,0,0]} /><Line dataKey="lucro" name="Lucro líquido" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} /></ComposedChart></ResponsiveContainer>}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Composição do resultado</CardTitle><CardDescription className="capitalize">{selectedMonthLabel}</CardDescription></CardHeader><CardContent className="space-y-3">{[
              ['Receita de serviços', focusedFinancial?.service_revenue || 0], ['Venda de produtos', focusedFinancial?.product_revenue || 0], ['Comissões', -((focusedFinancial?.service_commissions || 0) + (focusedFinancial?.product_commissions || 0))], ['Despesas operacionais pagas', -(focusedFinancial?.operational_expenses || 0)], ['Insumos consumidos', -(focusedFinancial?.supply_consumption_cost || 0)],
            ].map(([label, value]) => <div key={String(label)} className="flex items-center justify-between gap-3 border-b pb-2 text-sm last:border-0"><span className="text-muted-foreground">{String(label)}</span><strong className={Number(value) < 0 ? 'text-rose-300' : ''}>{money(Number(value))}</strong></div>)}{(focusedFinancial?.estimated_commission_rate_count || 0) > 0 && <p className="text-xs text-amber-300">Para {focusedFinancial?.estimated_commission_rate_count} atendimento(s) histórico(s), o fechamento usa a regra de comissão atual porque a taxa original não foi registrada.</p>}</CardContent></Card>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">O custo dos insumos consumidos é descontado pelas baixas e custos dos lotes registrados. O cadastro do estoque de produtos para revenda não mantém custo de compra; por isso, esse custo específico ainda não entra no lucro líquido.</p>
          </>}
        </TabsContent>

        <TabsContent value="productivity" className="space-y-5">
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">{cards.map(({ label, value, detail, icon: Icon, tab }) => <Card key={label} className="cursor-pointer transition-colors hover:border-primary/50" onClick={() => onNavigate(tab)}><CardContent className="p-2.5 sm:p-4"><div className="flex items-start justify-between gap-1"><p className="text-[10px] leading-tight text-muted-foreground sm:text-xs">{label}</p><Icon className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" /></div>{loading ? <Skeleton className="mt-2 h-6 w-16" /> : <p className="mt-2 break-words text-sm font-bold leading-tight sm:text-xl">{value}</p>}<p className="mt-1 hidden text-[10px] text-muted-foreground sm:block">{detail}</p></CardContent></Card>)}</div>
          <div className="grid gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader className="pb-3"><CardTitle className="text-base">Meta semanal</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-end justify-between gap-3"><div><p className="text-2xl font-bold text-primary">{money(data.revenue)}</p><p className="text-xs text-muted-foreground">Realizado nesta semana</p></div><div className="text-right"><p className="font-semibold">{data.weeklyGoal > 0 ? money(data.weeklyGoal) : 'Não definida'}</p><p className="text-xs text-muted-foreground">Meta configurada</p></div></div><Progress value={goalProgress} className="h-2.5" /><div className="flex justify-between text-xs text-muted-foreground"><span>{data.weeklyGoal > 0 ? `${goalProgress.toFixed(0)}% atingido` : 'Configure a meta no WhatsApp › Relatório automático'}</span>{data.weeklyGoal > data.revenue && <span>Faltam {money(data.weeklyGoal - data.revenue)}</span>}</div><div className="grid grid-cols-2 gap-2 pt-2"><div className="rounded-lg bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Serviços</p><p className="font-bold">{money(data.servicesRevenue)}</p></div><div className="rounded-lg bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Produtos</p><p className="font-bold">{money(data.productsRevenue)}</p></div></div></CardContent></Card><Card><CardHeader className="pb-3"><CardTitle className="text-base">Destaques da equipe</CardTitle></CardHeader><CardContent className="space-y-2">{data.topBarbers.length === 0 ? <p className="text-sm text-muted-foreground">Sem faturamento no período.</p> : data.topBarbers.map((barber, index) => <div key={barber.name} className="flex items-center justify-between rounded-lg border p-2.5"><div className="flex min-w-0 items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span><div className="min-w-0"><p className="truncate text-sm font-medium">{barber.name}</p><p className="text-[11px] text-muted-foreground">{barber.appointments} atendimentos</p></div></div><p className="text-sm font-bold">{money(barber.revenue)}</p></div>)}<Button variant="ghost" size="sm" className="w-full" onClick={() => onNavigate('financial')}>Ver análise financeira</Button></CardContent></Card></div>
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Atenção da gestão</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">{alerts.map(({ label, value, icon: Icon, tab, critical }) => <button key={label} type="button" onClick={() => onNavigate(tab)} className={`rounded-lg border p-3 text-left transition-colors hover:border-primary/50 ${critical && value > 0 ? 'border-red-500/30 bg-red-500/5' : 'bg-muted/20'}`}><div className="flex items-start justify-between gap-2"><Icon className={`h-4 w-4 ${critical && value > 0 ? 'text-red-400' : 'text-primary'}`} /><span className="text-lg font-bold">{loading ? '—' : value}</span></div><p className="mt-2 text-[11px] leading-tight text-muted-foreground sm:text-xs">{label}</p></button>)}</CardContent></Card>
          <BarberProductivityDashboard showRevenueAnalytics={false} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Button variant="outline" onClick={() => onNavigate('financial')}><CircleDollarSign className="mr-2 h-4 w-4" />Financeiro</Button><Button variant="outline" onClick={() => onNavigate('users')}><Users className="mr-2 h-4 w-4" />Clientes</Button><Button variant="outline" onClick={() => onNavigate('fila')}><Scissors className="mr-2 h-4 w-4" />Atendimentos</Button><Button variant="outline" onClick={() => onNavigate('supplies')}><PackageSearch className="mr-2 h-4 w-4" />Estoque</Button></div>
          {data.availableCredits > 0 && <p className="text-center text-xs text-muted-foreground">Há {data.availableCredits} crédito(s) de indicação disponível(is) para clientes.</p>}
        </TabsContent>
        <TabsContent value="planning"><ManagementForecastDashboard onNavigate={onNavigate} /></TabsContent>
        <TabsContent value="opportunity"><BarberRevenueAnalytics barbers={barbers} /></TabsContent>
      </Tabs>
    </div>
  );
}
