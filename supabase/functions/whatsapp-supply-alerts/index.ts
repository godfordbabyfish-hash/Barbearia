// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json; charset=utf-8"};
const cleanPhone=(v:string)=>(v||'').replace(/\D/g,'');

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  const url=Deno.env.get('SUPABASE_URL')||'';
  const service=(JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}')['edge_functions_20260730']||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))||'';
  const client=createClient(url,service,{auth:{persistSession:false}});
  try{
    const [{data:cfgRow},{data:phoneRow},{data:instanceRow},{data:items},{data:batches}]=await Promise.all([
      client.from('site_config').select('config_value').eq('config_key','supply_inventory').maybeSingle(),
      client.from('site_config').select('config_value').eq('config_key','whatsapp_daily_report').maybeSingle(),
      client.from('site_config').select('config_value').eq('config_key','whatsapp_active_instance').maybeSingle(),
      client.from('supply_items').select('id,name,unit,minimum_stock,expiry_warning_days').eq('active',true),
      client.from('supply_batches').select('id,item_id,quantity_remaining,expires_on').gt('quantity_remaining',0),
    ]);
    const cfg=cfgRow?.config_value||{}; if(cfg.whatsapp_enabled===false)return new Response(JSON.stringify({skipped:'disabled'}),{headers});
    const names=new Map((items||[]).map((x:any)=>[x.id,x])); const balances=new Map<string,number>();
    (batches||[]).forEach((b:any)=>balances.set(b.item_id,(balances.get(b.item_id)||0)+Number(b.quantity_remaining)));
    const low=(items||[]).filter((i:any)=>(balances.get(i.id)||0)<=Number(i.minimum_stock));
    const now=new Date(); const day=now.toISOString().slice(0,10); const near:any[]=[]; const expired:any[]=[];
    (batches||[]).forEach((b:any)=>{if(!b.expires_on)return; const item=names.get(b.item_id); const limit=new Date(now);limit.setUTCDate(limit.getUTCDate()+Number(item?.expiry_warning_days??cfg.expiry_warning_days??15)); if(b.expires_on<day)expired.push(b);else if(b.expires_on<=limit.toISOString().slice(0,10))near.push(b)});
    if(!low.length&&!near.length&&!expired.length)return new Response(JSON.stringify({skipped:'no-alerts'}),{headers});
    const lines=['📦 *Alerta de estoque de insumos*',''];
    if(low.length){lines.push('⚠️ *Estoque baixo*');low.forEach((i:any)=>lines.push(`• ${i.name}: ${(balances.get(i.id)||0).toLocaleString('pt-BR')} ${i.unit} (mín. ${Number(i.minimum_stock).toLocaleString('pt-BR')})`));lines.push('')}
    if(expired.length){lines.push('❌ *Lotes vencidos*');expired.forEach((b:any)=>lines.push(`• ${names.get(b.item_id)?.name}: ${b.expires_on.split('-').reverse().join('/')}`));lines.push('')}
    if(near.length){lines.push('🗓️ *Próximos do vencimento*');near.forEach((b:any)=>lines.push(`• ${names.get(b.item_id)?.name}: ${b.expires_on.split('-').reverse().join('/')}`))}
    const message=lines.join('\n'); const alertKey=`low:${low.map((x:any)=>x.id).sort().join(',')}|expired:${expired.map(x=>x.id).sort().join(',')}|near:${near.map(x=>x.id).sort().join(',')}`;
    const {data:existing}=await client.from('supply_alert_notifications').select('*').eq('alert_date',day).eq('alert_key',alertKey).maybeSingle();
    if(existing?.status==='sent')return new Response(JSON.stringify({skipped:'already-sent'}),{headers});
    let logId=existing?.id; if(!logId){const {data:created,error}=await client.from('supply_alert_notifications').insert({alert_date:day,alert_key:alertKey,message}).select('id').single();if(error)throw error;logId=created.id}
    const base=(Deno.env.get('EVOLUTION_API_URL')||'').replace(/\/$/,''); const apiKey=Deno.env.get('EVOLUTION_API_KEY')||''; const instance=instanceRow?.config_value?.instanceName||Deno.env.get('EVOLUTION_INSTANCE_NAME')||''; const phone=cleanPhone(phoneRow?.config_value?.phone_number||'');
    if(!base||!apiKey||!instance||!phone)throw new Error('Configuração do Baileys ou número administrativo incompleta');
    const response=await fetch(`${base}/message/sendText/${encodeURIComponent(instance)}`,{method:'POST',headers:{'Content-Type':'application/json',apikey:apiKey},body:JSON.stringify({number:phone,text:message,options:{delay:800,presence:'composing'}})});
    const payload=await response.json().catch(()=>({})); if(!response.ok||!payload?.messageId)throw new Error(`Baileys não confirmou o envio (${response.status})`);
    await client.from('supply_alert_notifications').update({status:'sent',sent_at:new Date().toISOString(),attempts:(existing?.attempts||0)+1,last_error:null}).eq('id',logId);
    return new Response(JSON.stringify({sent:true,messageId:payload.messageId}),{headers});
  }catch(error){
    const day=new Date().toISOString().slice(0,10); await client.from('supply_alert_notifications').update({status:'failed',last_error:String(error?.message||error),attempts:1}).eq('alert_date',day).eq('status','pending');
    return new Response(JSON.stringify({error:String(error?.message||error)}),{status:500,headers});
  }
});
