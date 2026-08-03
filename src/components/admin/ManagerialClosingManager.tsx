import { useCallback, useEffect, useMemo, useState } from 'react';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, FileCheck2, History, Loader2, LockKeyhole, RefreshCw, RotateCcw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Snapshot = {
  period_start: string;
  period_end: string;
  service_revenue: number;
  product_revenue: number;
  gross_revenue: number;
  service_commissions: number;
  product_commissions: number;
  gross_commissions: number;
  approved_advances: number;
  operational_expenses: number;
  supply_consumption_cost: number;
  discounts_granted: number;
  cash_difference: number;
  net_profit: number;
  service_count: number;
  product_sale_count: number;
  expense_count: number;
  supply_consumption_count: number;
  cash_closed_days: number;
  payment_breakdown?: Record<string, number>;
  barbers?: Array<{ barber_id: string; barber_name: string; services: number; revenue: number; commission: number }>;
};

type Closure = Snapshot & {
  id: string;
  revision: number;
  status: 'closed' | 'reopened';
  snapshot: Snapshot;
  notes?: string | null;
  closed_at: string;
  reopening_reason?: string | null;
};

const db = supabase as any;
const money = (value: number | string | null | undefined) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateLabel = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');

export default function ManagerialClosingManager() {
  const currentWeek = useMemo(() => {
    const now = new Date();
    return {
      start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    };
  }, []);
  const [periodStart, setPeriodStart] = useState(currentWeek.start);
  const [periodEnd, setPeriodEnd] = useState(currentWeek.end);
  const [preview, setPreview] = useState<Snapshot | null>(null);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [reopening, setReopening] = useState<Closure | null>(null);
  const [reopeningReason, setReopeningReason] = useState('');

  const loadClosures = useCallback(async () => {
    const { data, error } = await db.from('managerial_financial_closures').select('*').order('period_start', { ascending: false }).order('revision', { ascending: false }).limit(24);
    if (error) return toast.error('Não foi possível carregar os fechamentos gerenciais.');
    setClosures(data || []);
  }, []);

  useEffect(() => {
    loadClosures();
    const channel = supabase.channel('managerial-financial-closures-ui')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'managerial_financial_closures' }, loadClosures)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadClosures]);

  const generatePreview = async () => {
    if (!periodStart || !periodEnd || periodStart > periodEnd) return toast.error('Informe um período válido.');
    setLoading(true);
    try {
      const { data, error } = await db.rpc('preview_managerial_financial_closure', { p_period_start: periodStart, p_period_end: periodEnd });
      if (error) throw error;
      setPreview(data);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao calcular o fechamento.');
    } finally { setLoading(false); }
  };

  const closePeriod = async () => {
    if (!preview) return;
    if (periodEnd >= format(new Date(), 'yyyy-MM-dd')) return toast.error('O fechamento definitivo só é liberado após o fim do período.');
    setLoading(true);
    try {
      const { data, error } = await db.rpc('close_managerial_financial_period', {
        p_period_start: periodStart,
        p_period_end: periodEnd,
        p_notes: notes,
        p_idempotency_key: crypto.randomUUID(),
      });
      if (error) throw error;
      toast.success(`Fechamento gerencial salvo — revisão ${data.revision}.`);
      setNotes('');
      await loadClosures();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fechar o período.');
    } finally { setLoading(false); }
  };

  const reopenPeriod = async () => {
    if (!reopening || reopeningReason.trim().length < 5) return toast.error('Informe uma justificativa com pelo menos 5 caracteres.');
    setLoading(true);
    try {
      const { error } = await db.rpc('reopen_managerial_financial_period', { p_closure_id: reopening.id, p_reason: reopeningReason.trim() });
      if (error) throw error;
      toast.success('Período reaberto. O fechamento anterior permanece preservado no histórico.');
      setReopening(null);
      setReopeningReason('');
      await loadClosures();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao reabrir o período.');
    } finally { setLoading(false); }
  };

  const downloadPdf = (snapshot: Snapshot, revision?: number) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Fechamento Gerencial', 14, 18);
    doc.setFontSize(10);
    doc.text(`${dateLabel(snapshot.period_start)} a ${dateLabel(snapshot.period_end)}${revision ? ` — revisão ${revision}` : ' — prévia'}`, 14, 26);
    autoTable(doc, {
      startY: 34,
      head: [['Indicador', 'Valor']],
      body: [
        ['Faturamento bruto', money(snapshot.gross_revenue)],
        ['Receita de serviços', money(snapshot.service_revenue)],
        ['Receita de produtos', money(snapshot.product_revenue)],
        ['Comissões brutas', money(snapshot.gross_commissions)],
        ['Despesas operacionais', money(snapshot.operational_expenses)],
        ['Consumo de insumos', money(snapshot.supply_consumption_cost)],
        ['Descontos concedidos', money(snapshot.discounts_granted)],
        ['Divergência de caixa', money(snapshot.cash_difference)],
        ['Lucro líquido', money(snapshot.net_profit)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [245, 183, 20] },
    });
    if (snapshot.barbers?.length) autoTable(doc, {
      head: [['Barbeiro', 'Atendimentos', 'Receita', 'Comissão']],
      body: snapshot.barbers.map((item) => [item.barber_name, item.services, money(item.revenue), money(item.commission)]),
      theme: 'grid',
      headStyles: { fillColor: [25, 25, 25] },
    });
    doc.save(`fechamento-gerencial-${snapshot.period_start}-${snapshot.period_end}.pdf`);
  };

  const metrics = preview ? [
    ['Faturamento bruto', preview.gross_revenue],
    ['Comissões', preview.gross_commissions],
    ['Despesas', preview.operational_expenses],
    ['Insumos consumidos', preview.supply_consumption_cost],
    ['Descontos', preview.discounts_granted],
    ['Divergência de caixa', preview.cash_difference],
    ['Vales aprovados', preview.approved_advances],
    ['Lucro líquido', preview.net_profit],
  ] as const : [];

  return (
    <div className="space-y-4">
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg"><LockKeyhole className="h-5 w-5 text-primary" />Fechamento gerencial</CardTitle>
          <p className="text-sm text-muted-foreground">Resultado consolidado e versionado da barbearia. O fechamento salvo não muda com alterações futuras.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <div><Label>Data inicial</Label><Input type="date" className="mt-1" value={periodStart} onChange={(event) => { setPeriodStart(event.target.value); setPreview(null); }} /></div>
            <div><Label>Data final</Label><Input type="date" className="mt-1" value={periodEnd} onChange={(event) => { setPeriodEnd(event.target.value); setPreview(null); }} /></div>
            <Button className="col-span-2 sm:col-span-1 sm:self-end" variant="outline" onClick={generatePreview} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Calcular prévia</Button>
          </div>

          {preview && <>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{metrics.map(([label, value]) => <div key={label} className="min-w-0 rounded-lg border bg-muted/20 p-3"><p className="text-[11px] leading-tight text-muted-foreground sm:text-xs">{label}</p><p className={`mt-1 break-words text-base font-bold sm:text-lg ${label === 'Lucro líquido' ? 'text-primary' : ''}`}>{money(value)}</p></div>)}</div>
            <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto]">
              <div><Label>Observações do fechamento</Label><Textarea className="mt-1 min-h-20" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Conferências, ocorrências ou justificativas do período" /></div>
              <div className="flex flex-col justify-end gap-2 sm:min-w-48">
                <Button variant="outline" onClick={() => downloadPdf(preview)}><Download className="mr-2 h-4 w-4" />Baixar prévia</Button>
                <Button onClick={closePeriod} disabled={loading || periodEnd >= format(new Date(), 'yyyy-MM-dd')}><FileCheck2 className="mr-2 h-4 w-4" />Salvar fechamento</Button>
              </div>
            </div>
            {periodEnd >= format(new Date(), 'yyyy-MM-dd') && <p className="text-xs text-amber-500">Este período ainda está em andamento. A prévia está disponível; o fechamento definitivo será liberado no dia seguinte.</p>}
          </>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><History className="h-5 w-5 text-primary" />Histórico de fechamentos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {closures.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum fechamento gerencial salvo.</p> : closures.map((closure) => <div key={closure.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{dateLabel(closure.period_start)} a {dateLabel(closure.period_end)}</p><Badge variant={closure.status === 'closed' ? 'secondary' : 'outline'}>{closure.status === 'closed' ? 'Fechado' : 'Reaberto'}</Badge><Badge variant="outline">Revisão {closure.revision}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Lucro registrado: {money(closure.net_profit)} · fechado em {new Date(closure.closed_at).toLocaleString('pt-BR')}</p>{closure.reopening_reason && <p className="mt-1 text-xs text-amber-500">Justificativa: {closure.reopening_reason}</p>}</div>
            <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => downloadPdf(closure.snapshot, closure.revision)}><Download className="mr-1 h-4 w-4" />PDF</Button>{closure.status === 'closed' && <Button size="sm" variant="outline" onClick={() => setReopening(closure)}><RotateCcw className="mr-1 h-4 w-4" />Reabrir</Button>}</div>
          </div>)}
        </CardContent>
      </Card>

      <Dialog open={Boolean(reopening)} onOpenChange={(open) => { if (!open) { setReopening(null); setReopeningReason(''); } }}>
        <DialogContent><DialogHeader><DialogTitle>Reabrir fechamento gerencial</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">O snapshot anterior será preservado. Após as correções, salve uma nova revisão para o mesmo período.</p><div><Label>Justificativa obrigatória</Label><Textarea className="mt-1" value={reopeningReason} onChange={(event) => setReopeningReason(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setReopening(null)}>Cancelar</Button><Button onClick={reopenPeriod} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar reabertura</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
