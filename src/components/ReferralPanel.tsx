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
type ReferralConfig = { enabled: boolean; eligible_service_id: string | null; discount_percent: number; validity_days: number; commission_basis: 'original'|'final'; whatsapp_enabled: boolean; expiry_reminder_days: number };
const defaults: ReferralConfig = { enabled:true, eligible_service_id:null, discount_percent:50, validity_days:90, commission_basis:'final', whatsapp_enabled:true, expiry_reminder_days:7 };

export default function ReferralPanel({ mode, clientId }: { mode: Mode; clientId?: string }) {
  const { user } = useAuth();
  const ownerId = clientId || user?.id;
  const [profile, setProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [config, setConfig] = useState<ReferralConfig>(defaults);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    await (supabase as any).rpc('expire_referral_coupons');
    let refs = (supabase as any).from('referrals').select('*, referrer:profiles!referrals_referrer_id_fkey(name,phone), referred:profiles!referrals_referred_id_fkey(name,phone)').order('created_at',{ascending:false});
    let cups = (supabase as any).from('referral_coupons').select('*, owner:profiles!referral_coupons_owner_id_fkey(name,phone)').order('created_at',{ascending:false});
    if (mode !== 'admin' && ownerId) { refs = refs.eq('referrer_id',ownerId); cups = cups.eq('owner_id',ownerId); }
    const [p,r,c,s,cfg] = await Promise.all([
      ownerId ? (supabase as any).from('profiles').select('id,name,referral_code').eq('id',ownerId).maybeSingle() : Promise.resolve({data:null}),
      refs, cups,
      supabase.from('services').select('id,title,price').eq('visible',true).order('order_index'),
      supabase.from('site_config').select('config_value').eq('config_key','referral_program').maybeSingle(),
    ]);
    setProfile(p.data); setReferrals(r.data||[]); setCoupons(c.data||[]); setServices(s.data||[]);
    setConfig({ ...defaults, ...((cfg.data?.config_value as any)||{}) }); setLoading(false);
  }, [mode, ownerId]);

  useEffect(() => { load(); const ch=supabase.channel(`referrals-${mode}-${ownerId||'all'}`).on('postgres_changes',{event:'*',schema:'public',table:'referrals'},load).on('postgres_changes',{event:'*',schema:'public',table:'referral_coupons'},load).on('postgres_changes',{event:'*',schema:'public',table:'site_config',filter:'config_key=eq.referral_program'},load).subscribe(); return()=>{supabase.removeChannel(ch)}; },[load,mode,ownerId]);

  const link = profile?.referral_code ? `${window.location.origin}/indicacao/${profile.referral_code}` : '';
  const available = coupons.filter(c=>c.status==='available' && new Date(c.expires_at)>new Date()).length;
  const qualified = referrals.filter(r=>r.status==='qualified').length;
  const share = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Ganhe estilo na Barbearia Raimundos! Cadastre-se pelo meu link: ${link}`)}`,'_blank','noopener,noreferrer');
  const saveConfig = async () => { const {error}=await supabase.from('site_config').upsert({config_key:'referral_program',config_value:config as any},{onConflict:'config_key'}); error?toast.error(error.message):toast.success('Campanha atualizada'); };
  const remove = async (table:string,id:string) => { const {error}=await (supabase as any).from(table).delete().eq('id',id); error?toast.error(error.message):toast.success('Registro excluído'); };
  const statusLabel = (s:string) => ({pending:'Aguardando atendimento',qualified:'Validada',available:'Disponível',used:'Usado',expired:'Expirado',cancelled:'Cancelado'} as any)[s]||s;
  const stats=useMemo(()=>({invites:referrals.length,qualified,waiting:referrals.length-qualified,available}),[referrals,qualified,available]);
  if (loading) return <div className="py-10 text-center text-muted-foreground">Carregando indicações...</div>;
  if (mode === 'client' && !config.enabled) return null;

  return <div className="space-y-5">
    {mode==='client' && <Card className="border-primary/30"><CardHeader><CardTitle className="flex gap-2"><Gift className="text-primary"/>Indique e Ganhe</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Cada amigo novo que concluir o primeiro serviço pago libera um cupom de {config.discount_percent}% para seu próximo corte. O barbeiro aplica o cupom no atendimento.</p><div className="flex gap-2"><Input value={link} readOnly/><Button variant="outline" onClick={()=>{navigator.clipboard.writeText(link);toast.success('Link copiado')}}><Copy className="h-4 w-4"/></Button><Button onClick={share}><MessageCircle className="h-4 w-4 mr-2"/>Compartilhar</Button></div></CardContent></Card>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[[Users,'Convites',stats.invites],[Clock,'Aguardando',stats.waiting],[CheckCircle2,'Validados',stats.qualified],[Ticket,'Cupons disponíveis',stats.available]].map(([I,l,v]:any)=><Card key={l}><CardContent className="p-4"><I className="h-5 w-5 text-primary mb-2"/><div className="text-2xl font-bold">{v}</div><div className="text-xs text-muted-foreground">{l}</div></CardContent></Card>)}</div>
    {mode==='admin' && <Card><CardHeader><CardTitle>Configuração da campanha</CardTitle></CardHeader><CardContent className="grid md:grid-cols-3 gap-4"><div><Label>Campanha ativa</Label><Switch className="ml-3" checked={config.enabled} onCheckedChange={v=>setConfig({...config,enabled:v})}/></div><div><Label>Serviço elegível</Label><Select value={config.eligible_service_id||''} onValueChange={v=>setConfig({...config,eligible_service_id:v})}><SelectTrigger><SelectValue placeholder="Selecione o Corte"/></SelectTrigger><SelectContent>{services.map(s=><SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent></Select></div><div><Label>Desconto (%)</Label><Input type="number" value={config.discount_percent} onChange={e=>setConfig({...config,discount_percent:Number(e.target.value)})}/></div><div><Label>Validade (dias)</Label><Input type="number" value={config.validity_days} onChange={e=>setConfig({...config,validity_days:Number(e.target.value)})}/></div><div><Label>Base da comissão</Label><Select value={config.commission_basis} onValueChange={(v:any)=>setConfig({...config,commission_basis:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="final">Valor recebido</SelectItem><SelectItem value="original">Preço integral</SelectItem></SelectContent></Select></div><div><Label>WhatsApp</Label><Switch className="ml-3" checked={config.whatsapp_enabled} onCheckedChange={v=>setConfig({...config,whatsapp_enabled:v})}/></div><Button onClick={saveConfig}>Salvar configurações</Button></CardContent></Card>}
    <div className="grid lg:grid-cols-2 gap-5"><Card><CardHeader><CardTitle>Indicações</CardTitle></CardHeader><CardContent className="space-y-3">{referrals.length===0?<p className="text-sm text-muted-foreground">Nenhuma indicação ainda.</p>:referrals.map(r=><div key={r.id} className="flex items-center justify-between border rounded p-3"><div><div className="font-medium">{mode==='admin'?`${r.referrer?.name||'—'} → ${r.referred?.name||'—'}`:r.referred?.name||'Amigo indicado'}</div><div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('pt-BR')}</div></div><div className="flex items-center gap-2"><Badge variant={r.status==='qualified'?'default':'secondary'}>{statusLabel(r.status)}</Badge>{mode==='admin'&&<Button size="icon" variant="ghost" onClick={()=>remove('referrals',r.id)}><Trash2 className="h-4 w-4"/></Button>}</div></div>)}</CardContent></Card>
    <Card><CardHeader><CardTitle>Cupons</CardTitle></CardHeader><CardContent className="space-y-3">{coupons.length===0?<p className="text-sm text-muted-foreground">Nenhum cupom gerado.</p>:coupons.map(c=><div key={c.id} className="flex items-center justify-between border rounded p-3"><div><div className="font-medium">{mode==='admin'&&c.owner?.name?`${c.owner.name} · `:''}{Number(c.discount_percent)}% de desconto</div><div className="text-xs text-muted-foreground">Válido até {new Date(c.expires_at).toLocaleDateString('pt-BR')}</div></div><div className="flex items-center gap-2"><Badge>{statusLabel(c.status)}</Badge>{mode==='admin'&&<Button size="icon" variant="ghost" onClick={()=>remove('referral_coupons',c.id)}><Trash2 className="h-4 w-4"/></Button>}</div></div>)}</CardContent></Card></div>
  </div>;
}
