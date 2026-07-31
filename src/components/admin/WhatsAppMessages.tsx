import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, RotateCcw, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MessageTemplate {
  key: string;
  label: string;
  description: string;
  defaultText: string;
  variables: string[];
  badge?: string;
  badgeColor?: string;
}

const FRIENDLY_VARIABLES: Record<string, string> = {
  '{{clientName}}': '[Nome do cliente]',
  '{{serviceName}}': '[Serviço]',
  '{{barberName}}': '[Barbeiro]',
  '{{appointmentDate}}': '[Data]',
  '{{appointmentTime}}': '[Horário]',
  '{{inactivityDays}}': '[Dias sem atendimento]',
};

const toEditorText = (text: string) => Object.entries(FRIENDLY_VARIABLES)
  .reduce((value, [technical, friendly]) => value.replaceAll(technical, friendly), text)
  .replaceAll('*', '');

const toStoredText = (text: string) => Object.entries(FRIENDLY_VARIABLES)
  .reduce((value, [technical, friendly]) => value.replaceAll(friendly, technical), text);

const TEMPLATES: MessageTemplate[] = [
  {
    key: 'whatsapp_msg_created',
    label: 'Agendamento Confirmado',
    description: 'Enviado ao cliente quando um novo agendamento é criado.',
    badge: 'Novo Agendamento',
    badgeColor: 'bg-green-500/20 text-green-600 border-green-500/30',
    defaultText:
      '✅ *Agendamento Confirmado!*\n\nOlá, *{{clientName}}*! Seu agendamento foi confirmado com sucesso.\n\n📋 *Detalhes:*\n• Serviço: {{serviceName}}\n• Barbeiro: {{barberName}}\n• Data: {{appointmentDate}}\n• Horário: {{appointmentTime}}\n\nAguardamos você! 💈',
    variables: ['{{clientName}}', '{{serviceName}}', '{{barberName}}', '{{appointmentDate}}', '{{appointmentTime}}'],
  },
  {
    key: 'whatsapp_msg_updated',
    label: 'Agendamento Atualizado',
    description: 'Enviado ao cliente quando um agendamento é alterado.',
    badge: 'Atualização',
    badgeColor: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
    defaultText:
      '🔄 *Agendamento Atualizado!*\n\nOlá, *{{clientName}}*! Seu agendamento foi atualizado.\n\n📋 *Novos Detalhes:*\n• Serviço: {{serviceName}}\n• Barbeiro: {{barberName}}\n• Data: {{appointmentDate}}\n• Horário: {{appointmentTime}}\n\nQualquer dúvida, entre em contato. 💈',
    variables: ['{{clientName}}', '{{serviceName}}', '{{barberName}}', '{{appointmentDate}}', '{{appointmentTime}}'],
  },
  {
    key: 'whatsapp_msg_cancelled',
    label: 'Agendamento Cancelado',
    description: 'Enviado ao cliente quando um agendamento é cancelado.',
    badge: 'Cancelamento',
    badgeColor: 'bg-red-500/20 text-red-600 border-red-500/30',
    defaultText:
      '❌ *Agendamento Cancelado*\n\nOlá, *{{clientName}}*! Seu agendamento foi cancelado.\n\n📋 *Detalhes:*\n• Serviço: {{serviceName}}\n• Barbeiro: {{barberName}}\n• Data: {{appointmentDate}}\n• Horário: {{appointmentTime}}\n\nPara reagendar, acesse nosso site ou entre em contato. 💈',
    variables: ['{{clientName}}', '{{serviceName}}', '{{barberName}}', '{{appointmentDate}}', '{{appointmentTime}}'],
  },
  {
    key: 'whatsapp_msg_reminder',
    label: 'Lembrete de Agendamento',
    description: 'Enviado ao cliente como lembrete antes do horário marcado.',
    badge: 'Lembrete',
    badgeColor: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
    defaultText:
      '⏰ *Lembrete de Agendamento!*\n\nOlá, *{{clientName}}*! Seu horário começa em 10 minutos.\n\n📋 *Detalhes:*\n• Serviço: {{serviceName}}\n• Barbeiro: {{barberName}}\n• Data: {{appointmentDate}}\n• Horário: {{appointmentTime}}\n\nTe esperamos! 💈',
    variables: ['{{clientName}}', '{{serviceName}}', '{{barberName}}', '{{appointmentDate}}', '{{appointmentTime}}'],
  },
  {
    key: 'whatsapp_msg_inactive_client',
    label: 'Cliente Inativo (30 dias)',
    description: 'Enviado automaticamente a clientes sem atendimento concluído nos últimos 30 dias.',
    badge: 'Reativação',
    badgeColor: 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30',
    defaultText:
      '💈 *Sentimos sua falta!*\n\nOlá, *{{clientName}}*! Já faz {{inactivityDays}} dias desde sua última visita à Barbearia Raimundos.\n\nQue tal reservar um horário e renovar o visual? Estamos esperando por você! ✂️',
    variables: ['{{clientName}}', '{{inactivityDays}}'],
  },
  {
    key: 'whatsapp_msg_referral_earned',
    label: 'Crédito de indicação liberado',
    description: 'Enviado quando o amigo indicado conclui o primeiro atendimento pago.',
    badge: 'Indicação',
    badgeColor: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
    defaultText:
      '🎁 Você ganhou um crédito!\n\nOlá, [Nome do cliente]! Seu amigo concluiu o primeiro atendimento elegível. Seu crédito de [Serviço] já está disponível para usar em qualquer serviço.',
    variables: ['{{clientName}}', '{{serviceName}}'],
  },
  {
    key: 'whatsapp_msg_referral_expiring',
    label: 'Crédito próximo do vencimento',
    description: 'Enviado automaticamente antes do vencimento do crédito de indicação.',
    badge: 'Vencimento',
    badgeColor: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
    defaultText:
      '⏳ Seu crédito está perto de vencer!\n\nOlá, [Nome do cliente]! Seu crédito de [Serviço] vence em [Data]. Agende qualquer serviço e aproveite.',
    variables: ['{{clientName}}', '{{serviceName}}', '{{appointmentDate}}'],
  },
  {
    key: 'whatsapp_msg_completed',
    label: 'Atendimento Concluído',
    description: 'Enviado ao cliente após o atendimento ser marcado como concluído.',
    badge: 'Concluído',
    badgeColor: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
    defaultText:
      '🎉 *Atendimento Concluído!*\n\nObrigado pela visita, *{{clientName}}*! Foi um prazer atendê-lo.\n\n✂️ Serviço: {{serviceName}}\n💈 Barbeiro: {{barberName}}\n\nEsperamos vê-lo em breve! Não esqueça de nos avaliar. ⭐',
    variables: ['{{clientName}}', '{{serviceName}}', '{{barberName}}'],
  },
  {
    key: 'whatsapp_msg_barber_new_appointment',
    label: 'Novo Agendamento (Barbeiro)',
    description: 'Enviado ao barbeiro quando um cliente agenda um horário.',
    badge: 'Para Barbeiro',
    badgeColor: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
    defaultText:
      '📅 *Novo Agendamento!*\n\nVocê tem um novo agendamento, *{{barberName}}*!\n\n👤 Cliente: {{clientName}}\n💈 Serviço: {{serviceName}}\n📆 Data: {{appointmentDate}}\n🕐 Horário: {{appointmentTime}}',
    variables: ['{{clientName}}', '{{serviceName}}', '{{barberName}}', '{{appointmentDate}}', '{{appointmentTime}}'],
  },
];

