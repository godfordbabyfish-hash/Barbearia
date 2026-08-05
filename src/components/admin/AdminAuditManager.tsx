import { useCallback, useEffect, useMemo, useState } from 'react';
import { endOfDay, format, parseISO, startOfDay, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, ChevronLeft, ChevronRight, Download, Eye, FilePenLine, Loader2, Search, ShieldCheck, UserCog } from 'lucide-react';
import { toast } from 'sonner';

type AuditAction = 'insert' | 'update' | 'delete';
type AuditLog = {
  id: number; occurred_at: string; actor_id: string | null; actor_role: string | null;
  action: AuditAction; module: string; table_name: string; record_id: string | null;
  changed_fields: string[]; old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null; transaction_id: number; source: string;
};

const db = supabase as any;
const PAGE_SIZE = 30;
const MODULES = ['Usuários', 'Equipe', 'Serviços', 'Produtos', 'Agendamentos', 'Financeiro', 'Vendas', 'Vales', 'Comissões', 'Horários', 'Despesas', 'Caixa', 'Fechamentos', 'Indicações', 'Estoque', 'Configurações'];
const ACTION_LABELS: Record<AuditAction, string> = { insert: 'Criação', update: 'Alteração', delete: 'Exclusão' };
const FIELD_LABELS: Record<string, string> = {
  name: 'Nome', full_name: 'Nome', title: 'Título', description: 'Descrição', email: 'E-mail', phone: 'Telefone',
  whatsapp: 'WhatsApp', cpf: 'CPF', role: 'Perfil', status: 'Estado', amount: 'Valor', price: 'Preço', stock: 'Estoque',
  active: 'Ativo', visible: 'Visível', due_date: 'Vencimento', expense_date: 'Competência', paid_at: 'Pagamento',
  appointment_date: 'Data', appointment_time: 'Horário', duration_minutes: 'Duração', commission_percentage: 'Comissão',
  updated_at: 'Atualização', created_at: 'Criação', config_value: 'Configuração', photo_url: 'Foto', image_url: 'Imagem',
};
const label = (field: string) => FIELD_LABELS[field] || field.replaceAll('_', ' ');
const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};
const recordName = (log: AuditLog) => {
  const data = log.new_data || log.old_data || {};
  return String(data.name || data.full_name || data.title || data.description || data.config_key || data.client_name || log.record_id || 'Registro');
};

