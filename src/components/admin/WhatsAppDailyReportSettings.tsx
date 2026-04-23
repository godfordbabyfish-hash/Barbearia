import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Send, Target, Clock, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type DailyReportConfig = {
  enabled: boolean;
  schedule_time: string;
  weekly_enabled: boolean;
  weekly_schedule_time: string;
  weekly_day_of_week: number;
  monthly_enabled: boolean;
  monthly_schedule_time: string;
  monthly_day_of_month: number;
  phone_number: string;
  include_insights: boolean;
  include_roi: boolean;
  include_goals: boolean;
  goals: {
    daily_gross_revenue: number;
    weekly_gross_revenue: number;
    monthly_gross_revenue: number;
    week_starts_on: 'monday';
  };
  last_sent?: string;
  last_sent_weekly?: string;
  last_sent_monthly?: string;
};

const DEFAULT_CONFIG: DailyReportConfig = {
  enabled: false,
  schedule_time: '22:00',
  weekly_enabled: false,
  weekly_schedule_time: '21:00',
  weekly_day_of_week: 0,
  monthly_enabled: false,
  monthly_schedule_time: '21:00',
  monthly_day_of_month: 1,
  phone_number: '',
  include_insights: true,
  include_roi: true,
  include_goals: true,
  goals: {
    daily_gross_revenue: 0,
    weekly_gross_revenue: 0,
    monthly_gross_revenue: 0,
    week_starts_on: 'monday',
  },
};