const WhatsAppMessages = () => {
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const defaults: Record<string, string> = {};
    TEMPLATES.forEach(t => { defaults[t.key] = toEditorText(t.defaultText); });
    try {
      const keys = TEMPLATES.map(t => t.key);
      const { data, error } = await supabase
        .from('site_config')
        .select('config_key, config_value')
        .in('config_key', keys);

      if (error) {
        console.error('Erro ao carregar templates:', error);
        setTemplates(defaults);
      } else {
        const loaded: Record<string, string> = { ...defaults };
        (data || []).forEach((row: any) => {
          const value = row.config_value as any;
          if (value?.text) loaded[row.config_key] = toEditorText(value.text);
          setEnabled(prev => ({ ...prev, [row.config_key]: value?.enabled !== false }));
        });
        setEnabled(prev => {
          const next = { ...prev };
          TEMPLATES.forEach(t => { if (next[t.key] === undefined) next[t.key] = true; });
          return next;
        });
        setTemplates(loaded);
      }
      setDirty({});
    } catch (e) {
      console.error('Erro ao carregar templates:', e);
      setTemplates(defaults);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setTemplates(prev => ({ ...prev, [key]: value }));
    setDirty(prev => ({ ...prev, [key]: true }));
  };

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      const { error } = await supabase
        .from('site_config')
        .upsert({ config_key: key, config_value: { text: toStoredText(templates[key]), enabled: enabled[key] !== false } as any }, { onConflict: 'config_key' });
      if (error) throw error;
      toast.success('Mensagem salva!');
      setDirty(prev => ({ ...prev, [key]: false }));
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(null);
    }
  };

  const handleReset = (key: string) => {
    const tmpl = TEMPLATES.find(t => t.key === key);
    if (!tmpl) return;
    setTemplates(prev => ({ ...prev, [key]: toEditorText(tmpl.defaultText) }));
    setDirty(prev => ({ ...prev, [key]: true }));
  };

  const handleSaveAll = async () => {
    setSaving('__all__');
    try {
      const upserts = TEMPLATES.map(t => ({
        config_key: t.key,
        config_value: { text: toStoredText(templates[t.key]), enabled: enabled[t.key] !== false } as any,
      }));
      const { error } = await supabase
        .from('site_config')
        .upsert(upserts, { onConflict: 'config_key' });
      if (error) throw error;
      toast.success('Todas as mensagens salvas!');
      setDirty({});
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasDirty = Object.values(dirty).some(Boolean);

  return (
    <div className="space-y-4">
      {/* Header info */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p className="font-medium">Campos preenchidos automaticamente:</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.values(FRIENDLY_VARIABLES).map(v => (
                  <code key={v} className="bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded text-[11px] border border-blue-200 dark:border-blue-700">
                    {v}
                  </code>
                ))}
              </div>
              <p className="mt-1">Edite apenas o texto. Os campos entre colchetes serão substituídos no envio.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save all button */}
      {hasDirty && (
        <div className="flex justify-end">
          <Button onClick={handleSaveAll} disabled={saving === '__all__'} className="gap-2">
            {saving === '__all__'
              ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando tudo...</>
              : <><Save className="h-4 w-4" />Salvar Todas as Alterações</>
            }
          </Button>
        </div>
      )}

      {/* Template cards */}
      {TEMPLATES.map(tmpl => (
        <Card key={tmpl.key} className={`bg-card border-border transition-all ${dirty[tmpl.key] ? 'border-primary/50 shadow-md' : ''}`}>
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  {tmpl.label}
                  {dirty[tmpl.key] && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-normal">não salvo</span>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">{tmpl.description}</CardDescription>
              </div>
              <div className="flex items-center gap-3 rounded-full border border-border bg-secondary/40 px-3 py-1.5">
                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${tmpl.badgeColor}`}>{tmpl.badge}</span>
                <span className={`text-xs font-medium ${enabled[tmpl.key] !== false ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  {enabled[tmpl.key] !== false ? 'Envio ativo' : 'Envio pausado'}
                </span>
                <Switch
                  checked={enabled[tmpl.key] !== false}
                  onCheckedChange={(value) => {
                    setEnabled(prev => ({ ...prev, [tmpl.key]: value }));
                    setDirty(prev => ({ ...prev, [tmpl.key]: true }));
                  }}
                  aria-label={`Ativar ou desativar ${tmpl.label}`}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <Textarea
              value={templates[tmpl.key] ?? tmpl.defaultText}
              onChange={e => handleChange(tmpl.key, e.target.value)}
              rows={6}
              className="text-sm leading-relaxed resize-y min-h-[120px]"
              placeholder={toEditorText(tmpl.defaultText)}
            />
            <div className="flex items-center gap-2 justify-between flex-wrap">
              <div className="flex flex-wrap gap-1">
                {tmpl.variables.map(v => FRIENDLY_VARIABLES[v] || v).map(v => (
                  <code
                    key={v}
                    className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors border border-border"
                    title="Clique para copiar"
                    onClick={() => {
                      navigator.clipboard.writeText(v).catch(() => {});
                      toast.info(`${v} copiado!`, { duration: 1200 });
                    }}
                  >
                    {v}
                  </code>
                ))}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => handleReset(tmpl.key)}
                  title="Restaurar padrão"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Restaurar</span>
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => handleSave(tmpl.key)}
                  disabled={saving === tmpl.key || !dirty[tmpl.key]}
                >
                  {saving === tmpl.key
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Save className="h-3.5 w-3.5" />
                  }
                  <span className="hidden sm:inline">Salvar</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WhatsAppMessages;
