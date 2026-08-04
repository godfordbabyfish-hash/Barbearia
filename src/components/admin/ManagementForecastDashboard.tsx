import { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Boxes, CalendarDays, MessageCircle, PackagePlus, RefreshCw, Scissors, TrendingDown, TrendingUp, UserRoundCheck, Users } from 'lucide-react';
import { toast } from 'sonner';

type Forecast = {
  summary: { forecast_appointments: number; forecast_revenue: number; high_demand_days: number; returns_due: number; stock_attention: number };
  daily: Array<{ forecast_date: string; forecast_appointments: number; forecast_minutes: number; forecast_revenue: number; capacity_minutes: number; already_booked: number; expected_occupancy: number; risk: string }>;
  services: Array<{ id: string; title: string; last_30_days: number; previous_30_days: number; average_value: number }>;
  client_returns: Array<{ id: string; name: string; phone: string | null; last_visit: string; average_interval: number; predicted_return: string; days_overdue: number; visits: number }>;
  stock_needs: Array<{ id: string; name: string; unit: string; current_stock: number; minimum_stock: number; average_daily_usage: number; days_remaining: number | null; suggested_purchase: number; risk: string }>;
};
type Props = { onNavigate: (tab: string) => void };
const db = supabase as any;
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const riskLabel: Record<string, string> = { critical: 'Sem capacidade', high: 'Demanda alta', attention: 'Atenção', normal: 'Normal', low: 'Estoque baixo' };

