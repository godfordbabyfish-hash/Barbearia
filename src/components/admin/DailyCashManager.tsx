import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownToLine, ArrowUpFromLine, Calculator, CheckCircle2, Clock3, LockKeyhole, RefreshCw, WalletCards } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type CashSession = {
  id: string;
  business_date: string;
  status: 'open' | 'closed';
  opening_balance: number;
  expected_cash: number | null;
  counted_cash: number | null;
  cash_difference: number | null;
  total_sales: number | null;
  cash_sales: number | null;
  pix_sales: number | null;
  card_sales: number | null;
  other_sales: number | null;
  opened_at: string;
  closed_at: string | null;
};

type CashMovement = { id: string; movement_type: 'reinforcement' | 'withdrawal'; amount: number; reason: string; created_at: string };
type CashSummary = {
  session: CashSession | null;
  movements: CashMovement[];
  live_totals: { total_sales: number; cash_sales: number; pix_sales: number; card_sales: number; other_sales: number };
  reinforcements: number;
  withdrawals: number;
  live_expected_cash: number;
};

const db = supabase as any;
const today = () => format(new Date(), 'yyyy-MM-dd');
const money = (value: number | null | undefined) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function DailyCashManager() {
  const [date, setDate] = useState(today());
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [history, setHistory] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [openingNotes, setOpeningNotes] = useState('');
  const [movementOpen, setMovementOpen] = useState(false);
  const [movement, setMovement] = useState({ type: 'withdrawal', amount: '', reason: '' });
  const [closeOpen, setCloseOpen] = useState(false);
  const [countedCash, setCountedCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [summaryResult, historyResult] = await Promise.all([
      db.rpc('get_daily_cash_summary', { p_business_date: date }),
      db.from('daily_cash_sessions').select('*').order('business_date', { ascending: false }).limit(30),
    ]);
    setLoading(false);
    if (summaryResult.error || historyResult.error) {
      toast.error('Erro ao carregar o caixa', { description: (summaryResult.error || historyResult.error)?.message });
      return;
    }
    setSummary(summaryResult.data as CashSummary);
    setHistory(historyResult.data || []);
  }, [date]);

  useEffect(() => {
    void load();
    const channel = supabase.channel('daily-cash-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_cash_sessions' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_cash_movements' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_payments' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_sales' }, load)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const display = useMemo(() => {
    const session = summary?.session;
    if (session?.status === 'closed') return {
      total_sales: Number(session.total_sales || 0), cash_sales: Number(session.cash_sales || 0), pix_sales: Number(session.pix_sales || 0),
      card_sales: Number(session.card_sales || 0), other_sales: Number(session.other_sales || 0), expected: Number(session.expected_cash || 0),
    };
    return { ...(summary?.live_totals || { total_sales: 0, cash_sales: 0, pix_sales: 0, card_sales: 0, other_sales: 0 }), expected: Number(summary?.live_expected_cash || 0) };
  }, [summary]);

  async function openCash() {
    setSaving(true);
    const { error } = await db.rpc('open_daily_cash', {
      p_business_date: date, p_opening_balance: Number(openingBalance || 0), p_opening_notes: openingNotes || null, p_idempotency_key: crypto.randomUUID(),
    });
    setSaving(false);
    if (error) return toast.error('Não foi possível abrir o caixa', { description: error.message });
    toast.success('Caixa aberto com sucesso');
    setOpeningNotes('');
    void load();
  }

  async function saveMovement() {
    if (!summary?.session) return;
    setSaving(true);
    const { error } = await db.rpc('record_daily_cash_movement', {
      p_cash_session_id: summary.session.id, p_movement_type: movement.type, p_amount: Number(movement.amount), p_reason: movement.reason, p_idempotency_key: crypto.randomUUID(),
    });
    setSaving(false);
    if (error) return toast.error('Movimentação não registrada', { description: error.message });
    toast.success(movement.type === 'withdrawal' ? 'Sangria registrada' : 'Reforço registrado');
    setMovementOpen(false);
    setMovement({ type: 'withdrawal', amount: '', reason: '' });
    void load();
  }

  async function closeCash() {
    if (!summary?.session) return;
    setSaving(true);
    const { error } = await db.rpc('close_daily_cash', {
      p_cash_session_id: summary.session.id, p_counted_cash: Number(countedCash), p_closing_notes: closingNotes || null, p_idempotency_key: crypto.randomUUID(),
    });
    setSaving(false);
    if (error) return toast.error('Não foi possível fechar o caixa', { description: error.message });
    toast.success('Caixa fechado e conferência salva');
    setCloseOpen(false);
    setCountedCash('');
    setClosingNotes('');
    void load();
  }

  const session = summary?.session;
  const differencePreview = Number(countedCash || 0) - display.expected;
  const metricCards = [
    ['Recebido no dia', money(display.total_sales), WalletCards], ['Dinheiro', money(display.cash_sales), Calculator], ['Pix', money(display.pix_sales), CheckCircle2],
    ['Cartão', money(display.card_sales), WalletCards], ['Outros', money(display.other_sales), WalletCards], ['Esperado no caixa', money(display.expected), Calculator],
  ] as const;

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-xl font-bold">Caixa Diário</h2><p className="text-sm text-muted-foreground">Abertura, movimentações e conferência do dinheiro físico.</p></div>
      <div className="flex gap-2"><div><Label className="text-xs">Data do caixa</Label><Input type="date" max={today()} value={date} onChange={(event) => setDate(event.target.value)} /></div><Button className="mt-5" size="icon" variant="outline" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button></div>
    </div>

    {loading ? <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-24" />)}</div> : !session ? (
      <Card className="border-primary/30"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><LockKeyhole className="h-5 w-5 text-primary" />Abrir caixa de {format(new Date(`${date}T12:00:00`), "dd 'de' MMMM", { locale: ptBR })}</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><div><Label>Saldo inicial em dinheiro</Label><Input type="number" min="0" step="0.01" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} /></div><div><Label>Observação da abertura</Label><Input value={openingNotes} onChange={(event) => setOpeningNotes(event.target.value)} placeholder="Opcional" /></div><Button className="sm:col-span-2" onClick={openCash} disabled={saving || Number(openingBalance) < 0}>Abrir caixa</Button></CardContent></Card>
    ) : <>
      <div className="flex flex-wrap items-center gap-2"><Badge variant={session.status === 'open' ? 'default' : 'secondary'}>{session.status === 'open' ? 'Caixa aberto' : 'Caixa fechado'}</Badge><span className="text-xs text-muted-foreground">Aberto em {new Date(session.opened_at).toLocaleString('pt-BR')}</span>{session.closed_at && <span className="text-xs text-muted-foreground">· Fechado em {new Date(session.closed_at).toLocaleString('pt-BR')}</span>}</div>
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">{metricCards.map(([label, value, Icon]) => <Card key={label}><CardContent className="p-2.5 sm:p-4"><div className="flex justify-between gap-1"><p className="text-[10px] leading-tight text-muted-foreground sm:text-xs">{label}</p><Icon className="h-3.5 w-3.5 shrink-0 text-primary" /></div><p className="mt-2 break-words text-sm font-bold leading-tight sm:text-lg">{value}</p></CardContent></Card>)}</div>
      {session.status === 'open' ? <div className="grid grid-cols-2 gap-2 sm:flex"><Button variant="outline" onClick={() => { setMovement({ type: 'reinforcement', amount: '', reason: '' }); setMovementOpen(true); }}><ArrowDownToLine className="mr-2 h-4 w-4" />Reforço</Button><Button variant="outline" onClick={() => { setMovement({ type: 'withdrawal', amount: '', reason: '' }); setMovementOpen(true); }}><ArrowUpFromLine className="mr-2 h-4 w-4" />Sangria</Button><Button className="col-span-2 sm:ml-auto" onClick={() => setCloseOpen(true)}><LockKeyhole className="mr-2 h-4 w-4" />Conferir e fechar</Button></div> : <Card><CardContent className="grid grid-cols-3 gap-3 p-4"><div><p className="text-xs text-muted-foreground">Esperado</p><p className="font-bold">{money(session.expected_cash)}</p></div><div><p className="text-xs text-muted-foreground">Contado</p><p className="font-bold">{money(session.counted_cash)}</p></div><div><p className="text-xs text-muted-foreground">Diferença</p><p className={`font-bold ${Number(session.cash_difference) < 0 ? 'text-red-400' : Number(session.cash_difference) > 0 ? 'text-amber-400' : 'text-green-400'}`}>{money(session.cash_difference)}</p></div></CardContent></Card>}

      <Card><CardHeader><CardTitle className="text-base">Movimentações do caixa</CardTitle></CardHeader><CardContent>{summary?.movements?.length ? <div className="space-y-2">{summary.movements.map((item) => <div key={item.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-medium">{item.movement_type === 'reinforcement' ? 'Reforço' : 'Sangria'} · {item.reason}</p><p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('pt-BR')}</p></div><p className={`font-bold ${item.movement_type === 'reinforcement' ? 'text-green-400' : 'text-red-400'}`}>{item.movement_type === 'reinforcement' ? '+' : '−'} {money(item.amount)}</p></div>)}</div> : <p className="text-sm text-muted-foreground">Nenhum reforço ou sangria registrado.</p>}</CardContent></Card>
    </>}

    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4 text-primary" />Histórico recente</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Status</TableHead><TableHead>Vendas</TableHead><TableHead>Esperado</TableHead><TableHead>Contado</TableHead><TableHead>Diferença</TableHead></TableRow></TableHeader><TableBody>{history.map((item) => <TableRow key={item.id} className="cursor-pointer" onClick={() => setDate(item.business_date)}><TableCell>{new Date(`${item.business_date}T12:00:00`).toLocaleDateString('pt-BR')}</TableCell><TableCell><Badge variant={item.status === 'closed' ? 'secondary' : 'default'}>{item.status === 'closed' ? 'Fechado' : 'Aberto'}</Badge></TableCell><TableCell>{money(item.total_sales)}</TableCell><TableCell>{money(item.expected_cash)}</TableCell><TableCell>{money(item.counted_cash)}</TableCell><TableCell>{money(item.cash_difference)}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>

    <Dialog open={movementOpen} onOpenChange={setMovementOpen}><DialogContent><DialogHeader><DialogTitle>Registrar movimentação</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>Tipo</Label><Select value={movement.type} onValueChange={(type) => setMovement({ ...movement, type })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="reinforcement">Reforço de caixa</SelectItem><SelectItem value="withdrawal">Sangria / retirada</SelectItem></SelectContent></Select></div><div><Label>Valor</Label><Input type="number" min="0.01" step="0.01" value={movement.amount} onChange={(event) => setMovement({ ...movement, amount: event.target.value })} /></div><div><Label>Motivo</Label><Input value={movement.reason} onChange={(event) => setMovement({ ...movement, reason: event.target.value })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setMovementOpen(false)}>Cancelar</Button><Button onClick={saveMovement} disabled={saving || Number(movement.amount) <= 0 || movement.reason.trim().length < 3}>Registrar</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={closeOpen} onOpenChange={setCloseOpen}><DialogContent><DialogHeader><DialogTitle>Conferir e fechar caixa</DialogTitle></DialogHeader><div className="space-y-3"><div className="rounded-lg border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Valor esperado em dinheiro</p><p className="text-2xl font-bold text-primary">{money(display.expected)}</p><p className="mt-1 text-xs text-muted-foreground">Abertura + dinheiro recebido + reforços − sangrias.</p></div><div><Label>Valor contado fisicamente</Label><Input type="number" min="0" step="0.01" value={countedCash} onChange={(event) => setCountedCash(event.target.value)} /></div>{countedCash !== '' && <div className={`rounded-lg border p-3 ${differencePreview === 0 ? 'border-green-500/30' : 'border-amber-500/30'}`}><p className="text-xs text-muted-foreground">Diferença apurada</p><p className="text-xl font-bold">{money(differencePreview)}</p></div>}<div><Label>Observação do fechamento</Label><Textarea value={closingNotes} onChange={(event) => setClosingNotes(event.target.value)} placeholder="Explique eventual diferença de caixa" /></div></div><DialogFooter><Button variant="outline" onClick={() => setCloseOpen(false)}>Cancelar</Button><Button onClick={closeCash} disabled={saving || countedCash === ''}>Confirmar fechamento</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
