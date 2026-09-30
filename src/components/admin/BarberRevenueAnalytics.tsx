import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { endOfMonth, format, parseISO, startOfDay, startOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Armchair, CalendarDays, CircleDollarSign, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { buildBarberRevenueSummary, type BarberRevenueRow } from '@/lib/barberRevenueAnalytics';

type BarberOption = { barber_id: string; barber_name: string; image_url: string | null };
type ViewMode = 'month' | 'year';
const db = supabase as any;
const money = (value: number | null) => value === null
  ? '—'
  : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const compactMoney = (value: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 0,
}).format(value || 0);
const hours = (minutes: number) => `${(minutes / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;

function getDateRange(mode: ViewMode, month: string, year: string) {
  const now = new Date();
  const currentMonth = format(now, 'yyyy-MM');
  const currentYear = now.getFullYear();
  const monthNumber = Number(month.slice(5, 7));
  if (mode === 'month' && (!/^\d{4}-\d{2}$/.test(month) || monthNumber < 1 || monthNumber > 12 || month > currentMonth)) return null;
  if (mode === 'year' && (!/^\d{4}$/.test(year) || Number(year) < 2000 || Number(year) > currentYear)) return null;
  const start = mode === 'month'
    ? startOfMonth(new Date(`${month}-01T12:00:00`))
    : new Date(`${year}-01-01T12:00:00`);
  const periodEnd = mode === 'month'
    ? endOfMonth(start)
    : new Date(`${year}-12-31T12:00:00`);
  const lastCompleteDay = subDays(startOfDay(now), 1);
  const end = periodEnd > lastCompleteDay ? lastCompleteDay : periodEnd;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return { from: format(start, 'yyyy-MM-dd'), to: format(end, 'yyyy-MM-dd') };
}

function normalizeRow(row: any): BarberRevenueRow {
  return {
    period_start: row.period_start,
    barber_id: row.barber_id,
    barber_name: row.barber_name,
    image_url: row.image_url || null,
    service_revenue: Number(row.service_revenue || 0),
    productive_minutes: Number(row.productive_minutes || 0),
    available_minutes: Number(row.available_minutes || 0),
    booked_minutes: Number(row.booked_minutes || 0),
    idle_minutes: Number(row.idle_minutes || 0),
  };
}

type Props = { barbers: BarberOption[] };

export default function BarberRevenueAnalytics({ barbers }: Props) {
  const now = new Date();
  const currentMonth = format(now, 'yyyy-MM');
  const currentYear = String(now.getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [barberId, setBarberId] = useState('all');
  const [rows, setRows] = useState<BarberRevenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const requestVersion = useRef(0);
  const range = useMemo(() => getDateRange(viewMode, month, year), [viewMode, month, year]);
  const selectedBarber = barbers.find((barber) => barber.barber_id === barberId);
  const summary = useMemo(() => buildBarberRevenueSummary(rows), [rows]);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoadError(false);
    setRows([]);
    if (!range) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await db.rpc('get_barber_revenue_evolution', {
        p_start: range.from,
        p_end: range.to,
        p_granularity: viewMode === 'month' ? 'day' : 'month',
        p_barber_id: barberId === 'all' ? null : barberId,
      });
      if (version !== requestVersion.current) return;
      if (error) throw error;
      setRows((data || []).map(normalizeRow));
    } catch (error: any) {
      if (version !== requestVersion.current) return;
      setLoadError(true);
      toast.error('Não foi possível carregar a evolução do faturamento', { description: error.message });
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [range, viewMode, barberId]);

  useEffect(() => {
    void load();
    return () => { requestVersion.current += 1; };
  }, [load]);
  useEffect(() => {
    const channel = supabase.channel('barber-revenue-analytics-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => { void load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barber_schedules' }, () => { void load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barber_breaks' }, () => { void load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const chartData = useMemo(() => summary.points.map((point) => ({
    ...point,
    label: viewMode === 'month'
      ? format(parseISO(point.period_start), 'dd/MM')
      : format(parseISO(point.period_start), 'MMM', { locale: ptBR }),
  })), [summary.points, viewMode]);
  const periodLabel = viewMode === 'month'
    ? month && !Number.isNaN(new Date(`${month}-01T12:00:00`).getTime())
      ? format(new Date(`${month}-01T12:00:00`), 'MMMM yyyy', { locale: ptBR })
      : 'Selecione um mês'
    : year || 'Selecione um ano';
  const hasNoCompleteDays = !range && (viewMode === 'month' ? month === currentMonth : year === currentYear);
  const invalidPeriod = !range && !hasNoCompleteDays;

  return <Card>
    <CardHeader className="pb-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle className="text-base sm:text-lg">Evolução e oportunidade de faturamento</CardTitle>
          <CardDescription className="mt-1">Compare os serviços realizados com uma estimativa baseada nos horários ociosos da cadeira.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Atualizar
        </Button>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {loadError && <p role="alert" className="rounded-lg border border-amber-500/40 p-3 text-sm text-amber-200">Não foi possível consultar este período. Nenhum valor é apresentado como resultado confirmado.</p>}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[auto_minmax(150px,1fr)_minmax(190px,1.3fr)]">
        <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
          <SelectTrigger aria-label="Granularidade do período" className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="month">Por mês</SelectItem><SelectItem value="year">Por ano</SelectItem></SelectContent>
        </Select>
        {viewMode === 'month' ? (
          <Input aria-label="Mês e ano" type="month" value={month} max={currentMonth} onChange={(event) => setMonth(event.target.value)} />
        ) : (
          <Input aria-label="Ano" type="number" min="2000" max={now.getFullYear()} value={year} onChange={(event) => setYear(event.target.value)} />
        )}
        <Select value={barberId} onValueChange={setBarberId}>
          <SelectTrigger aria-label="Filtrar barbeiro" className="w-full"><SelectValue placeholder="Todos os barbeiros" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os barbeiros</SelectItem>
            {barbers.map((barber) => <SelectItem key={barber.barber_id} value={barber.barber_id}>{barber.barber_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-primary" /><span className="capitalize">{periodLabel}</span></span>
        {selectedBarber && <span>Visão individual: {selectedBarber.barber_name}</span>}
        {!selectedBarber && <span>Visão consolidada da barbearia</span>}
      </div>

      <Tabs defaultValue="evolution" className="space-y-3" hidden={loadError}>
        <TabsList className="grid h-auto w-full grid-cols-2">
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="opportunity">Oportunidade de faturamento</TabsTrigger>
        </TabsList>
        <TabsContent value="evolution" className="space-y-3">
          {hasNoCompleteDays ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">A análise de perda começa após o primeiro dia completo deste período.</p> : invalidPeriod ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Selecione um mês ou ano válido até o período atual.</p> : (
            <>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {[
                  ['Serviços realizados', money(summary.service_revenue), CircleDollarSign],
                  ['Potencial estimado', money(summary.potential_revenue), TrendingUp],
                  ['Oportunidade estimada', summary.has_projection_base ? money(summary.estimated_opportunity) : 'Sem base', TrendingDown],
                  ['Tempo ocioso', hours(summary.idle_minutes), Armchair],
                ].map(([label, value, Icon]) => <Card key={String(label)} className="bg-muted/20"><CardContent className="flex items-start justify-between gap-2 p-3 sm:p-4"><div className="min-w-0"><p className="text-[11px] text-muted-foreground sm:text-xs">{String(label)}</p>{loading ? <Skeleton className="mt-2 h-6 w-20" /> : <p className="mt-1 break-words text-base font-bold sm:text-lg">{String(value)}</p>}</div><Icon className="h-4 w-4 shrink-0 text-primary" /></CardContent></Card>)}
              </div>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Faturamento realizado e potencial estimado</CardTitle><CardDescription>O potencial acrescenta ao realizado a oportunidade calculada nos horários sem reserva.</CardDescription></CardHeader><CardContent className="h-64 px-1 sm:h-80 sm:px-4">
                {loading ? <Skeleton className="h-full w-full" /> : chartData.length === 0 ? <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem barbeiros ativos para exibir neste período.</p> : <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="label" fontSize={10} minTickGap={viewMode === 'month' ? 12 : 8} /><YAxis tickFormatter={compactMoney} fontSize={10} width={60} /><Tooltip labelFormatter={(label) => `${label} · ${periodLabel}`} formatter={(value: number | null, name: string) => [money(value), name]} /><Legend />
                  <Line type="monotone" dataKey="service_revenue" name="Realizado" stroke="#10b981" strokeWidth={2} dot={viewMode === 'year'} connectNulls />
                  <Line type="monotone" dataKey="potential_revenue" name="Potencial estimado" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 4" dot={viewMode === 'year'} connectNulls />
                </LineChart></ResponsiveContainer>}
              </CardContent></Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="opportunity" className="space-y-3">
          {hasNoCompleteDays ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">A análise de perda começa após o primeiro dia completo deste período.</p> : invalidPeriod ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Selecione um mês ou ano válido até o período atual.</p> : (
            <>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {[
                  ['Oportunidade estimada', summary.has_projection_base ? money(summary.estimated_opportunity) : 'Sem base'],
                  ['Horas sem reserva', hours(summary.idle_minutes)],
                  ['Realizado em serviços', money(summary.service_revenue)],
                  ['Potencial preenchido', money(summary.potential_revenue)],
                ].map(([label, value]) => <Card key={label} className="bg-muted/20"><CardContent className="p-3 sm:p-4"><p className="text-[11px] text-muted-foreground sm:text-xs">{label}</p>{loading ? <Skeleton className="mt-2 h-6 w-20" /> : <p className="mt-1 break-words text-base font-bold sm:text-lg">{value}</p>}</CardContent></Card>)}
              </div>
              {!summary.has_projection_base && !loading ? (
                <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Ainda não há serviços concluídos neste período para calcular uma estimativa por hora produtiva.</p>
              ) : (
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Realizado x preenchimento de horários vagos</CardTitle><CardDescription>Estimativa por período usando a receita média de serviços por minuto produtivo no intervalo selecionado.</CardDescription></CardHeader><CardContent className="h-64 px-1 sm:h-80 sm:px-4">
                  {loading ? <Skeleton className="h-full w-full" /> : <ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="label" fontSize={10} minTickGap={viewMode === 'month' ? 12 : 8} /><YAxis tickFormatter={compactMoney} fontSize={10} width={60} /><Tooltip labelFormatter={(label) => `${label} · ${periodLabel}`} formatter={(value: number | null, name: string) => [money(value), name]} /><Legend />
                    <Bar dataKey="estimated_opportunity" name="Oportunidade estimada" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                    <Line type="monotone" dataKey="service_revenue" name="Realizado" stroke="#10b981" strokeWidth={2} dot={viewMode === 'year'} />
                    <Line type="monotone" dataKey="potential_revenue" name="Potencial preenchido" stroke="#60a5fa" strokeWidth={2} strokeDasharray="5 4" dot={viewMode === 'year'} connectNulls />
                  </ComposedChart></ResponsiveContainer>}
                </CardContent></Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-[11px] leading-relaxed text-muted-foreground">A oportunidade é uma estimativa, não faturamento contabilizado. Cada barbeiro usa sua própria receita por hora produtiva no período; horários de quem não tem serviços concluídos ficam sem estimativa. Considera somente serviços e horários disponíveis sem agendamento ativo; cancelamentos liberam a cadeira. A análise usa dias completos até ontem.</p>
      {summary.unestimated_idle_minutes > 0 && !loading && !loadError && <p className="text-xs text-amber-300">Há {hours(summary.unestimated_idle_minutes)} ociosas sem base de serviços concluídos para estimar. O potencial exibido é parcial.</p>}
    </CardContent>
  </Card>;
}
