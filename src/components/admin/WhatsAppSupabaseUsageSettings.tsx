
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Send, Phone, Database } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type SupabaseUsageReportConfig = {
  enabled: boolean;
  schedule_time: string;
  phone_number: string;
  last_sent?: string;
};

const DEFAULT_CONFIG: SupabaseUsageReportConfig = {
  enabled: false,
  schedule_time: '12:00',
  phone_number: '',
};

const WhatsAppSupabaseUsageSettings = () => {
  const [config, setConfig] = useState<SupabaseUsageReportConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const cleanedPhonePreview = (config.phone_number || '').replace(/\D/g, '');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('config_value')
        .eq('config_key', 'whatsapp_supabase_usage_report')
        .maybeSingle();

      if (error) throw error;

      const cfg = (data?.config_value as Partial<SupabaseUsageReportConfig>) || {};
      const merged: SupabaseUsageReportConfig = {
        ...DEFAULT_CONFIG,
        ...cfg,
      };

      setConfig(merged);
    } catch (err: any) {
      console.error('Erro ao carregar configuração do relatório de uso do Supabase:', err);
      toast.error('Erro ao carregar configuração: ' + (err?.message || 'desconhecido'));
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!cleanedPhonePreview) {
      toast.error('Informe o número de WhatsApp de destino');
      return;
    }

    setSaving(true);
    try {
      const payload: SupabaseUsageReportConfig = {
        ...config,
        phone_number: cleanedPhonePreview,
      };

      const { error } = await supabase
        .from('site_config')
        .upsert(
          {
            config_key: 'whatsapp_supabase_usage_report',
            config_value: payload as any,
          },
          { onConflict: 'config_key' }
        );

      if (error) throw error;

      setConfig(payload);
      toast.success('Configuração do relatório de uso do Supabase salva!');
    } catch (err: any) {
      console.error('Erro ao salvar configuração:', err);
      toast.error('Erro ao salvar: ' + (err?.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const sendNow = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-supabase-usage-report', {
        body: {},
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Relatório de uso do Supabase enviado com sucesso!');
      } else {
        toast.error(data?.error || 'Falha ao enviar relatório');
      }

      await loadConfig();
    } catch (err: any) {
      console.error('Erro ao enviar relatório agora:', err);
      toast.error('Erro ao enviar: ' + (err?.message || 'desconhecido'));
    } finally {
      setSending(false);
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
            <Database className="h-4 w-4" />
            Relatório de Uso do Supabase (WhatsApp)
          </CardTitle>
          <CardDescription>
            Configure envio diário com métricas de uso, agendamentos, leads e fila do WhatsApp.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Ativar relatório diário</p>
              <p className="text-xs text-muted-foreground">Envio automático por WhatsApp</p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, enabled: checked }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div>
              <Label className="text-xs">Horário de envio</Label>
              <Input
                type="time"
                value={config.schedule_time}
                onChange={(e) => setConfig((prev) => ({ ...prev, schedule_time: e.target.value }))}
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

          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={sendNow} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Testar agora
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

          <div className="text-xs text-muted-foreground text-right">
            {config.last_sent ? <p>Último envio: {new Date(config.last_sent).toLocaleString('pt-BR')}</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppSupabaseUsageSettings;
