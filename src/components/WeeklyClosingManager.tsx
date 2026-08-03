import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Download, FileCheck2, Loader2, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCurrentFinancialCompetence, getWeekAvailability, listFinancialWeeks } from '@/lib/financialWeek';
import { buildWeeklyClosureSnapshot, downloadWeeklyClosurePdf, WeeklyClosureSnapshot } from '@/lib/weeklyFinancialReport';

interface WeeklyClosingManagerProps {
  barberId?: string;
  canClose: boolean;
}

interface BarberOption { id: string; name: string }
interface StoredClosure { id: string; snapshot: WeeklyClosureSnapshot; closed_at: string }

export default function WeeklyClosingManager({ barberId, canClose }: WeeklyClosingManagerProps) {
  const currentCompetence = useMemo(() => getCurrentFinancialCompetence(), []);
  const currentWeekStartISO = useMemo(
    () => listFinancialWeeks(currentCompetence.year, currentCompetence.month)
      .find((item) => item.number === currentCompetence.weekNumber)?.startISO,
    [currentCompetence],
  );
  const [year, setYear] = useState(currentCompetence.year);
  const [month, setMonth] = useState(currentCompetence.month);
  const [weekNumber, setWeekNumber] = useState(currentCompetence.weekNumber);
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [selectedBarber, setSelectedBarber] = useState(barberId || '');
  const [closure, setClosure] = useState<StoredClosure | null>(null);
  const [loading, setLoading] = useState(false);
  const weeks = useMemo(() => listFinancialWeeks(year, month), [year, month]);
  const selectedWeek = weeks.find((week) => week.number === weekNumber) || weeks[0];
  const availability = selectedWeek ? getWeekAvailability(selectedWeek) : 'open';

  useEffect(() => {
    if (barberId) {
      setSelectedBarber(barberId);
      return;
    }
    (async () => {
      const { data, error } = await supabase.from('barbers').select('id,name').eq('visible', true).order('name');
      if (error) return toast.error('Não foi possível carregar os barbeiros');
      setBarbers(data || []);
      setSelectedBarber((current) => current || data?.[0]?.id || '');
    })();
  }, [barberId]);

  useEffect(() => {
    const current = weeks.find((week) => new Date() >= week.start && new Date() <= new Date(`${week.endISO}T23:59:59`));
    setWeekNumber(current?.number || weeks.at(-1)?.number || 1);
  }, [year, month]);

  useEffect(() => {
    if (!selectedBarber || !selectedWeek) {
      setClosure(null);
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await (supabase as any)
        .from('weekly_financial_closures')
        .select('id,snapshot,closed_at')
        .eq('barber_id', selectedBarber)
        .eq('week_start', selectedWeek.startISO)
        .maybeSingle();
      if (!active) return;
      if (error) toast.error('Erro ao consultar o fechamento semanal');
      setClosure(data || null);
    })();
    return () => { active = false; };
  }, [selectedBarber, selectedWeek?.startISO]);

  const createSnapshot = async (preview: boolean) => {
    if (!selectedBarber || !selectedWeek) throw new Error('Selecione o barbeiro e a semana');
    return buildWeeklyClosureSnapshot({
      barberId: selectedBarber,
      start: selectedWeek.startISO,
      end: selectedWeek.endISO,
      year,
      month,
      weekNumber: selectedWeek.number,
      preview,
    });
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const snapshot = await createSnapshot(true);
      downloadWeeklyClosurePdf(snapshot, false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar a prévia');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!canClose || !selectedWeek || availability !== 'closed') return;
    setLoading(true);
    try {
      const snapshot = await createSnapshot(false);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('Sessão inválida');
      const { data, error } = await (supabase as any).from('weekly_financial_closures').insert({
        barber_id: selectedBarber,
        week_start: selectedWeek.startISO,
        week_end: selectedWeek.endISO,
        competence_year: year,
        competence_month: month,
        week_number: selectedWeek.number,
        snapshot,
        closed_by: authData.user.id,
      }).select('id,snapshot,closed_at').single();
      if (error?.code === '23505') {
        const existing = await (supabase as any).from('weekly_financial_closures').select('id,snapshot,closed_at').eq('barber_id', selectedBarber).eq('week_start', selectedWeek.startISO).single();
        if (existing.error) throw existing.error;
        setClosure(existing.data);
        downloadWeeklyClosurePdf(existing.data.snapshot, true);
        toast.info('Esta semana já estava fechada. Baixamos o fechamento salvo.');
        return;
      }
      if (error) throw error;
      setClosure(data);
      downloadWeeklyClosurePdf(data.snapshot, true);
      toast.success('Fechamento semanal salvo e protegido contra alterações');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar o fechamento');
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from({ length: 4 }, (_, index) => new Date().getFullYear() - 2 + index);
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <Card className="border-primary/30 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarCheck className="h-5 w-5 text-primary" />
          Fechamento semanal
        </CardTitle>
        <p className="text-sm text-muted-foreground">Semanas automáticas de segunda a domingo. O mês é definido pela segunda-feira.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`grid gap-3 ${barberId ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
          {!barberId && (
            <div><Label>Barbeiro</Label><Select value={selectedBarber} onValueChange={setSelectedBarber}><SelectTrigger className="mt-2"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{barbers.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
          )}
          <div><Label>Ano</Label><Select value={String(year)} onValueChange={(value) => setYear(Number(value))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{years.map((item) => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Mês de competência</Label><Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{months.map((item, index) => <SelectItem key={item} value={String(index + 1)}>{item}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Semana</Label><Select value={String(weekNumber)} onValueChange={(value) => setWeekNumber(Number(value))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{weeks.map((item) => <SelectItem key={item.startISO} value={String(item.number)}>{item.label}{item.startISO === currentWeekStartISO ? ' (Semana atual)' : ''}</SelectItem>)}</SelectContent></Select></div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {closure ? (
              <><p className="flex items-center gap-2 font-medium text-green-500"><FileCheck2 className="h-4 w-4" /> Fechamento salvo</p><p className="text-xs text-muted-foreground">Imutável desde {new Date(closure.closed_at).toLocaleString('pt-BR')}.</p></>
            ) : availability === 'closed' ? (
              <><p className="font-medium">Semana encerrada e disponível para fechamento</p><p className="text-xs text-muted-foreground">Somente serviços concluídos e pagos entram no total.</p></>
            ) : availability === 'preview' ? (
              <><p className="font-medium text-amber-500">Semana em andamento — prévia disponível</p><p className="text-xs text-muted-foreground">O fechamento definitivo será liberado na segunda-feira.</p></>
            ) : (
              <><p className="flex items-center gap-2 font-medium"><LockKeyhole className="h-4 w-4" /> Semana ainda aberta</p><p className="text-xs text-muted-foreground">Aguarde o sábado para a prévia ou o encerramento do domingo.</p></>
            )}
          </div>
          <div className="flex gap-2">
            {closure ? (
              <Button onClick={() => downloadWeeklyClosurePdf(closure.snapshot, true)}><Download className="mr-2 h-4 w-4" />Baixar fechamento salvo</Button>
            ) : availability === 'preview' ? (
              <Button variant="outline" onClick={handlePreview} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Baixar prévia</Button>
            ) : availability === 'closed' && canClose ? (
              <Button onClick={handleClose} disabled={loading || !selectedBarber}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}Salvar fechamento</Button>
            ) : availability === 'closed' ? (
              <p className="text-sm text-muted-foreground">Aguardando o fechamento do gestor.</p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
