import { useEffect, useState } from 'react';
import { Bot, CheckCircle2, KeyRound, Loader2, Save, ShieldCheck, TestTube2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type AIAttendantConfig = {
  enabled: boolean;
  assistant_name: string;
  model: string;
  booking_url: string;
  max_history_messages: number;
  human_handoff_enabled: boolean;
  handoff_message: string;
  prompt: string;
};

const defaultConfig: AIAttendantConfig = {
  enabled: false,
  assistant_name: 'Raimunda',
  model: 'gpt-5.6-luna',
  booking_url: 'https://barbeariaraimundoss.vercel.app/',
  max_history_messages: 12,
  human_handoff_enabled: true,
  handoff_message: 'Vou encaminhar sua conversa para nossa equipe. Assim que alguém estiver disponível, continuará o atendimento por aqui.',
  prompt: 'Você é a atendente virtual da Barbearia Raimundos. Responda em português do Brasil, de forma simpática, breve e profissional. Use somente os dados oficiais fornecidos no contexto. Nunca invente preços, serviços, barbeiros, horários disponíveis, promoções ou agendamentos. Você não pode confirmar, criar, alterar ou cancelar agendamentos. Para agendar, forneça exclusivamente o link oficial. Se a informação não estiver no contexto, diga que não possui essa confirmação e ofereça atendimento humano. Não peça CPF completo, cartão, senha, código ou qualquer dado sensível. Quando o cliente solicitar uma pessoa, responda apenas com a mensagem de encaminhamento.',
};

const errorMessages: Record<string, string> = {
  api_key_required_to_enable: 'Cadastre a chave da API antes de ativar a atendente.',
  api_key_not_configured: 'A chave da API ainda não foi cadastrada.',
  prompt_and_booking_url_required: 'Informe o prompt e o link oficial de agendamento.',
  forbidden: 'Seu usuário não possui permissão para alterar esta configuração.',
  unauthorized: 'Sua sessão expirou. Entre novamente no sistema.',
};

const WhatsAppAIAttendant = () => {
  const [config, setConfig] = useState<AIAttendantConfig>(defaultConfig);
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const invoke = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('whatsapp-ai-settings', { body });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Falha na configuração da atendente');
    return data;
  };

  useEffect(() => {
    let mounted = true;
    invoke({ action: 'get' })
      .then((data) => {
        if (!mounted) return;
        setConfig({ ...defaultConfig, ...(data.config || {}) });
        setHasApiKey(Boolean(data.has_api_key));
      })
      .catch((error) => toast.error('Não foi possível carregar a atendente', { description: error.message }))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const friendlyError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return errorMessages[message] || message;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await invoke({ action: 'save', config, api_key: apiKey || undefined });
      setConfig({ ...defaultConfig, ...(data.config || {}) });
      setHasApiKey(Boolean(data.has_api_key));
      setApiKey('');
      toast.success(config.enabled ? 'Atendente IA ativada e salva.' : 'Configuração da atendente salva.');
    } catch (error) {
      toast.error('Não foi possível salvar', { description: friendlyError(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const data = await invoke({ action: 'test' });
      toast.success('API da atendente funcionando', { description: data.message });
    } catch (error) {
      toast.error('Falha no teste da IA', { description: friendlyError(error) });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/15 p-3"><Bot className="h-6 w-6 text-primary" /></div>
              <div>
                <CardTitle>Atendente IA no WhatsApp</CardTitle>
                <CardDescription className="mt-1">
                  Responde dúvidas com dados reais da barbearia e encaminha situações incertas para uma pessoa.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-background/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Atendimento automático</p>
                <p className="text-xs text-muted-foreground">{config.enabled ? 'Ativo' : 'Desativado'}</p>
              </div>
              <Switch checked={config.enabled} onCheckedChange={(enabled) => setConfig((current) => ({ ...current, enabled }))} />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><KeyRound className="h-5 w-5" /> API e modelo</CardTitle>
            <CardDescription>A chave é enviada ao backend e armazenada no cofre do Supabase.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-ai-key">Chave da API OpenAI</Label>
              <Input
                id="whatsapp-ai-key"
                type="password"
                autoComplete="new-password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={hasApiKey ? 'Chave cadastrada — digite somente para substituir' : 'sk-...'}
              />
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {hasApiKey && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                {hasApiKey ? 'Existe uma chave protegida cadastrada.' : 'Nenhuma chave cadastrada.'}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select value={config.model} onValueChange={(model) => setConfig((current) => ({ ...current, model }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-5.6-luna">GPT-5.6 Luna — econômico</SelectItem>
                    <SelectItem value="gpt-5.6-terra">GPT-5.6 Terra — equilibrado</SelectItem>
                    <SelectItem value="gpt-5.6">GPT-5.6 — máxima qualidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-name">Nome da atendente</Label>
                <Input id="ai-name" value={config.assistant_name} onChange={(event) => setConfig((current) => ({ ...current, assistant_name: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-url">Link oficial de agendamento</Label>
              <Input id="booking-url" value={config.booking_url} onChange={(event) => setConfig((current) => ({ ...current, booking_url: event.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5" /> Controle e segurança</CardTitle>
            <CardDescription>Limites para reduzir respostas incorretas e manter atendimento humano disponível.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <Label>Encaminhamento humano</Label>
                <p className="text-xs text-muted-foreground">Pausa a IA quando o cliente pedir uma pessoa.</p>
              </div>
              <Switch checked={config.human_handoff_enabled} onCheckedChange={(value) => setConfig((current) => ({ ...current, human_handoff_enabled: value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="history-size">Mensagens consideradas no contexto</Label>
              <Input
                id="history-size"
                type="number"
                min={4}
                max={20}
                value={config.max_history_messages}
                onChange={(event) => setConfig((current) => ({ ...current, max_history_messages: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handoff-message">Mensagem de encaminhamento</Label>
              <Textarea id="handoff-message" rows={4} value={config.handoff_message} onChange={(event) => setConfig((current) => ({ ...current, handoff_message: event.target.value }))} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Instruções da atendente</CardTitle>
          <CardDescription>Edite o comportamento em linguagem normal. As proteções essenciais continuam aplicadas pelo backend.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea rows={12} value={config.prompt} onChange={(event) => setConfig((current) => ({ ...current, prompt: event.target.value }))} className="leading-relaxed" />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={handleTest} disabled={testing || saving || !hasApiKey}>
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
              Testar API
            </Button>
            <Button onClick={handleSave} disabled={saving || testing}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar atendente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppAIAttendant;