export default function AdminAuditManager() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actors, setActors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [module, setModule] = useState('all');
  const [action, setAction] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = db.from('admin_audit_logs').select('*', { count: 'exact' })
        .gte('occurred_at', startOfDay(parseISO(dateFrom)).toISOString())
        .lte('occurred_at', endOfDay(parseISO(dateTo)).toISOString())
        .order('occurred_at', { ascending: false });
      if (module !== 'all') query = query.eq('module', module);
      if (action !== 'all') query = query.eq('action', action);
      const term = search.trim().replace(/[,%()]/g, '');
      if (term) query = query.or(`module.ilike.%${term}%,table_name.ilike.%${term}%,record_id.ilike.%${term}%`);
      const from = (page - 1) * PAGE_SIZE;
      const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const rows = (data || []) as AuditLog[];
      setLogs(rows); setTotal(count || 0);
      const ids = [...new Set(rows.map((item) => item.actor_id).filter(Boolean))] as string[];
      if (ids.length) {
        const { data: profiles } = await db.from('profiles').select('id,full_name').in('id', ids);
        setActors(Object.fromEntries((profiles || []).map((profile: any) => [profile.id, profile.full_name || 'Usuário'])));
      } else setActors({});
    } catch (error: any) { toast.error(`Erro ao carregar auditoria: ${error.message}`); }
    finally { setLoading(false); }
  }, [action, dateFrom, dateTo, module, page, search]);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => {
    const channel = supabase.channel('admin-audit-ui').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_audit_logs' }, loadLogs).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadLogs]);
  useEffect(() => { setPage(1); }, [action, dateFrom, dateTo, module, search]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const metrics = useMemo(() => ({
    total, updates: logs.filter((item) => item.action === 'update').length,
    critical: logs.filter((item) => ['Usuários', 'Financeiro', 'Configurações'].includes(item.module)).length,
    actors: new Set(logs.map((item) => item.actor_id || 'system')).size,
  }), [logs, total]);

  const exportCsv = () => {
    const header = ['Data', 'Responsável', 'Perfil', 'Ação', 'Módulo', 'Tabela', 'Registro', 'Campos'];
    const rows = logs.map((item) => [format(parseISO(item.occurred_at), 'dd/MM/yyyy HH:mm:ss'), item.actor_id ? actors[item.actor_id] || item.actor_id : 'Sistema', item.actor_role || 'system', ACTION_LABELS[item.action], item.module, item.table_name, recordName(item), item.changed_fields.map(label).join('; ')]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `auditoria-${dateFrom}-${dateTo}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };

  const actionBadge = (value: AuditAction) => <Badge variant={value === 'delete' ? 'destructive' : value === 'insert' ? 'default' : 'secondary'}>{ACTION_LABELS[value]}</Badge>;

  return <div className="space-y-4 pl-12 md:pl-0">
    <div><h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl"><ShieldCheck className="h-6 w-6 text-primary" />Auditoria Administrativa</h1><p className="mt-1 text-sm text-muted-foreground">Rastreabilidade das alterações realizadas pela gestão e pelo sistema.</p></div>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {[["Eventos no período", metrics.total, Activity], ["Alterações na página", metrics.updates, FilePenLine], ["Eventos críticos", metrics.critical, ShieldCheck], ["Responsáveis na página", metrics.actors, UserCog]].map(([title, value, Icon]) => <Card key={String(title)}><CardContent className="p-3 sm:p-4"><div className="flex justify-between gap-2"><div><p className="text-[11px] text-muted-foreground sm:text-sm">{String(title)}</p><p className="mt-1 text-xl font-bold sm:text-2xl">{String(value)}</p></div><Icon className="h-4 w-4 text-primary" /></div></CardContent></Card>)}
    </div>
    <Card><CardHeader className="pb-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-base">Histórico central</CardTitle><CardDescription>Os registros são imutáveis e dados secretos são protegidos.</CardDescription></div><Button variant="outline" onClick={exportCsv} disabled={!logs.length}><Download className="mr-2 h-4 w-4" />Exportar página</Button></div></CardHeader><CardContent className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"><div className="relative sm:col-span-2"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Módulo, tabela ou ID" value={search} onChange={(e) => setSearch(e.target.value)} /></div><Select value={module} onValueChange={setModule}><SelectTrigger><SelectValue placeholder="Módulo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os módulos</SelectItem>{MODULES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Select value={action} onValueChange={setAction}><SelectTrigger><SelectValue placeholder="Ação" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as ações</SelectItem><SelectItem value="insert">Criações</SelectItem><SelectItem value="update">Alterações</SelectItem><SelectItem value="delete">Exclusões</SelectItem></SelectContent></Select><div className="grid grid-cols-2 gap-2 lg:col-span-1"><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div></div>
      {loading ? <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin" /> : logs.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma alteração encontrada.</p> : <>
        <div className="space-y-2 md:hidden">{logs.map((item) => <button key={item.id} onClick={() => setSelected(item)} className="w-full rounded-lg border p-3 text-left"><div className="flex justify-between gap-2"><div className="min-w-0"><p className="truncate font-semibold">{recordName(item)}</p><p className="text-xs text-muted-foreground">{item.module} · {format(parseISO(item.occurred_at), 'dd/MM HH:mm')}</p><p className="mt-1 text-xs">{item.actor_id ? actors[item.actor_id] || 'Gestão' : 'Sistema'}</p></div>{actionBadge(item.action)}</div></button>)}</div>
        <div className="hidden overflow-x-auto md:block"><Table><TableHeader><TableRow><TableHead>Data/hora</TableHead><TableHead>Responsável</TableHead><TableHead>Ação</TableHead><TableHead>Módulo</TableHead><TableHead>Registro</TableHead><TableHead>Campos</TableHead><TableHead /></TableRow></TableHeader><TableBody>{logs.map((item) => <TableRow key={item.id}><TableCell className="whitespace-nowrap">{format(parseISO(item.occurred_at), 'dd/MM/yyyy HH:mm')}</TableCell><TableCell><p>{item.actor_id ? actors[item.actor_id] || 'Gestão' : 'Sistema'}</p><p className="text-xs text-muted-foreground">{item.actor_role}</p></TableCell><TableCell>{actionBadge(item.action)}</TableCell><TableCell>{item.module}</TableCell><TableCell className="max-w-48 truncate">{recordName(item)}</TableCell><TableCell className="max-w-56 truncate">{item.changed_fields.map(label).join(', ')}</TableCell><TableCell><Button size="icon" variant="ghost" onClick={() => setSelected(item)}><Eye className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div>
      </>}
      <div className="flex items-center justify-between border-t pt-3"><p className="text-xs text-muted-foreground">{total ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} de ${total}` : '0 registros'}</p><div className="flex items-center gap-2"><Button size="icon" variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm">{page}/{pages}</span><Button size="icon" variant="outline" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div>
    </CardContent></Card>
    <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Detalhes da alteração</DialogTitle></DialogHeader>{selected && <div className="space-y-4"><div className="grid grid-cols-2 gap-3 rounded-lg border p-3 sm:grid-cols-4"><div><Label>Data</Label><p className="text-sm">{format(parseISO(selected.occurred_at), 'dd/MM/yyyy HH:mm:ss')}</p></div><div><Label>Responsável</Label><p className="text-sm">{selected.actor_id ? actors[selected.actor_id] || 'Gestão' : 'Sistema'}</p></div><div><Label>Módulo</Label><p className="text-sm">{selected.module}</p></div><div><Label>Ação</Label><div className="mt-1">{actionBadge(selected.action)}</div></div></div><div><Label>Registro</Label><p className="mt-1 font-semibold">{recordName(selected)}</p><p className="break-all text-xs text-muted-foreground">{selected.table_name} · {selected.record_id || 'sem ID'}</p></div><div className="space-y-2"><Label>Campos alterados</Label>{selected.changed_fields.map((field) => <div key={field} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[160px_1fr_1fr]"><p className="font-medium capitalize">{label(field)}</p><div><p className="text-[10px] uppercase text-muted-foreground">Antes</p><pre className="whitespace-pre-wrap break-all text-xs">{displayValue(selected.old_data?.[field])}</pre></div><div><p className="text-[10px] uppercase text-muted-foreground">Depois</p><pre className="whitespace-pre-wrap break-all text-xs">{displayValue(selected.new_data?.[field])}</pre></div></div>)}</div><p className="text-xs text-muted-foreground">Transação #{selected.transaction_id} · origem {selected.source === 'system' ? 'automática' : 'painel'}</p></div>}</DialogContent></Dialog>
  </div>;
}
