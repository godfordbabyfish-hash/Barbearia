import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Receipt, TrendingDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

type ExpenseItem = {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  notes?: string | null;
  status: string;
  created_at?: string;
};

const EXPENSE_CATEGORIES = [
  'Aluguel',
  'Água',
  'Energia',
  'Internet',
  'Produtos de uso',
  'Manutenção',
  'Marketing',
  'Impostos',
  'Outros',
];

const OperationalExpensesManager = () => {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState<string>(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState<string>(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Outros');
  const [expenseDate, setExpenseDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [expenses]
  );

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('operational_expenses')
        .select('id, description, amount, category, expense_date, notes, status, created_at')
        .eq('status', 'confirmed')
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses((data || []) as ExpenseItem[]);
    } catch (err: any) {
      console.error('Erro ao carregar despesas:', err);
      toast.error('Erro ao carregar despesas: ' + (err?.message || 'desconhecido'));
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [dateFrom, dateTo]);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategory('Outros');
    setExpenseDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
  };

  const handleAddExpense = async () => {
    if (!description.trim()) {
      toast.error('Informe a descrição da despesa');
      return;
    }

    const parsedAmount = Number(amount.replace(',', '.'));
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        description: description.trim(),
        amount: parsedAmount,
        category,
        expense_date: expenseDate,
        notes: notes.trim() || null,
        status: 'confirmed',
        created_by: user?.id || null,
      };

      const { error } = await (supabase as any)
        .from('operational_expenses')
        .insert(payload);

      if (error) throw error;

      toast.success('Despesa registrada com sucesso!');
      resetForm();
      await loadExpenses();
    } catch (err: any) {
      console.error('Erro ao registrar despesa:', err);
      toast.error('Erro ao registrar despesa: ' + (err?.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const confirmed = window.confirm('Deseja realmente excluir esta despesa?');
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const { error } = await (supabase as any)
        .from('operational_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Despesa removida');
      await loadExpenses();
    } catch (err: any) {
      console.error('Erro ao excluir despesa:', err);
      toast.error('Erro ao excluir despesa: ' + (err?.message || 'desconhecido'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Registrar Despesa Operacional
          </CardTitle>
          <CardDescription>
            Registre gastos do dia para cálculo correto do lucro da barbearia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Conta de energia"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Data</Label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Observação (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm"
              rows={3}
              placeholder="Ex: pagamento via PIX"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleAddExpense} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Despesa
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Despesas do Período
              </CardTitle>
              <CardDescription>
                Filtre o período para visualizar total e histórico de despesas.
              </CardDescription>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border p-3 bg-secondary/20">
            <div className="text-xs text-muted-foreground">Total de despesas no período</div>
            <div className="text-2xl font-bold flex items-center gap-2 text-red-500">
              <TrendingDown className="h-5 w-5" />
              R$ {totalExpenses.toFixed(2)}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma despesa registrada no período selecionado.
            </p>
          ) : (
            <>
              {/* Mobile list */}
              <div className="sm:hidden space-y-2">
                {expenses.map((item) => (
                  <div key={item.id} className="rounded-md border border-border p-3 bg-secondary/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(item.expense_date + 'T00:00:00'), 'dd/MM/yyyy')} • {item.category}
                        </div>
                        <div className="font-semibold text-sm truncate" title={item.description}>{item.description}</div>
                        {item.notes ? (
                          <div className="text-[11px] text-muted-foreground line-clamp-2">{item.notes}</div>
                        ) : null}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-red-500">R$ {Number(item.amount || 0).toFixed(2)}</div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteExpense(item.id)}
                          disabled={deletingId === item.id}
                          title="Excluir despesa"
                          className="h-8 w-8 mt-1"
                        >
                          {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-[80px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{format(new Date(item.expense_date + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{item.description}</div>
                          {item.notes ? <div className="text-xs text-muted-foreground">{item.notes}</div> : null}
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right font-semibold text-red-500">
                          R$ {Number(item.amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteExpense(item.id)}
                            disabled={deletingId === item.id}
                            title="Excluir despesa"
                          >
                            {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationalExpensesManager;