const toNumber = (value: string): number => {
  if (!value) return 0;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const WhatsAppDailyReportSettings = () => {
  const [config, setConfig] = useState<DailyReportConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingType, setSendingType] = useState<'daily' | 'weekly' | 'monthly' | null>(null);

  const cleanedPhonePreview = useMemo(
    () => (config.phone_number || '').replace(/\D/g, ''),
    [config.phone_number]
  );

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('config_value')
        .eq('config_key', 'whatsapp_daily_report')
        .maybeSingle();

      if (error) throw error;

      const cfg = (data?.config_value as Partial<DailyReportConfig>) || {};
      const merged: DailyReportConfig = {
        ...DEFAULT_CONFIG,
        ...cfg,
        goals: {
          ...DEFAULT_CONFIG.goals,
          ...(cfg.goals || {}),
          week_starts_on: 'monday',
        },
      };

      setConfig(merged);
    } catch (err: any) {
      console.error('Erro ao carregar configuração de relatório diário:', err);
      toast.error('Erro ao carregar configuração: ' + (err?.message || 'desconhecido'));
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config.schedule_time || !config.weekly_schedule_time || !config.monthly_schedule_time) {
      toast.error('Defina os horários de envio dos relatórios');
      return;
    }

    if (!cleanedPhonePreview) {
      toast.error('Informe o número de WhatsApp de destino');
      return;
    }

    setSaving(true);
    try {
      const payload: DailyReportConfig = {
        ...config,
        phone_number: cleanedPhonePreview,
        goals: {
          ...config.goals,
          daily_gross_revenue: Number(config.goals.daily_gross_revenue || 0),
          weekly_gross_revenue: Number(config.goals.weekly_gross_revenue || 0),
          monthly_gross_revenue: Number(config.goals.monthly_gross_revenue || 0),
          week_starts_on: 'monday',
        },
        weekly_day_of_week: Number(config.weekly_day_of_week || 0),
        monthly_day_of_month: Math.min(31, Math.max(1, Number(config.monthly_day_of_month || 1))),
      };

      const { error } = await supabase
        .from('site_config')
        .upsert(
          {
            config_key: 'whatsapp_daily_report',
            config_value: payload as any,
          },
          { onConflict: 'config_key' }
        );

      if (error) throw error;

      setConfig(payload);
      toast.success('Configuração dos relatórios salva!');
    } catch (err: any) {
      console.error('Erro ao salvar configuração de relatório diário:', err);
      toast.error('Erro ao salvar: ' + (err?.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const sendNow = async (reportType: 'daily' | 'weekly' | 'monthly') => {
    setSendingType(reportType);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-daily-report', {
        body: { action: 'send-now', report_type: reportType },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Relatório ${reportType === 'daily' ? 'diário' : reportType === 'weekly' ? 'semanal' : 'mensal'} enviado com sucesso!`);
      } else {
        toast.error(data?.error || 'Falha ao enviar relatório');
      }

      await loadConfig();
    } catch (err: any) {
      console.error('Erro ao enviar relatório agora:', err);
      toast.error('Erro ao enviar: ' + (err?.message || 'desconhecido'));
    } finally {
      setSendingType(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Relatórios Automáticos (WhatsApp)
          </CardTitle>
          <CardDescription>
            Configure envio diário, semanal e mensal com metas e testes por período.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Relatório diário</p>
                <p className="text-xs text-muted-foreground">Enviado todos os dias.</p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, enabled: checked }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Relatório semanal</p>
                <p className="text-xs text-muted-foreground">Enviado no dia da semana escolhido.</p>
              </div>
              <Switch
                checked={config.weekly_enabled}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, weekly_enabled: checked }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Relatório mensal</p>
                <p className="text-xs text-muted-foreground">Enviado no dia do mês escolhido.</p>
              </div>
              <Switch
                checked={config.monthly_enabled}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, monthly_enabled: checked }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Horário diário</Label>
              <Input
                type="time"
                value={config.schedule_time}
                onChange={(e) => setConfig((prev) => ({ ...prev, schedule_time: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Horário semanal</Label>
              <Input
                type="time"
                value={config.weekly_schedule_time}
                onChange={(e) => setConfig((prev) => ({ ...prev, weekly_schedule_time: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Dia da semana (0=Dom)</Label>
              <Input
                type="number"
                min={0}
                max={6}
                value={String(config.weekly_day_of_week)}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, weekly_day_of_week: Math.min(6, Math.max(0, Number(e.target.value || 0))) }))
                }
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Dia do mês</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={String(config.monthly_day_of_month)}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, monthly_day_of_month: Math.min(31, Math.max(1, Number(e.target.value || 1))) }))
                }
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Número WhatsApp destino</Label>
              <Input
                value={config.phone_number}
                onChange={(e) => setConfig((prev) => ({ ...prev, phone_number: e.target.value }))}
                placeholder="5511999999999"
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Será salvo apenas com números. Atual: {cleanedPhonePreview || 'não definido'}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4" />
              <p className="text-sm font-medium">Metas de faturamento bruto</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Semana calculada de segunda a domingo.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Meta diária (R$)</Label>
                <Input
                  value={String(config.goals.daily_gross_revenue ?? 0)}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      goals: { ...prev.goals, daily_gross_revenue: toNumber(e.target.value) },
                    }))
                  }
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Meta semanal (R$)</Label>
                <Input
                  value={String(config.goals.weekly_gross_revenue ?? 0)}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      goals: { ...prev.goals, weekly_gross_revenue: toNumber(e.target.value) },
                    }))
                  }
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Meta mensal (R$)</Label>
                <Input
                  value={String(config.goals.monthly_gross_revenue ?? 0)}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      goals: { ...prev.goals, monthly_gross_revenue: toNumber(e.target.value) },
                    }))
                  }
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Incluir ROI</p>
                <p className="text-xs text-muted-foreground">Mostra ROI no relatório.</p>
              </div>
              <Switch
                checked={config.include_roi}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, include_roi: checked }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Incluir metas</p>
                <p className="text-xs text-muted-foreground">Exibe diária/semanal/mensal.</p>
              </div>
              <Switch
                checked={config.include_goals}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, include_goals: checked }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Insights automáticos</p>
                <p className="text-xs text-muted-foreground">Comparativos automáticos.</p>
              </div>
              <Switch
                checked={config.include_insights}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, include_insights: checked }))}
              />
            </div>

          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={() => sendNow('daily')} disabled={sendingType !== null}>
              {sendingType === 'daily' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Teste diário
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => sendNow('weekly')} disabled={sendingType !== null}>
              {sendingType === 'weekly' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Teste semanal
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => sendNow('monthly')} disabled={sendingType !== null}>
              {sendingType === 'monthly' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Teste mensal
                </>
              )}
            </Button>
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar configuração
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-right space-y-1">
            {config.last_sent ? <p>Último diário: {new Date(config.last_sent).toLocaleString('pt-BR')}</p> : null}
            {config.last_sent_weekly ? <p>Último semanal: {new Date(config.last_sent_weekly).toLocaleString('pt-BR')}</p> : null}
            {config.last_sent_monthly ? <p>Último mensal: {new Date(config.last_sent_monthly).toLocaleString('pt-BR')}</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppDailyReportSettings;
