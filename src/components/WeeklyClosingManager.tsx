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
  onSelectedWeekChange?: (range: { start: string; end: string }) => void;
}

interface BarberOption { id: string; name: string }
interface StoredClosure { id: string; snapshot: WeeklyClosureSnapshot; closed_at: string }

export default function WeeklyClosingManager({ barberId, canClose, onSelectedWeekChange }: WeeklyClosingManagerProps) {
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
  const canCloseEarly = Boolean(
    canClose && selectedWeek?.startISO === currentWeekStartISO && availability !== 'closed',
  );

  useEffect(() => {
    if (selectedWeek) onSelectedWeekChange?.({ start: selectedWeek.startISO, end: selectedWeek.endISO });
  }, [onSelectedWeekChange, selectedWeek?.startISO, selectedWeek?.endISO]);

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

  const handleRefreshPdf = async () => {
    setLoading(true);
    try {
      const snapshot = await createSnapshot(true);
      downloadWeeklyClosurePdf(snapshot, false, { updatedPreview: true });
      toast.success('Prévia atualizada baixada. O fechamento salvo permanece inalterado.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar o PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (early = false) => {
    if (!canClose || !selectedWeek || (!early && availability !== 'closed')) return;
    setLoading(true);
    try {
      const db = supabase as any;
      const [servicesResult, productsResult] = await Promise.all([
        db.from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('barber_id', selectedBarber)
          .gte('appointment_date', selectedWeek.startISO)
          .lte('appointment_date', selectedWeek.endISO)
          .in('status', ['pending', 'confirmed']),
        db.from('product_sales')
          .select('id', { count: 'exact', head: true })
          .eq('barber_id', selectedBarber)
          .gte('sale_date', selectedWeek.startISO)
          .lte('sale_date', selectedWeek.endISO)
          .eq('status', 'pending'),
      ]);
      if (servicesResult.error) throw servicesResult.error;
      if (productsResult.error) throw productsResult.error;

      const pendingServices = servicesResult.count || 0;
      const pendingProducts = productsResult.count || 0;
      if (pendingServices > 0 || pendingProducts > 0) {
        toast.error(
          `Fechamento bloqueado: ${pendingServices} serviço(s) aguardam finalização e ${pendingProducts} venda(s) de produto aguardam confirmação do barbeiro. Finalize, confirme ou cancele as pendências e tente novamente.`,
          { duration: 8000 },
        );
        return;
      }

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
              <><p className="flex items-center gap-2 font-medium text-green-500"><FileCheck2 className="h-4 w-4" /> Fechamento salvo</p><p className="text-xs text-muted-foreground">Imutável desde {new Date(closure.closed_at).toLocaleString('pt-BR')}. Use “Baixar PDF atualizado” para refletir os dados atuais sem alterar o registro oficial.</p></>
            ) : availability === 'closed' ? (
              <><p className="font-medium">Semana encerrada e disponível para fechamento</p><p className="text-xs text-muted-foreground">Somente serviços concluídos e pagos entram no total.</p></>
            ) : availability === 'preview' ? (
              <><p className="font-medium text-amber-500">Semana em andamento — prévia disponível</p><p className="text-xs text-muted-foreground">O gestor pode fechar antecipadamente se todos os serviços estiverem finalizados e as vendas de produtos confirmadas.</p></>
            ) : canCloseEarly ? (
              <><p className="font-medium text-amber-500">Semana atual ainda em andamento</p><p className="text-xs text-muted-foreground">O gestor pode fechá-la antecipadamente quando todos os serviços estiverem finalizados e as vendas de produtos confirmadas.</p></>
            ) : (
              <><p className="flex items-center gap-2 font-medium"><LockKeyhole className="h-4 w-4" /> Semana ainda aberta</p><p className="text-xs text-muted-foreground">Aguarde o sábado para a prévia ou o encerramento do domingo.</p></>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {closure ? (
              <>
                <Button variant="outline" onClick={handleRefreshPdf} disabled={loading || !selectedBarber}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Baixar PDF atualizado
                </Button>
                <Button onClick={() => downloadWeeklyClosurePdf(closure.snapshot, true)}>
                  <Download className="mr-2 h-4 w-4" />Baixar fechamento salvo
                </Button>
              </>
            ) : (
              <>
                {availability === 'preview' && <Button variant="outline" onClick={handlePreview} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Baixar prévia</Button>}
                {canCloseEarly && <Button onClick={() => handleClose(true)} disabled={loading || !selectedBarber}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}Fechar antecipadamente</Button>}
                {availability === 'closed' && canClose && <Button onClick={handleClose} disabled={loading || !selectedBarber}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}Salvar fechamento</Button>}
                {availability === 'closed' && !canClose && <p className="text-sm text-muted-foreground">Aguardando o fechamento do gestor.</p>}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
