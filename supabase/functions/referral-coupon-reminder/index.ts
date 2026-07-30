import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = (JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')['edge_functions_20260730'] || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!;
  const legacyInvokeKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db = createClient(url, serviceKey);
  const { data: cfgRow } = await db.from('site_config').select('config_value').eq('config_key','referral_program').maybeSingle();
  const cfg = cfgRow?.config_value as any;
  if (!cfg?.enabled || !cfg?.whatsapp_enabled) return Response.json({ success:true, skipped:true });
  await db.rpc('expire_referral_coupons');
  let sent=0;
  const { data: earned } = await db.from('referral_coupons').select('id,discount_percent,owner:profiles!referral_coupons_owner_id_fkey(name,phone),referral_notification_logs(notification_type)').eq('status','available');
  for (const coupon of earned || []) {
    const logs:any[] = (coupon as any).referral_notification_logs || [];
    const owner:any = coupon.owner;
    if (!owner?.phone || logs.some(l=>l.notification_type==='earned')) continue;
    const { error: logError } = await db.from('referral_notification_logs').insert({ coupon_id:coupon.id, notification_type:'earned' });
    if (logError) continue;
    const res = await fetch(`${url}/functions/v1/whatsapp-notify`, { method:'POST', headers:{'Content-Type':'application/json','apikey':legacyInvokeKey,Authorization:`Bearer ${legacyInvokeKey}`}, body:JSON.stringify({ appointmentId:coupon.id, clientName:owner.name, phone:owner.phone, action:'referral_earned', serviceName:`${coupon.discount_percent}%` }) });
    if (res.ok) sent++; else await db.from('referral_notification_logs').delete().eq('coupon_id',coupon.id).eq('notification_type','earned');
  }
  const days = Number(cfg.expiry_reminder_days || 7);
  const from = new Date(Date.now() + (days - 1) * 86400000).toISOString();
  const to = new Date(Date.now() + days * 86400000).toISOString();
  const { data: coupons, error } = await db.from('referral_coupons').select('id,discount_percent,expires_at,owner:profiles!referral_coupons_owner_id_fkey(name,phone)').eq('status','available').gte('expires_at',from).lt('expires_at',to);
  if (error) return Response.json({ success:false,error:error.message },{status:500});
  for (const coupon of coupons || []) {
    const owner:any = coupon.owner;
    if (!owner?.phone) continue;
    const { error: logError } = await db.from('referral_notification_logs').insert({ coupon_id:coupon.id, notification_type:'expiring' });
    if (logError) continue;
    const res = await fetch(`${url}/functions/v1/whatsapp-notify`, { method:'POST', headers:{'Content-Type':'application/json','apikey':legacyInvokeKey,Authorization:`Bearer ${legacyInvokeKey}`}, body:JSON.stringify({ appointmentId:coupon.id, clientName:owner.name, phone:owner.phone, action:'referral_expiring', appointmentDate:String(coupon.expires_at).slice(0,10), serviceName:`${coupon.discount_percent}%` }) });
    if (res.ok) sent++; else await db.from('referral_notification_logs').delete().eq('coupon_id',coupon.id).eq('notification_type','expiring');
  }
  return Response.json({ success:true,sent });
});
