import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock3,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type AlertStatus = 'active' | 'acknowledged' | 'snoozed';
type AlertSeverity = 'critical' | 'warning' | 'info';

type ManagementAlert = {
  fingerprint: string;
  alert_key: string;
  severity: AlertSeverity;
  module: string;
  title: string;
  message: string;
  item_count: number;
  amount: number | null;
  target_tab: string;
  action_label: string;
  state_status: AlertStatus;
  snoozed_until: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  source_updated_at: string | null;
};

type Props = {
  onNavigate: (tab: string) => void;
};

const sourceTables = [
  'management_alert_states',
  'appointments',
  'whatsapp_notifications_queue',
  'operational_expenses',
  'supply_items',
  'supply_batches',
  'daily_cash_sessions',
  'barber_schedules',
];

const formatDateTime = (value: string | null) => {
  if (!value) return 'Atualizado agora';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
};

export default function ManagementAlertCenter({ onNavigate }: Props) {
  const [alerts, setAlerts] = useState<ManagementAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState<string | null>(null);
  const [view, setView] = useState<'active' | 'handled' | 'all'>('active');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [search, setSearch] = useState('');

  const loadAlerts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { data, error } = await (supabase as any).rpc('get_management_alerts', {
      p_include_handled: true,
    });
    if (error) {
      toast.error('Não foi possível atualizar a central de alertas.', { description: error.message });
    } else {
      setAlerts((data ?? []) as ManagementAlert[]);
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    loadAlerts();
    const channel = sourceTables.reduce(
      (current, table) => current.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => loadAlerts(true),
      ),
      supabase.channel('management-alert-center'),
    );
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAlerts]);

  const setState = async (alert: ManagementAlert, status: AlertStatus) => {
    setMutating(alert.fingerprint);
    const snoozedUntil = status === 'snoozed'
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null;
    const { error } = await (supabase as any).rpc('set_management_alert_state', {
      p_fingerprint: alert.fingerprint,
      p_alert_key: alert.alert_key,
      p_status: status,
      p_snoozed_until: snoozedUntil,
      p_note: null,
    });
    if (error) {
      toast.error('Não foi possível atualizar o alerta.', { description: error.message });
    } else {
      toast.success(
        status === 'acknowledged' ? 'Alerta reconhecido.'
          : status === 'snoozed' ? 'Alerta adiado por 24 horas.'
            : 'Alerta reativado.',
      );
      await loadAlerts(true);
    }
    setMutating(null);
  };

  const modules = useMemo(
    () => Array.from(new Set(alerts.map((alert) => alert.module))).sort(),
    [alerts],
  );

  const filteredAlerts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return alerts.filter((alert) => {
      const viewMatch = view === 'all'
        || (view === 'active' && alert.state_status === 'active')
        || (view === 'handled' && alert.state_status !== 'active');
      const moduleMatch = moduleFilter === 'all' || alert.module === moduleFilter;
      const searchMatch = !term
        || `${alert.title} ${alert.message} ${alert.module}`.toLocaleLowerCase('pt-BR').includes(term);
      return viewMatch && moduleMatch && searchMatch;
    });
  }, [alerts, moduleFilter, search, view]);

  const active = alerts.filter((alert) => alert.state_status === 'active');
  const criticalCount = active.filter((alert) => alert.severity === 'critical').length;
  const warningCount = active.filter((alert) => alert.severity === 'warning').length;
  const handledCount = alerts.length - active.length;

  return (
    <div className="w-full min-w-0 space-y-5 pl-12 md:pl-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <BellRing className="h-6 w-6 text-primary" />
            Central de Alertas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pendências que exigem decisão da gestão, atualizadas em tempo real.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadAlerts()} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <SummaryCard label="Críticos" value={criticalCount} icon={ShieldAlert} tone="critical" />
        <SummaryCard label="Atenção" value={warningCount} icon={AlertTriangle} tone="warning" />
        <SummaryCard label="Ativos" value={active.length} icon={BellRing} tone="active" />
        <SummaryCard label="Tratados" value={handledCount} icon={CheckCircle2} tone="handled" />
      </div>

      <Card>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
              <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                <TabsTrigger value="active">Ativos</TabsTrigger>
                <TabsTrigger value="handled">Tratados</TabsTrigger>
                <TabsTrigger value="all">Todos</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar pendência"
                  className="pl-9"
                />
              </div>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger><SelectValue placeholder="Módulo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os módulos</SelectItem>
                  {modules.map((module) => <SelectItem key={module} value={module}>{module}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Carregando alertas...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed text-center">
              <CheckCircle2 className="mb-3 h-9 w-9 text-emerald-500" />
              <p className="font-semibold">Nenhuma pendência nesta visão</p>
              <p className="mt-1 text-sm text-muted-foreground">A operação está em dia para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.fingerprint}
                  alert={alert}
                  busy={mutating === alert.fingerprint}
                  onNavigate={() => onNavigate(alert.target_tab)}
                  onStateChange={(status) => setState(alert, status)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, tone }: {
  label: string;
  value: number;
  icon: typeof BellRing;
  tone: 'critical' | 'warning' | 'active' | 'handled';
}) {
  const tones = {
    critical: 'border-red-500/35 bg-red-500/10 text-red-400',
    warning: 'border-amber-500/35 bg-amber-500/10 text-amber-400',
    active: 'border-primary/35 bg-primary/10 text-primary',
    handled: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400',
  };
  return (
    <div className={cn('rounded-xl border p-3 sm:p-4', tones[tone])}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium sm:text-sm">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">{value}</p>
    </div>
  );
}

