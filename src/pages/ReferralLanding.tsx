import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReferralLanding(){
  const {code}=useParams(); const {user,loading}=useAuth(); const navigate=useNavigate(); const [referrer,setReferrer]=useState(''); const [claiming,setClaiming]=useState(false);
  useEffect(()=>{ if(!code)return; localStorage.setItem('pending_referral_code',code); (supabase as any).from('profiles').select('name').eq('referral_code',code).maybeSingle().then(({data}:any)=>setReferrer(data?.name||'')); },[code]);
  useEffect(()=>{ if(loading||!user||!code)return; setClaiming(true); (supabase as any).rpc('claim_referral',{p_code:code}).then(({error}:any)=>{setClaiming(false); if(error)toast.error(error.message); else {localStorage.removeItem('pending_referral_code');toast.success('Indicação registrada!');navigate('/cliente');}}); },[user,loading,code,navigate]);
  return <div className="min-h-screen grid place-items-center bg-background p-4"><Card className="max-w-lg w-full text-center border-primary/30"><CardHeader><Gift className="h-14 w-14 text-primary mx-auto"/><CardTitle>Você foi indicado{referrer?` por ${referrer}`:''}!</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-muted-foreground">Cadastre-se, agende seu primeiro atendimento e ajude seu amigo a ganhar 50% no próximo corte.</p>{claiming?<Loader2 className="animate-spin mx-auto"/>:<Button className="w-full" onClick={()=>navigate(user?'/cliente':'/cadastro')}>{user?'Registrar indicação':'Criar minha conta'}</Button>}<Button variant="ghost" className="w-full" onClick={()=>navigate('/auth')}>Já tenho conta</Button></CardContent></Card></div>;
}