export default function ManagementForecastDashboard({ onNavigate }: Props) {
  const [horizon, setHorizon] = useState('14');
  const [data, setData] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data: result, error } = await db.rpc('get_management_demand_forecast', { p_reference_date: format(new Date(), 'yyyy-MM-dd'), p_horizon_days: Number(horizon) });
    if (error) toast.error('Não foi possível gerar a previsão', { description: error.message }); else setData(result as Forecast);
    setLoading(false);
  }, [horizon]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const channel = supabase.channel('management-forecast-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barber_schedules' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supply_consumptions' }, load).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const chart = (data?.daily || []).map((day) => ({
    name: format(parseISO(day.forecast_date), 'dd/MM'),
    Demanda: Math.round(day.forecast_minutes / 60 * 10) / 10,
    Capacidade: Math.round(day.capacity_minutes / 60 * 10) / 10,
    Agendados: day.already_booked,
  }));
  const contact = (client: Forecast['client_returns'][number]) => {
    if (!client.phone) return toast.error('Cliente sem WhatsApp cadastrado.');
    const phone = client.phone.replace(/\D/g, '');
    const text = encodeURIComponent(`Olá, ${client.name}! Sentimos sua falta na Barbearia Raimundos. Quando quiser renovar o visual, agende pelo nosso site.`);
    window.open(`https://wa.me/${phone.startsWith('55') ? phone : `55${phone}`}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-bold sm:text-xl">Planejamento dos próximos dias</h2><p className="text-xs text-muted-foreground sm:text-sm">Previsão baseada em 8 semanas de demanda, retorno real dos clientes e consumo de 30 dias.</p></div><div className="flex gap-2"><Select value={horizon} onValueChange={setHorizon}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Próximos 7 dias</SelectItem><SelectItem value="14">Próximos 14 dias</SelectItem><SelectItem value="21">Próximos 21 dias</SelectItem><SelectItem value="30">Próximos 30 dias</SelectItem></SelectContent></Select><Button size="icon" variant="outline" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button></div></div>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
      {[["Atendimentos previstos", data?.summary.forecast_appointments || 0, Scissors], ["Receita estimada", money(data?.summary.forecast_revenue || 0), TrendingUp], ["Dias de alta demanda", data?.summary.high_demand_days || 0, CalendarDays], ["Retornos previstos", data?.summary.returns_due || 0, Users], ["Itens para atenção", data?.summary.stock_attention || 0, Boxes]].map(([title, value, Icon]) => <Card key={String(title)}><CardContent className="p-3 sm:p-4"><div className="flex justify-between gap-1"><div><p className="text-[11px] leading-tight text-muted-foreground sm:text-sm">{String(title)}</p>{loading ? <Skeleton className="mt-2 h-6 w-16" /> : <p className="mt-1 break-words text-lg font-bold sm:text-xl">{String(value)}</p>}</div><Icon className="h-4 w-4 text-primary" /></div></CardContent></Card>)}
    </div>
    <Tabs defaultValue="demand" className="space-y-3"><TabsList className="grid h-auto w-full grid-cols-3"><TabsTrigger value="demand">Demanda</TabsTrigger><TabsTrigger value="returns">Retornos</TabsTrigger><TabsTrigger value="stock">Compras</TabsTrigger></TabsList>
      <TabsContent value="demand" className="space-y-4"><div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"><Card><CardHeader><CardTitle className="text-base">Demanda x capacidade programada</CardTitle><CardDescription>Horas esperadas de serviço comparadas às horas abertas na agenda.</CardDescription></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chart}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="name" fontSize={10} /><YAxis yAxisId="hours" fontSize={10} unit="h" /><YAxis yAxisId="count" orientation="right" fontSize={10} /><Tooltip /><Legend /><Bar yAxisId="hours" dataKey="Capacidade" fill="#334155" /><Bar yAxisId="hours" dataKey="Demanda" fill="hsl(var(--primary))" /><Line yAxisId="count" dataKey="Agendados" stroke="#10b981" strokeWidth={2} /></ComposedChart></ResponsiveContainer></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Dias que exigem ação</CardTitle></CardHeader><CardContent className="max-h-72 space-y-2 overflow-y-auto">{(data?.daily || []).filter((day) => day.risk !== 'normal').length === 0 ? <p className="text-sm text-muted-foreground">Capacidade adequada para o período.</p> : (data?.daily || []).filter((day) => day.risk !== 'normal').map((day) => <div key={day.forecast_date} className={`rounded-lg border p-3 ${day.risk === 'critical' ? 'border-red-500/40 bg-red-500/5' : day.risk === 'high' ? 'border-orange-500/40 bg-orange-500/5' : ''}`}><div className="flex items-center justify-between"><p className="font-semibold capitalize">{format(parseISO(day.forecast_date), "EEEE, dd/MM", { locale: ptBR })}</p><Badge variant={day.risk === 'critical' ? 'destructive' : 'outline'}>{riskLabel[day.risk]}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{day.forecast_appointments} atendimentos previstos · {day.expected_occupancy}% da capacidade</p>{day.capacity_minutes === 0 && <p className="mt-1 text-xs font-medium text-red-400">Nenhum horário programado para a equipe.</p>}</div>)}</CardContent></Card></div>
        <Card><CardHeader><CardTitle className="text-base">Tendência por serviço</CardTitle><CardDescription>Últimos 30 dias comparados aos 30 dias anteriores.</CardDescription></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{(data?.services || []).map((service) => { const change = service.previous_30_days ? (service.last_30_days-service.previous_30_days)*100/service.previous_30_days : service.last_30_days ? 100 : 0; return <div key={service.id} className="rounded-lg border p-3"><p className="line-clamp-2 min-h-10 text-sm font-semibold">{service.title}</p><div className="mt-2 flex items-end justify-between"><div><p className="text-xl font-bold">{service.last_30_days}</p><p className="text-[10px] text-muted-foreground">atendimentos</p></div><span className={`text-xs ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{change >= 0 ? <TrendingUp className="mr-1 inline h-3 w-3" /> : <TrendingDown className="mr-1 inline h-3 w-3" />}{Math.abs(change).toFixed(0)}%</span></div></div>; })}</CardContent></Card>
      </TabsContent>
      <TabsContent value="returns"><Card><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="text-base">Clientes no momento provável de retorno</CardTitle><CardDescription>Clientes sem agendamento futuro, priorizados pelo padrão individual de visitas.</CardDescription></div><Button size="sm" variant="outline" onClick={() => onNavigate('users')}><UserRoundCheck className="mr-2 h-4 w-4" />Ver clientes</Button></div></CardHeader><CardContent className="space-y-2">{(data?.client_returns || []).length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum retorno previsto neste período.</p> : (data?.client_returns || []).map((client) => <div key={client.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="truncate font-semibold">{client.name}</p><p className="text-xs text-muted-foreground">Última visita {format(parseISO(client.last_visit), 'dd/MM')} · ciclo médio {client.average_interval} dias</p><p className={`text-xs ${client.days_overdue > 0 ? 'text-orange-400' : 'text-cyan-400'}`}>{client.days_overdue > 0 ? `${client.days_overdue} dia(s) após o retorno previsto` : `Retorno previsto em ${format(parseISO(client.predicted_return), 'dd/MM')}`}</p></div><Button size="sm" variant="outline" onClick={() => contact(client)}><MessageCircle className="mr-1 h-4 w-4" /><span className="hidden sm:inline">Contatar</span></Button></div>)}</CardContent></Card></TabsContent>
      <TabsContent value="stock"><Card><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="text-base">Necessidade estimada de compras</CardTitle><CardDescription>Reposição para atingir o mínimo ou sustentar 30 dias do consumo médio.</CardDescription></div><Button size="sm" variant="outline" onClick={() => onNavigate('supplies')}><PackagePlus className="mr-2 h-4 w-4" />Abrir estoque</Button></div></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{(data?.stock_needs || []).length === 0 ? <p className="col-span-full py-8 text-center text-sm text-muted-foreground">Estoque suficiente para o consumo projetado.</p> : (data?.stock_needs || []).map((item) => <div key={item.id} className="rounded-lg border p-3"><div className="flex justify-between gap-2"><p className="font-semibold">{item.name}</p><Badge variant={item.risk === 'critical' ? 'destructive' : 'outline'}>{riskLabel[item.risk] || item.risk}</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><p className="text-muted-foreground">Saldo</p><p className="font-bold">{item.current_stock} {item.unit}</p></div><div><p className="text-muted-foreground">Comprar</p><p className="font-bold text-primary">{item.suggested_purchase} {item.unit}</p></div><div><p className="text-muted-foreground">Consumo/dia</p><p>{item.average_daily_usage || 'Sem histórico'}</p></div><div><p className="text-muted-foreground">Autonomia</p><p>{item.days_remaining === null ? 'Não calculada' : `${item.days_remaining} dias`}</p></div></div>{item.days_remaining !== null && <Progress value={Math.min(100, item.days_remaining/30*100)} className="mt-3 h-1.5" />}</div>)}</CardContent></Card></TabsContent>
    </Tabs>
    <p className="text-center text-[11px] text-muted-foreground">Previsões são apoio à decisão e mudam conforme novos agendamentos, horários e consumos são registrados.</p>
  </div>;
}