function AlertCard({ alert, busy, onNavigate, onStateChange }: {
  alert: ManagementAlert;
  busy: boolean;
  onNavigate: () => void;
  onStateChange: (status: AlertStatus) => void;
}) {
  const isActive = alert.state_status === 'active';
  return (
    <article className={cn(
      'rounded-xl border p-3 transition-colors sm:p-4',
      alert.severity === 'critical' && isActive && 'border-red-500/40 bg-red-500/[0.06]',
      alert.severity === 'warning' && isActive && 'border-amber-500/40 bg-amber-500/[0.05]',
      !isActive && 'bg-muted/20 opacity-80',
    )}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{alert.module}</Badge>
            <Badge className={cn(
              alert.severity === 'critical' ? 'bg-red-500/15 text-red-400 hover:bg-red-500/15' : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/15',
            )}>
              {alert.severity === 'critical' ? 'Crítico' : 'Atenção'}
            </Badge>
            {alert.state_status === 'snoozed' && <Badge variant="secondary">Adiado</Badge>}
            {alert.state_status === 'acknowledged' && <Badge variant="secondary">Reconhecido</Badge>}
          </div>
          <h2 className="font-semibold sm:text-lg">{alert.title}</h2>
          <p className="text-sm text-muted-foreground">{alert.message}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{alert.item_count} ocorrência(s)</span>
            <span>Fonte: {formatDateTime(alert.source_updated_at)}</span>
            {alert.state_status === 'snoozed' && alert.snoozed_until && (
              <span>Retorna em {formatDateTime(alert.snoozed_until)}</span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:max-w-[430px] lg:justify-end">
          <Button variant="outline" size="sm" onClick={onNavigate} className="col-span-2 sm:col-span-1">
            {alert.action_label}<ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          {isActive ? (
            <>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => onStateChange('snoozed')}>
                <Clock3 className="mr-1 h-4 w-4" /> Adiar 24h
              </Button>
              <Button size="sm" disabled={busy} onClick={() => onStateChange('acknowledged')}>
                <CheckCircle2 className="mr-1 h-4 w-4" /> Reconhecer
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => onStateChange('active')}>
              <RefreshCw className="mr-1 h-4 w-4" /> Reativar
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
