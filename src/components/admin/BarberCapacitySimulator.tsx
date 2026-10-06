import { useEffect, useMemo, useState } from 'react';
import { Calculator, CalendarDays, Clock3, Scissors, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateBarberCapacity } from '@/lib/barberCapacitySimulator';

export type CapacityBarberOption = {
  barber_id: string;
  barber_name: string;
  average_ticket?: number;
  average_service_minutes?: number;
};

type Props = { barbers: CapacityBarberOption[]; month: string; maxMonth: string };
const weekdays = [
  { value: 1, label: 'Seg' }, { value: 2, label: 'Ter' }, { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' }, { value: 5, label: 'Sex' }, { value: 6, label: 'Sáb' }, { value: 0, label: 'Dom' },
];
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const hours = (minutes: number) => `${(minutes / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;

export default function BarberCapacitySimulator({ barbers, month: analysisMonth, maxMonth }: Props) {
  const [barberId, setBarberId] = useState(barbers[0]?.barber_id || '');
  const [month, setMonth] = useState(analysisMonth);
  const [workingWeekdays, setWorkingWeekdays] = useState([1, 2, 3, 4, 5, 6]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('20:00');
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [averageServiceMinutes, setAverageServiceMinutes] = useState(30);
  const [averageTicket, setAverageTicket] = useState(0);
  const [occupancyPercent, setOccupancyPercent] = useState(100);
  const selectedBarber = barbers.find((barber) => barber.barber_id === barberId);

  useEffect(() => { if (analysisMonth) setMonth(analysisMonth); }, [analysisMonth]);
  useEffect(() => {
    if (!barberId && barbers[0]) setBarberId(barbers[0].barber_id);
  }, [barberId, barbers]);
  useEffect(() => {
    if (!selectedBarber) return;
    setAverageTicket(Number(selectedBarber.average_ticket || 0));
    setAverageServiceMinutes(Math.max(1, Math.round(Number(selectedBarber.average_service_minutes || 30))));
  }, [selectedBarber]);

  const result = useMemo(() => calculateBarberCapacity({
    month, workingWeekdays, startTime, endTime, breakMinutes, averageServiceMinutes, averageTicket, occupancyPercent,
  }), [month, workingWeekdays, startTime, endTime, breakMinutes, averageServiceMinutes, averageTicket, occupancyPercent]);
  const toggleWeekday = (weekday: number) => setWorkingWeekdays((current) => current.includes(weekday)
    ? current.filter((item) => item !== weekday)
    : [...current, weekday]);

  return <Card className="border-primary/30">
    <CardHeader>
      <div className="flex items-start gap-3"><span className="rounded-lg bg-primary/10 p-2 text-primary"><Calculator className="h-5 w-5" /></span><div><CardTitle className="text-base sm:text-lg">Simulador de capacidade por barbeiro</CardTitle><CardDescription className="mt-1">Monte uma jornada de trabalho e veja quantos atendimentos cabem no mês e quanto ela pode faturar usando o ticket médio.</CardDescription></div></div>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-xs text-muted-foreground">Barbeiro<Select value={barberId} onValueChange={setBarberId}><SelectTrigger className="mt-1 text-foreground"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{barbers.map((barber) => <SelectItem key={barber.barber_id} value={barber.barber_id}>{barber.barber_name}</SelectItem>)}</SelectContent></Select></label>
        <label className="space-y-1 text-xs text-muted-foreground">Mês<Input className="mt-1 text-foreground" type="month" value={month} max={maxMonth} onChange={(event) => setMonth(event.target.value)} /></label>
        <label className="space-y-1 text-xs text-muted-foreground">Entrada<Input className="mt-1 text-foreground" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
        <label className="space-y-1 text-xs text-muted-foreground">Saída<Input className="mt-1 text-foreground" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
      </div>

      <div><p className="mb-2 text-xs text-muted-foreground">Dias trabalhados — padrão: segunda a sábado, uma folga semanal</p><div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{weekdays.map((day) => <Button key={day.value} type="button" size="sm" variant={workingWeekdays.includes(day.value) ? 'default' : 'outline'} onClick={() => toggleWeekday(day.value)}>{day.label}</Button>)}</div></div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-xs text-muted-foreground">Intervalo por dia (min)<Input className="mt-1 text-foreground" type="number" min="0" max="600" value={breakMinutes} onChange={(event) => setBreakMinutes(Number(event.target.value))} /></label>
        <label className="space-y-1 text-xs text-muted-foreground">Duração média por cliente (min)<Input className="mt-1 text-foreground" type="number" min="1" max="600" value={averageServiceMinutes} onChange={(event) => setAverageServiceMinutes(Number(event.target.value))} /></label>
        <label className="space-y-1 text-xs text-muted-foreground">Ticket médio (R$)<Input className="mt-1 text-foreground" type="number" min="0" step="0.01" value={averageTicket} onChange={(event) => setAverageTicket(Number(event.target.value))} /></label>
        <label className="space-y-1 text-xs text-muted-foreground">Ocupação desejada (%)<Input className="mt-1 text-foreground" type="number" min="0" max="100" value={occupancyPercent} onChange={(event) => setOccupancyPercent(Number(event.target.value))} /></label>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {[
          ['Dias trabalhados', result.workingDays, CalendarDays],
          ['Horas por dia', hours(result.dailyAvailableMinutes), Clock3],
          ['Horas no mês', hours(result.monthlyAvailableMinutes), Scissors],
          ['Atendimentos', result.estimatedAppointments, Users],
          ['Faturamento projetado', money(result.projectedRevenue), TrendingUp],
        ].map(([label, value, Icon]) => <Card key={String(label)} className="bg-muted/20 last:col-span-2 lg:last:col-span-1"><CardContent className="flex items-start justify-between gap-2 p-3"><div><p className="text-[11px] text-muted-foreground">{String(label)}</p><p className="mt-1 text-lg font-bold">{String(value)}</p></div><Icon className="h-4 w-4 shrink-0 text-primary" /></CardContent></Card>)}
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">Simulação sem alterar a agenda real. Cálculo: dias selecionados × horas líquidas do dia × ocupação desejada ÷ duração média, multiplicado pelo ticket médio. Produtos, comissões, impostos e custos não entram no faturamento projetado.</p>
    </CardContent>
  </Card>;
}
