import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, endOfMonth, format, isBefore, parseISO, startOfDay, startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Ban, CalendarClock, CheckCircle2, History, Loader2, Plus, Receipt, RefreshCw, Repeat2, WalletCards } from 'lucide-react';
import { toast } from 'sonner';

type ExpenseStatus = 'pending' | 'confirmed' | 'cancelled';
type ExpenseItem = {
  id: string; description: string; amount: number; category: string; expense_date: string;
  due_date: string | null; paid_at: string | null; notes: string | null; status: ExpenseStatus;
  supplier: string | null; payment_method: string | null; document_reference: string | null;
  cancellation_reason: string | null; recurring_rule_id: string | null; created_at: string;
};
type RecurrenceRule = {
  id: string; description: string; amount: number; category: string; supplier: string | null;
  frequency: 'weekly' | 'monthly' | 'yearly'; interval_count: number; next_due_date: string;
  end_date: string | null; active: boolean; notes: string | null;
};
type AuditItem = { id: number; expense_id: string | null; event_type: string; event_at: string; new_data: Record<string, unknown> | null };

const db = supabase as any;
const CATEGORIES = ['Aluguel', 'Água', 'Energia', 'Internet', 'Produtos de uso', 'Manutenção', 'Marketing', 'Impostos', 'Folha de pagamento', 'Outros'];
const METHODS = ['Pix', 'Dinheiro', 'Cartão', 'Boleto', 'Transferência', 'Débito automático'];
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const localDate = (value?: string | null) => value ? format(parseISO(value.slice(0, 10)), 'dd/MM/yyyy') : '—';

