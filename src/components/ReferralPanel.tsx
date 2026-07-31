import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Gift, Copy, MessageCircle, Users, CheckCircle2, Clock, Ticket, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Mode = 'client' | 'admin' | 'barber';
type ReferralConfig = {
  enabled: boolean;
  discount_percent: number;
  credit_base_amount: number;
  minimum_qualifying_amount: number;
  validity_days: number;
  commission_basis: 'original' | 'final';
  whatsapp_enabled: boolean;
  expiry_reminder_days: number;
};

const defaults: ReferralConfig = {
  enabled: true,
  discount_percent: 50,
  credit_base_amount: 25,
  minimum_qualifying_amount: 25,
  validity_days: 90,
  commission_basis: 'final',
  whatsapp_enabled: true,
  expiry_reminder_days: 7,
};

const currency = (value: number) => `R$ ${Number(value || 0).toFixed(2)}`;

export default function ReferralPanel({ mode, clientId }: { mode: Mode; clientId?: string }) {
  const { user } = useAuth();
  const ownerId = clientId || user?.id;
  const [profile, setProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [config, setConfig] = useState<ReferralConfig>(defaults);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    await (supabase as any).rpc('expire_referral_coupons');

    let refs = (supabase as any)
      .from('referrals')
      .select('*, referrer:profiles!referrals_referrer_id_fkey(name,phone), referred:profiles!referrals_referred_id_fkey(name,phone)')
      .order('created_at', { ascending: false });
    let cups = (supabase as any)
      .from('referral_coupons')
      .select('*, owner:profiles!referral_coupons_owner_id_fkey(name,phone)')
      .order('created_at', { ascending: false });

    if (mode !== 'admin' && ownerId) {
      refs = refs.eq('referrer_id', ownerId);
      cups = cups.eq('owner_id', ownerId);
    }

    const [profileResult, referralsResult, couponsResult, configResult] = await Promise.all([
      ownerId
        ? (supabase as any).from('profiles').select('id,name,referral_code').eq('id', ownerId).maybeSingle()
        : Promise.resolve({ data: null }),
      refs,
      cups,
      supabase.from('site_config').select('config_value').eq('config_key', 'referral_program').maybeSingle(),
    ]);

    setProfile(profileResult.data);
    setReferrals(referralsResult.data || []);
    setCoupons(couponsResult.data || []);
    setConfig({ ...defaults, ...((configResult.data?.config_value as any) || {}) });
    setLoading(false);
  }, [mode, ownerId]);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`referrals-${mode}-${ownerId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referral_coupons' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_config', filter: 'config_key=eq.referral_program' }, load)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, mode, ownerId]);

  const creditAmount = Number((config.credit_base_amount * config.discount_percent / 100).toFixed(2));
  const getCouponCredit = (coupon: any) => Number(
    coupon.discount_amount_limit ?? (config.credit_base_amount * Number(coupon.discount_percent || 0) / 100),
  );
  const link = profile?.referral_code ? `${window.location.origin}/indicacao/${profile.referral_code}` : '';
  const available = coupons.filter((coupon) => coupon.status === 'available' && new Date(coupon.expires_at) > new Date()).length;
  const qualified = referrals.filter((referral) => referral.status === 'qualified').length;
  const stats = useMemo(
    () => ({ invites: referrals.length, qualified, waiting: referrals.length - qualified, available }),
    [referrals, qualified, available],
  );

  const share = () => window.open(
    `https://wa.me/?text=${encodeURIComponent(`Indique um amigo na Barbearia Raimundos: ${link}`)}`,
    '_blank',
    'noopener,noreferrer',
  );
  const saveConfig = async () => {
    const { error } = await supabase.from('site_config').upsert(
      { config_key: 'referral_program', config_value: config as any },
      { onConflict: 'config_key' },
    );
    error ? toast.error(error.message) : toast.success('Campanha atualizada');
  };
  const remove = async (table: string, id: string) => {
    const { error } = await (supabase as any).from(table).delete().eq('id', id);
    error ? toast.error(error.message) : toast.success('Registro excluído');
  };
  const statusLabel = (status: string) => ({
    pending: 'Aguardando atendimento', qualified: 'Validada', available: 'Disponível',
    used: 'Usado', expired: 'Expirado', cancelled: 'Não elegível',
  } as Record<string, string>)[status] || status;

  if (loading) return <div className="py-10 text-center text-muted-foreground">Carregando indicações...</div>;
  if (mode === 'client' && !config.enabled) return null;

  return <div className="space-y-5">
    {mode === 'client' && (
      <Card className="border-primary/30">
        <CardHeader><CardTitle className="flex gap-2"><Gift className="text-primary" />Indique e Ganhe</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cada amigo novo que concluir o primeiro serviço pago de pelo menos {currency(config.minimum_qualifying_amount)}
            {' '}libera um crédito de até {currency(creditAmount)} para usar em qualquer serviço. O barbeiro aplica o crédito no atendimento.
          </p>
          <div className="flex gap-2">
            <Input value={link} readOnly />
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copiado'); }}><Copy className="h-4 w-4" /></Button>
            <Button onClick={share}><MessageCircle className="mr-2 h-4 w-4" />Compartilhar</Button>
          </div>
        </CardContent>
      </Card>
    )}

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[[Users, 'Convites', stats.invites], [Clock, 'Aguardando', stats.waiting], [CheckCircle2, 'Validados', stats.qualified], [Ticket, 'Créditos disponíveis', stats.available]].map(([Icon, label, value]: any) => (
        <Card key={label}><CardContent className="p-4"><Icon className="mb-2 h-5 w-5 text-primary" /><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></CardContent></Card>
      ))}
    </div>

    {mode === 'admin' && (
      <Card>
        <CardHeader><CardTitle>Configuração da campanha</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div><Label>Campanha ativa</Label><Switch className="ml-3" checked={config.enabled} onCheckedChange={(enabled) => setConfig({ ...config, enabled })} /></div>
          <div><Label>Desconto sobre a base (%)</Label><Input min="1" max="100" type="number" value={config.discount_percent} onChange={(event) => setConfig({ ...config, discount_percent: Number(event.target.value) })} /></div>
          <div><Label>Base do crédito (R$)</Label><Input min="0.01" step="0.01" type="number" value={config.credit_base_amount} onChange={(event) => setConfig({ ...config, credit_base_amount: Number(event.target.value) })} /><p className="mt-1 text-xs text-muted-foreground">Crédito atual: até {currency(creditAmount)}.</p></div>
          <div><Label>Valor mínimo do serviço indicado (R$)</Label><Input min="0.01" step="0.01" type="number" value={config.minimum_qualifying_amount} onChange={(event) => setConfig({ ...config, minimum_qualifying_amount: Number(event.target.value) })} /><p className="mt-1 text-xs text-muted-foreground">Qualquer serviço com esse valor ou acima valida a indicação.</p></div>
          <div><Label>Validade (dias)</Label><Input min="1" type="number" value={config.validity_days} onChange={(event) => setConfig({ ...config, validity_days: Number(event.target.value) })} /></div>
          <div><Label>Base da comissão</Label><Select value={config.commission_basis} onValueChange={(commission_basis: 'original' | 'final') => setConfig({ ...config, commission_basis })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="final">Valor recebido</SelectItem><SelectItem value="original">Preço integral</SelectItem></SelectContent></Select></div>
          <div><Label>WhatsApp</Label><Switch className="ml-3" checked={config.whatsapp_enabled} onCheckedChange={(whatsapp_enabled) => setConfig({ ...config, whatsapp_enabled })} /></div>
          <Button onClick={saveConfig}>Salvar configurações</Button>
        </CardContent>
      </Card>
    )}

    <div className="grid gap-5 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Indicações</CardTitle></CardHeader><CardContent className="space-y-3">{referrals.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma indicação ainda.</p> : referrals.map((referral) => <div key={referral.id} className="flex items-center justify-between rounded border p-3"><div><div className="font-medium">{mode === 'admin' ? `${referral.referrer?.name || '—'} → ${referral.referred?.name || '—'}` : referral.referred?.name || 'Amigo indicado'}</div><div className="text-xs text-muted-foreground">{new Date(referral.created_at).toLocaleDateString('pt-BR')}</div></div><div className="flex items-center gap-2"><Badge variant={referral.status === 'qualified' ? 'default' : 'secondary'}>{statusLabel(referral.status)}</Badge>{mode === 'admin' && <Button size="icon" variant="ghost" onClick={() => remove('referrals', referral.id)}><Trash2 className="h-4 w-4" /></Button>}</div></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>Créditos</CardTitle></CardHeader><CardContent className="space-y-3">{coupons.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum crédito gerado.</p> : coupons.map((coupon) => <div key={coupon.id} className="flex items-center justify-between rounded border p-3"><div><div className="font-medium">{mode === 'admin' && coupon.owner?.name ? `${coupon.owner.name} · ` : ''}Crédito de até {currency(getCouponCredit(coupon))}</div><div className="text-xs text-muted-foreground">Válido até {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}</div></div><div className="flex items-center gap-2"><Badge>{statusLabel(coupon.status)}</Badge>{mode === 'admin' && <Button size="icon" variant="ghost" onClick={() => remove('referral_coupons', coupon.id)}><Trash2 className="h-4 w-4" /></Button>}</div></div>)}</CardContent></Card>
    </div>
  </div>;
}
