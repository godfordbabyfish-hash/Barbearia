import { useCallback, useEffect, useMemo, useState } from 'react';
import { differenceInCalendarDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarCheck2, Clock3, Gauge, RefreshCw, Scissors, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';

type Metric = {
  barber_id: string; barber_name: string; image_url: string | null; available_minutes: number;
  booked_minutes: number; productive_minutes: number; idle_minutes: number; total_appointments: number;
  completed_appointments: number; cancelled_appointments: number; pending_finalizations: number;
  distinct_clients: number; service_revenue: number; product_revenue: number; product_sales: number;
  average_ticket: number; occupancy_rate: number; productive_rate: number; completion_rate: number;
  cancellation_rate: number; revenue_per_available_hour: number;
};
type Period = 'week' | 'month' | '30days' | 'custom';
const db = supabase as any;
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const hours = (minutes: number) => `${(Number(minutes || 0) / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;
const numberMetric = (row: any): Metric => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value])) as Metric;

export default function BarberProductivityDashboard() {
  const now = new Date();
  const [period, setPeriod] = useState<Period>('week');
  const [from, setFrom] = useState(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [previous, setPrevious] = useState<Record<string, Metric>>({});
  const [loading, setLoading] = useState(true);

  const changePeriod = (value: Period) => {
    setPeriod(value);
    if (value === 'week') { setFrom(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')); setTo(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')); }
    if (value === 'month') { setFrom(format(startOfMonth(now), 'yyyy-MM-dd')); setTo(format(endOfMonth(now), 'yyyy-MM-dd')); }
    if (value === '30days') { setFrom(format(subDays(now, 29), 'yyyy-MM-dd')); setTo(format(now, 'yyyy-MM-dd')); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const days = differenceInCalendarDays(new Date(`${to}T12:00:00`), new Date(`${from}T12:00:00`)) + 1;
      const previousTo = format(subDays(new Date(`${from}T12:00:00`), 1), 'yyyy-MM-dd');
      const previousFrom = format(subDays(new Date(`${from}T12:00:00`), days), 'yyyy-MM-dd');
      const [currentResult, previousResult] = await Promise.all([
        db.rpc('get_barber_productivity_metrics', { p_start: from, p_end: to }),
        db.rpc('get_barber_productivity_metrics', { p_start: previousFrom, p_end: previousTo }),
      ]);
      if (currentResult.error) throw currentResult.error;
      if (previousResult.error) throw previousResult.error;
      const currentRows = (currentResult.data || []).map(numberMetric);
      const previousRows = (previousResult.data || []).map(numberMetric);
      setMetrics(currentRows);
      setPrevious(Object.fromEntries(previousRows.map((item: Metric) => [item.barber_id, item])));
    } catch (error: any) { toast.error('Não foi possível carregar a produtividade', { description: error.message }); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const channel = supabase.channel('barber-productivity-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barber_schedules' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_sales' }, load).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const totals = useMemo(() => {
    const available = metrics.reduce((sum, item) => sum + item.available_minutes, 0);
    const booked = metrics.reduce((sum, item) => sum + item.booked_minutes, 0);
    return {
      occupancy: available ? booked * 100 / available : 0,
      revenue: metrics.reduce((sum, item) => sum + item.service_revenue + item.product_revenue, 0),
      completed: metrics.reduce((sum, item) => sum + item.completed_appointments, 0),
      pending: metrics.reduce((sum, item) => sum + item.pending_finalizations, 0),
    };
  }, [metrics]);
  const chart = metrics.map((item) => ({ name: item.barber_name.split(' ')[0], Ocupação: item.occupancy_rate, Produtiva: item.productive_rate }));
  const delta = (item: Metric, field: keyof Metric) => Number(item[field] || 0) - Number(previous[item.barber_id]?.[field] || 0);

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-bold sm:text-xl">Produtividade da equipe</h2><p className="text-xs text-muted-foreground sm:text-sm">Ocupação calculada sobre a agenda disponível, descontando pausas e bloqueios.</p></div><div className="flex gap-2"><Select value={period} onValueChange={(value) => changePeriod(value as Period)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="week">Semana atual</SelectItem><SelectItem value="month">Mês atual</SelectItem><SelectItem value="30days">Últimos 30 dias</SelectItem><SelectItem value="custom">Personalizado</SelectItem></SelectContent></Select><Button size="icon" variant="outline" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button></div></div>
    {period === 'custom' && <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:max-w-md"><div><p className="mb-1 text-xs text-muted-foreground">Início</p><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div><div><p className="mb-1 text-xs text-muted-foreground">Fim</p><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div></div>}
    <p className="text-xs text-muted-foreground">{format(new Date(`${from}T12:00:00`), "dd 'de' MMM", { locale: ptBR })} a {format(new Date(`${to}T12:00:00`), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}</p>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {[["Ocupação geral", `${totals.occupancy.toFixed(1)}%`, Gauge], ["Faturamento", money(totals.revenue), TrendingUp], ["Concluídos", totals.completed, CalendarCheck2], ["Finalizações pendentes", totals.pending, AlertTriangle]].map(([title, value, Icon]) => <Card key={String(title)}><CardContent className="p-3 sm:p-4"><div className="flex justify-between gap-1"><div><p className="text-[11px] text-muted-foreground sm:text-sm">{String(title)}</p>{loading ? <Skeleton className="mt-2 h-6 w-16" /> : <p className="mt-1 break-words text-lg font-bold sm:text-xl">{String(value)}</p>}</div><Icon className="h-4 w-4 text-primary" /></div></CardContent></Card>)}
    </div>
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <Card><CardHeader><CardTitle className="text-base">Ocupação x produção concluída</CardTitle><CardDescription>A diferença indica horários futuros ou atendimentos não finalizados.</CardDescription></CardHeader><CardContent className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="name" fontSize={11} /><YAxis domain={[0, 100]} fontSize={11} unit="%" /><Tooltip formatter={(value: number) => `${Number(value).toFixed(1)}%`} /><Legend /><Bar dataKey="Ocupação" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /><Bar dataKey="Produtiva" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Ranking do período</CardTitle><CardDescription>Ordenado por ocupação; faturamento é usado como desempate.</CardDescription></CardHeader><CardContent className="space-y-2">{loading ? [1,2,3].map((item) => <Skeleton key={item} className="h-16 w-full" />) : metrics.map((item, index) => <div key={item.barber_id} className="flex items-center gap-3 rounded-lg border p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span><Avatar className="h-9 w-9"><AvatarImage src={item.image_url || undefined} /><AvatarFallback>{item.barber_name.charAt(0)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate font-semibold">{item.barber_name}</p><p className="font-bold">{item.occupancy_rate.toFixed(1)}%</p></div><Progress value={item.occupancy_rate} className="mt-1 h-1.5" /><p className="mt-1 text-[11px] text-muted-foreground">{item.completed_appointments} concluídos · {money(item.service_revenue + item.product_revenue)}</p></div></div>)}</CardContent></Card>
    </div>
    <div className="grid gap-3 lg:grid-cols-3">{metrics.map((item) => {
      const occupancyDelta = delta(item, 'occupancy_rate');
      const revenueDelta = delta(item, 'service_revenue') + delta(item, 'product_revenue');
      return <Card key={item.barber_id}><CardHeader className="pb-3"><div className="flex items-center gap-3"><Avatar><AvatarImage src={item.image_url || undefined} /><AvatarFallback>{item.barber_name.charAt(0)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><CardTitle className="truncate text-base">{item.barber_name}</CardTitle><div className="flex gap-2 text-xs"><span className={occupancyDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>{occupancyDelta >= 0 ? <TrendingUp className="mr-1 inline h-3 w-3" /> : <TrendingDown className="mr-1 inline h-3 w-3" />}{Math.abs(occupancyDelta).toFixed(1)} p.p. vs. período anterior</span></div></div></div></CardHeader><CardContent className="space-y-3">
        <div><div className="mb-1 flex justify-between text-sm"><span>Ocupação</span><strong>{item.occupancy_rate.toFixed(1)}%</strong></div><Progress value={item.occupancy_rate} /></div>
        <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-muted/30 p-2"><Clock3 className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 font-bold">{hours(item.available_minutes)}</p><p className="text-[10px] text-muted-foreground">Disponíveis</p></div><div className="rounded-lg bg-muted/30 p-2"><Scissors className="mx-auto h-4 w-4 text-emerald-400" /><p className="mt-1 font-bold">{hours(item.productive_minutes)}</p><p className="text-[10px] text-muted-foreground">Produtivas</p></div><div className="rounded-lg bg-muted/30 p-2"><Users className="mx-auto h-4 w-4 text-cyan-400" /><p className="mt-1 font-bold">{item.distinct_clients}</p><p className="text-[10px] text-muted-foreground">Clientes</p></div></div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t pt-3 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Concluídos</span><strong>{item.completed_appointments}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Cancelados</span><strong>{item.cancelled_appointments}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Ticket médio</span><strong>{money(item.average_ticket)}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Receita/hora</span><strong>{money(item.revenue_per_available_hour)}</strong></div><div className="col-span-2 flex justify-between"><span className="text-muted-foreground">Faturamento</span><strong>{money(item.service_revenue + item.product_revenue)} <span className={revenueDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>({revenueDelta >= 0 ? '+' : ''}{money(revenueDelta)})</span></strong></div></div>
        {item.pending_finalizations > 0 && <Badge variant="destructive" className="w-full justify-center">{item.pending_finalizations} finalização(ões) pendente(s)</Badge>}
      </CardContent></Card>;
    })}</div>
  </div>;
}