const OperationalExpensesManager = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [rules, setRules] = useState<RecurrenceRule[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<'all' | ExpenseStatus>('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ description: '', amount: '', category: 'Outros', expenseDate: today, dueDate: today, supplier: '', notes: '', paid: false });
  const [ruleForm, setRuleForm] = useState({ description: '', amount: '', category: 'Outros', supplier: '', frequency: 'monthly', interval: '1', nextDue: today, endDate: '', notes: '' });
  const [paying, setPaying] = useState<ExpenseItem | null>(null);
  const [payment, setPayment] = useState({ method: 'Pix', reference: '', paidAt: today });
  const [cancelling, setCancelling] = useState<ExpenseItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await db.rpc('generate_due_recurring_expenses', { p_until: format(addDays(new Date(), 45), 'yyyy-MM-dd') });
      const [expenseResult, ruleResult, auditResult] = await Promise.all([
        db.from('operational_expenses').select('id,description,amount,category,expense_date,due_date,paid_at,notes,status,supplier,payment_method,document_reference,cancellation_reason,recurring_rule_id,created_at').or(`and(due_date.gte.${dateFrom},due_date.lte.${dateTo}),and(expense_date.gte.${dateFrom},expense_date.lte.${dateTo})`).order('due_date', { ascending: true }),
        db.from('expense_recurrence_rules').select('id,description,amount,category,supplier,frequency,interval_count,next_due_date,end_date,active,notes').order('active', { ascending: false }).order('next_due_date'),
        db.from('operational_expense_audit').select('id,expense_id,event_type,event_at,new_data').order('event_at', { ascending: false }).limit(100),
      ]);
      if (expenseResult.error) throw expenseResult.error;
      if (ruleResult.error) throw ruleResult.error;
      if (auditResult.error) throw auditResult.error;
      setExpenses(expenseResult.data || []); setRules(ruleResult.data || []); setAudit(auditResult.data || []);
    } catch (error: any) { toast.error(`Erro ao carregar contas: ${error.message}`); }
    finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const channel = supabase.channel('accounts-payable-ui')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operational_expenses' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_recurrence_rules' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const metrics = useMemo(() => {
    const pending = expenses.filter((item) => item.status === 'pending');
    const overdue = pending.filter((item) => item.due_date && isBefore(parseISO(item.due_date), startOfDay(new Date())));
    const soon = pending.filter((item) => item.due_date && item.due_date >= today && item.due_date <= format(addDays(new Date(), 7), 'yyyy-MM-dd'));
    const paid = expenses.filter((item) => item.status === 'confirmed');
    return { pending: pending.reduce((sum, item) => sum + Number(item.amount), 0), overdue: overdue.reduce((sum, item) => sum + Number(item.amount), 0), overdueCount: overdue.length, soonCount: soon.length, paid: paid.reduce((sum, item) => sum + Number(item.amount), 0) };
  }, [expenses, today]);

  const visibleExpenses = useMemo(() => expenses.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return matchesStatus && (!term || `${item.description} ${item.category} ${item.supplier || ''}`.toLocaleLowerCase('pt-BR').includes(term));
  }), [expenses, search, statusFilter]);

  const createExpense = async () => {
    const amount = Number(form.amount.replace(',', '.'));
    if (!form.description.trim() || amount <= 0 || !form.dueDate) return toast.error('Preencha descrição, valor e vencimento.');
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const status = form.paid ? 'confirmed' : 'pending';
      const { error } = await db.from('operational_expenses').insert({ description: form.description.trim(), amount, category: form.category, expense_date: form.expenseDate, due_date: form.dueDate, supplier: form.supplier.trim() || null, notes: form.notes.trim() || null, status, paid_at: form.paid ? new Date().toISOString() : null, paid_by: form.paid ? user?.id : null, created_by: user?.id });
      if (error) throw error;
      setForm({ description: '', amount: '', category: 'Outros', expenseDate: today, dueDate: today, supplier: '', notes: '', paid: false });
      toast.success(form.paid ? 'Despesa paga registrada.' : 'Conta a pagar registrada.'); await loadData();
    } catch (error: any) { toast.error(error.message); } finally { setSaving(false); }
  };

  const createRule = async () => {
    const amount = Number(ruleForm.amount.replace(',', '.')); const interval = Number(ruleForm.interval);
    if (!ruleForm.description.trim() || amount <= 0 || interval < 1 || !ruleForm.nextDue) return toast.error('Preencha os dados obrigatórios da recorrência.');
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await db.from('expense_recurrence_rules').insert({ description: ruleForm.description.trim(), amount, category: ruleForm.category, supplier: ruleForm.supplier.trim() || null, frequency: ruleForm.frequency, interval_count: interval, next_due_date: ruleForm.nextDue, end_date: ruleForm.endDate || null, notes: ruleForm.notes.trim() || null, created_by: user?.id });
      if (error) throw error;
      await db.rpc('generate_due_recurring_expenses', { p_until: format(addDays(new Date(), 45), 'yyyy-MM-dd') });
      setRuleForm({ description: '', amount: '', category: 'Outros', supplier: '', frequency: 'monthly', interval: '1', nextDue: today, endDate: '', notes: '' });
      toast.success('Despesa recorrente ativada.'); await loadData();
    } catch (error: any) { toast.error(error.message); } finally { setSaving(false); }
  };

  const payExpense = async () => {
    if (!paying) return; setSaving(true);
    try {
      const paidAt = new Date(`${payment.paidAt}T12:00:00`).toISOString();
      const { error } = await db.rpc('pay_operational_expense', { p_expense_id: paying.id, p_payment_method: payment.method, p_document_reference: payment.reference || null, p_paid_at: paidAt });
      if (error) throw error; toast.success('Pagamento confirmado.'); setPaying(null); await loadData();
    } catch (error: any) { toast.error(error.message); } finally { setSaving(false); }
  };

  const cancelExpense = async () => {
    if (!cancelling) return; setSaving(true);
    try {
      const { error } = await db.rpc('cancel_operational_expense', { p_expense_id: cancelling.id, p_reason: cancelReason });
      if (error) throw error; toast.success('Conta cancelada e preservada no histórico.'); setCancelling(null); setCancelReason(''); await loadData();
    } catch (error: any) { toast.error(error.message); } finally { setSaving(false); }
  };

  const toggleRule = async (rule: RecurrenceRule) => {
    const { error } = await db.from('expense_recurrence_rules').update({ active: !rule.active }).eq('id', rule.id);
    if (error) toast.error(error.message); else { toast.success(rule.active ? 'Recorrência pausada.' : 'Recorrência reativada.'); await loadData(); }
  };

  const statusBadge = (item: ExpenseItem) => {
    if (item.status === 'confirmed') return <Badge className="bg-emerald-600">Paga</Badge>;
    if (item.status === 'cancelled') return <Badge variant="secondary">Cancelada</Badge>;
    const overdue = item.due_date && item.due_date < today;
    return <Badge variant={overdue ? 'destructive' : 'outline'}>{overdue ? 'Vencida' : 'Pendente'}</Badge>;
  };

  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {[
        ['A pagar', money(metrics.pending), WalletCards, 'text-amber-400'],
        ['Vencidas', `${metrics.overdueCount} · ${money(metrics.overdue)}`, AlertTriangle, 'text-red-400'],
        ['Próximos 7 dias', String(metrics.soonCount), CalendarClock, 'text-cyan-400'],
        ['Pagas no período', money(metrics.paid), CheckCircle2, 'text-emerald-400'],
      ].map(([label, value, Icon, tone]) => <Card key={String(label)}><CardContent className="p-3 sm:p-4"><div className="flex items-start justify-between gap-1"><div className="min-w-0"><p className="text-[11px] text-muted-foreground sm:text-sm">{String(label)}</p><p className="mt-1 break-words text-base font-bold sm:text-xl">{String(value)}</p></div><Icon className={`h-4 w-4 shrink-0 ${tone}`} /></div></CardContent></Card>)}
    </div>

    <Tabs defaultValue="accounts" className="space-y-4">
      <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
        <TabsTrigger value="accounts">Contas</TabsTrigger><TabsTrigger value="new">Novo lançamento</TabsTrigger>
        <TabsTrigger value="recurring">Recorrências</TabsTrigger><TabsTrigger value="history">Auditoria</TabsTrigger>
      </TabsList>

      <TabsContent value="accounts" className="space-y-3">
        <Card><CardHeader className="pb-3"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><Receipt className="h-4 w-4" />Contas e pagamentos</CardTitle><CardDescription>Vencimentos e despesas do período selecionado.</CardDescription></div><div className="grid grid-cols-2 gap-2 sm:flex"><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /><Button variant="outline" size="icon" onClick={loadData}><RefreshCw className="h-4 w-4" /></Button></div></div></CardHeader><CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_180px]"><Input placeholder="Pesquisar conta, categoria ou fornecedor" value={search} onChange={(e) => setSearch(e.target.value)} /><Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os estados</SelectItem><SelectItem value="pending">Pendentes</SelectItem><SelectItem value="confirmed">Pagas</SelectItem><SelectItem value="cancelled">Canceladas</SelectItem></SelectContent></Select></div>
          {loading ? <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin" /> : visibleExpenses.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</p> : <>
            <div className="space-y-2 md:hidden">{visibleExpenses.map((item) => <div key={item.id} className="rounded-lg border p-3"><div className="flex justify-between gap-2"><div className="min-w-0"><p className="truncate font-semibold">{item.description}</p><p className="text-xs text-muted-foreground">{item.category} · vence {localDate(item.due_date)}</p>{item.supplier && <p className="text-xs text-muted-foreground">{item.supplier}</p>}</div><div className="text-right"><p className="font-bold">{money(item.amount)}</p>{statusBadge(item)}</div></div>{item.status === 'pending' && <div className="mt-3 grid grid-cols-2 gap-2"><Button size="sm" onClick={() => setPaying(item)}><CheckCircle2 className="mr-1 h-4 w-4" />Pagar</Button><Button size="sm" variant="outline" onClick={() => setCancelling(item)}><Ban className="mr-1 h-4 w-4" />Cancelar</Button></div>}</div>)}</div>
            <div className="hidden overflow-x-auto md:block"><Table><TableHeader><TableRow><TableHead>Vencimento</TableHead><TableHead>Conta</TableHead><TableHead>Fornecedor</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{visibleExpenses.map((item) => <TableRow key={item.id}><TableCell>{localDate(item.due_date)}</TableCell><TableCell><p className="font-medium">{item.description}</p><p className="text-xs text-muted-foreground">{item.category}</p></TableCell><TableCell>{item.supplier || '—'}</TableCell><TableCell>{statusBadge(item)}</TableCell><TableCell className="text-right font-semibold">{money(item.amount)}</TableCell><TableCell className="text-right">{item.status === 'pending' && <div className="flex justify-end gap-1"><Button size="sm" onClick={() => setPaying(item)}>Pagar</Button><Button size="sm" variant="outline" onClick={() => setCancelling(item)}>Cancelar</Button></div>}</TableCell></TableRow>)}</TableBody></Table></div>
          </>}
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="new"><Card><CardHeader><CardTitle className="text-base">Registrar conta ou despesa paga</CardTitle><CardDescription>Use “já foi paga” somente para gastos efetivamente quitados.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div><div><Label>Valor</Label><Input inputMode="decimal" placeholder="0,00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div><div><Label>Categoria</Label><Select value={form.category} onValueChange={(category) => setForm({ ...form, category })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Competência</Label><Input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} /></div><div><Label>Vencimento</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div><div><Label>Fornecedor</Label><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
      </div><div><Label>Observação</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div><div className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">Esta despesa já foi paga</p><p className="text-xs text-muted-foreground">Inclui imediatamente no resultado financeiro.</p></div><Switch checked={form.paid} onCheckedChange={(paid) => setForm({ ...form, paid })} /></div><Button className="w-full sm:w-auto" onClick={createExpense} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Salvar lançamento</Button></CardContent></Card></TabsContent>

      <TabsContent value="recurring" className="space-y-4"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Repeat2 className="h-4 w-4" />Nova despesa recorrente</CardTitle><CardDescription>As próximas contas são criadas automaticamente, sem duplicidade.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div><Label>Descrição</Label><Input value={ruleForm.description} onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })} /></div><div><Label>Valor</Label><Input inputMode="decimal" value={ruleForm.amount} onChange={(e) => setRuleForm({ ...ruleForm, amount: e.target.value })} /></div><div><Label>Categoria</Label><Select value={ruleForm.category} onValueChange={(category) => setRuleForm({ ...ruleForm, category })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Frequência</Label><Select value={ruleForm.frequency} onValueChange={(frequency) => setRuleForm({ ...ruleForm, frequency })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Semanal</SelectItem><SelectItem value="monthly">Mensal</SelectItem><SelectItem value="yearly">Anual</SelectItem></SelectContent></Select></div><div><Label>Repetir a cada</Label><Input type="number" min="1" max="24" value={ruleForm.interval} onChange={(e) => setRuleForm({ ...ruleForm, interval: e.target.value })} /></div><div><Label>Próximo vencimento</Label><Input type="date" value={ruleForm.nextDue} onChange={(e) => setRuleForm({ ...ruleForm, nextDue: e.target.value })} /></div><div><Label>Data final (opcional)</Label><Input type="date" value={ruleForm.endDate} onChange={(e) => setRuleForm({ ...ruleForm, endDate: e.target.value })} /></div><div><Label>Fornecedor</Label><Input value={ruleForm.supplier} onChange={(e) => setRuleForm({ ...ruleForm, supplier: e.target.value })} /></div>
      </div><div><Label>Observação</Label><Textarea value={ruleForm.notes} onChange={(e) => setRuleForm({ ...ruleForm, notes: e.target.value })} /></div><Button onClick={createRule} disabled={saving}><Plus className="mr-2 h-4 w-4" />Criar recorrência</Button></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Regras cadastradas</CardTitle></CardHeader><CardContent className="space-y-2">{rules.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma recorrência cadastrada.</p> : rules.map((rule) => <div key={rule.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="truncate font-semibold">{rule.description}</p><p className="text-xs text-muted-foreground">{money(rule.amount)} · {rule.frequency === 'weekly' ? 'semanal' : rule.frequency === 'monthly' ? 'mensal' : 'anual'} · próximo {localDate(rule.next_due_date)}</p></div><Switch checked={rule.active} onCheckedChange={() => toggleRule(rule)} /></div>)}</CardContent></Card>
      </TabsContent>

      <TabsContent value="history"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" />Histórico de alterações</CardTitle><CardDescription>Registro preservado de criação, pagamento, cancelamento e edição.</CardDescription></CardHeader><CardContent className="space-y-2">{audit.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p> : audit.map((event) => <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{String(event.new_data?.description || 'Despesa')}</p><p className="text-xs text-muted-foreground">{event.event_type === 'created' ? 'Criada' : event.event_type === 'paid' ? 'Pagamento confirmado' : event.event_type === 'cancelled' ? 'Cancelada' : 'Atualizada'} · {format(parseISO(event.event_at), 'dd/MM/yyyy HH:mm')}</p></div><Badge variant="outline">{money(Number(event.new_data?.amount || 0))}</Badge></div>)}</CardContent></Card></TabsContent>
    </Tabs>

    <Dialog open={!!paying} onOpenChange={(open) => !open && setPaying(null)}><DialogContent><DialogHeader><DialogTitle>Confirmar pagamento</DialogTitle></DialogHeader>{paying && <div className="space-y-4"><div className="rounded-lg border p-3"><p className="font-semibold">{paying.description}</p><p className="text-2xl font-bold text-emerald-400">{money(paying.amount)}</p></div><div><Label>Data do pagamento</Label><Input type="date" value={payment.paidAt} onChange={(e) => setPayment({ ...payment, paidAt: e.target.value })} /></div><div><Label>Forma de pagamento</Label><Select value={payment.method} onValueChange={(method) => setPayment({ ...payment, method })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{METHODS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div><Label>Comprovante / referência</Label><Input value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} /></div></div>}<DialogFooter><Button variant="outline" onClick={() => setPaying(null)}>Voltar</Button><Button onClick={payExpense} disabled={saving}>Confirmar pagamento</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={!!cancelling} onOpenChange={(open) => !open && setCancelling(null)}><DialogContent><DialogHeader><DialogTitle>Cancelar conta</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">O lançamento permanecerá visível na auditoria e não entrará no financeiro.</p><div><Label>Motivo obrigatório</Label><Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setCancelling(null)}>Voltar</Button><Button variant="destructive" onClick={cancelExpense} disabled={saving}><Ban className="mr-2 h-4 w-4" />Cancelar conta</Button></DialogFooter></DialogContent></Dialog>
  </div>;
};

export default OperationalExpensesManager;
