-- Programa de indicações e cupons
create extension if not exists pgcrypto;
create extension if not exists pg_net;
create extension if not exists pg_cron with schema cron;

alter table public.profiles
  add column if not exists referral_code text;

update public.profiles
set referral_code = lower(substr(encode(extensions.gen_random_bytes(9), 'hex'), 1, 12))
where referral_code is null;

create unique index if not exists profiles_referral_code_key
  on public.profiles(referral_code) where referral_code is not null;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  referral_code text not null,
  status text not null default 'pending' check (status in ('pending','qualified','cancelled')),
  qualifying_appointment_id uuid references public.appointments(id) on delete set null,
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  unique (referred_id),
  check (referrer_id <> referred_id)
);

create table if not exists public.referral_coupons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  referral_id uuid references public.referrals(id) on delete set null,
  discount_percent numeric(5,2) not null check (discount_percent > 0 and discount_percent <= 100),
  status text not null default 'available' check (status in ('available','used','expired','cancelled')),
  expires_at timestamptz not null,
  used_appointment_id uuid references public.appointments(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  unique (referral_id)
);

create table if not exists public.referral_notification_logs (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.referral_coupons(id) on delete cascade,
  notification_type text not null check (notification_type in ('earned','expiring')),
  created_at timestamptz not null default now(),
  unique(coupon_id, notification_type)
);

alter table public.appointments
  add column if not exists referral_coupon_id uuid references public.referral_coupons(id) on delete set null,
  add column if not exists original_price numeric(10,2),
  add column if not exists discount_amount numeric(10,2) not null default 0,
  add column if not exists final_price numeric(10,2),
  add column if not exists commission_basis text check (commission_basis in ('original','final'));

create index if not exists referrals_referrer_idx on public.referrals(referrer_id, status);
create index if not exists referral_coupons_owner_idx on public.referral_coupons(owner_id, status, expires_at);

insert into public.site_config(config_key, config_value)
values ('referral_program', jsonb_build_object(
  'enabled', true,
  'eligible_service_id', (select id from public.services where trim(lower(title)) = 'corte de cabelo' limit 1),
  'discount_percent', 50,
  'validity_days', 90,
  'commission_basis', 'final',
  'whatsapp_enabled', true,
  'expiry_reminder_days', 7
)) on conflict (config_key) do nothing;

alter table public.referrals enable row level security;
alter table public.referral_coupons enable row level security;
alter table public.referral_notification_logs enable row level security;

create or replace function public.is_referral_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role::text in ('admin','gestor')
  );
$$;

drop policy if exists "Referral participants can view" on public.referrals;
create policy "Referral participants can view" on public.referrals for select to authenticated
  using (auth.uid() in (referrer_id, referred_id) or public.is_referral_staff());
drop policy if exists "Staff manage referrals" on public.referrals;
create policy "Staff manage referrals" on public.referrals for all to authenticated
  using (public.is_referral_staff()) with check (public.is_referral_staff());
drop policy if exists "Coupon owner and staff can view" on public.referral_coupons;
create policy "Coupon owner and staff can view" on public.referral_coupons for select to authenticated
  using (owner_id = auth.uid() or public.is_referral_staff() or exists (
    select 1 from public.appointments a join public.barbers b on b.id = a.barber_id
    where a.client_id = referral_coupons.owner_id and b.user_id = auth.uid()
  ));
drop policy if exists "Staff manage coupons" on public.referral_coupons;
create policy "Staff manage coupons" on public.referral_coupons for all to authenticated
  using (public.is_referral_staff()) with check (public.is_referral_staff());

create or replace function public.ensure_referral_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := lower(substr(encode(extensions.gen_random_bytes(9), 'hex'), 1, 12));
  end if;
  return new;
end; $$;
drop trigger if exists trg_profiles_referral_code on public.profiles;
create trigger trg_profiles_referral_code before insert on public.profiles
for each row execute function public.ensure_referral_code();

create or replace function public.claim_referral(p_code text)
returns public.referrals language plpgsql security definer set search_path = public as $$
declare
  v_referrer uuid;
  v_existing public.referrals;
  v_phone text;
  v_cpf text;
begin
  if auth.uid() is null then raise exception 'Faça login para registrar a indicação'; end if;
  select id into v_referrer from profiles where referral_code = lower(trim(p_code));
  if v_referrer is null then raise exception 'Link de indicação inválido'; end if;
  if v_referrer = auth.uid() then raise exception 'Você não pode indicar a si mesmo'; end if;
  select * into v_existing from referrals where referred_id = auth.uid();
  if found then return v_existing; end if;
  if exists(select 1 from referrals where referrer_id = auth.uid() and referred_id = v_referrer) then
    raise exception 'Indicação circular não permitida';
  end if;
  select phone, cpf into v_phone, v_cpf from profiles where id = auth.uid();
  if exists(select 1 from appointments where client_id = auth.uid() and status = 'completed') then
    raise exception 'A indicação é válida somente para clientes novos';
  end if;
  if (v_phone is not null and exists(select 1 from profiles p join appointments a on a.client_id=p.id where p.id<>auth.uid() and p.phone=v_phone and a.status='completed'))
     or (v_cpf is not null and exists(select 1 from profiles p join appointments a on a.client_id=p.id where p.id<>auth.uid() and p.cpf=v_cpf and a.status='completed')) then
    raise exception 'Este cliente já possui atendimento concluído';
  end if;
  insert into referrals(referrer_id,referred_id,referral_code)
  values(v_referrer,auth.uid(),lower(trim(p_code))) returning * into v_existing;
  return v_existing;
end; $$;

create or replace function public.expire_referral_coupons()
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  update referral_coupons set status='expired'
  where status='available' and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end; $$;

create or replace function public.complete_appointment_with_referral(
  p_appointment_id uuid,
  p_payments jsonb,
  p_photo_url text default null,
  p_coupon_id uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_apt appointments%rowtype;
  v_price numeric(10,2);
  v_discount numeric(10,2) := 0;
  v_final numeric(10,2);
  v_paid numeric(10,2);
  v_coupon referral_coupons%rowtype;
  v_cfg jsonb;
  v_main_method text;
  v_ref referrals%rowtype;
  v_days integer;
  v_percent numeric;
  v_basis text;
  v_is_staff boolean;
  v_is_barber boolean;
begin
  select a.* into v_apt from appointments a where a.id=p_appointment_id for update;
  if not found then raise exception 'Agendamento não encontrado'; end if;
  select public.is_referral_staff(), exists(select 1 from barbers b where b.id=v_apt.barber_id and b.user_id=auth.uid())
    into v_is_staff,v_is_barber;
  if not coalesce(v_is_staff,false) and not coalesce(v_is_barber,false) then raise exception 'Sem permissão para concluir este atendimento'; end if;
  if v_apt.status='completed' then
    return jsonb_build_object('success',true,'idempotent',true,'final_price',v_apt.final_price);
  end if;
  select price into v_price from services where id=v_apt.service_id;
  select config_value into v_cfg from site_config where config_key='referral_program';
  v_percent := coalesce((v_cfg->>'discount_percent')::numeric,50);
  v_days := coalesce((v_cfg->>'validity_days')::integer,90);
  v_basis := case when v_cfg->>'commission_basis'='original' then 'original' else 'final' end;
  perform public.expire_referral_coupons();
  if p_coupon_id is not null then
    if coalesce((v_cfg->>'enabled')::boolean,false) is not true then raise exception 'Programa de indicação inativo'; end if;
    if (v_cfg->>'eligible_service_id') is null or (v_cfg->>'eligible_service_id')::uuid <> v_apt.service_id then raise exception 'Cupom válido apenas para o corte configurado'; end if;
    select * into v_coupon from referral_coupons where id=p_coupon_id for update;
    if not found or v_coupon.owner_id<>v_apt.client_id or v_coupon.status<>'available' or v_coupon.expires_at<=now() then raise exception 'Cupom inválido ou expirado'; end if;
    v_discount := round(v_price * v_coupon.discount_percent / 100, 2);
  end if;
  v_final := greatest(v_price-v_discount,0);
  if jsonb_typeof(coalesce(p_payments, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_payments) = 0
     or exists (
       select 1 from jsonb_array_elements(p_payments) x
       where coalesce((x->>'amount')::numeric, 0) <= 0
          or x->>'method' not in ('pix','dinheiro','cartao')
     ) then
    raise exception 'Pagamentos inválidos';
  end if;
  select coalesce(sum((x->>'amount')::numeric),0), (array_agg(x->>'method' order by (x->>'amount')::numeric desc))[1]
    into v_paid,v_main_method from jsonb_array_elements(coalesce(p_payments,'[]'::jsonb)) x;
  if v_final<=0 or abs(v_paid-v_final)>0.01 then raise exception 'Pagamentos devem totalizar R$ %', v_final; end if;
  if v_main_method not in ('pix','dinheiro','cartao') then raise exception 'Forma de pagamento inválida'; end if;
  delete from appointment_payments where appointment_id=p_appointment_id;
  insert into appointment_payments(appointment_id,payment_method,amount)
    select p_appointment_id,x->>'method',(x->>'amount')::numeric from jsonb_array_elements(p_payments) x;
  update appointments set status='completed',photo_url=p_photo_url,payment_method=v_main_method,
    referral_coupon_id=p_coupon_id,original_price=v_price,discount_amount=v_discount,final_price=v_final,commission_basis=v_basis
    where id=p_appointment_id;
  if p_coupon_id is not null then
    update referral_coupons set status='used',used_at=now(),used_appointment_id=p_appointment_id where id=p_coupon_id;
  end if;
  select * into v_ref from referrals where referred_id=v_apt.client_id and status='pending' for update;
  if found and v_paid>0 then
    update referrals set status='qualified',qualified_at=now(),qualifying_appointment_id=p_appointment_id where id=v_ref.id;
    insert into referral_coupons(owner_id,referral_id,discount_percent,expires_at)
      values(v_ref.referrer_id,v_ref.id,v_percent,now()+make_interval(days=>v_days)) on conflict(referral_id) do nothing;
  end if;
  return jsonb_build_object('success',true,'original_price',v_price,'discount_amount',v_discount,'final_price',v_final,'coupon_generated',found);
end; $$;

grant execute on function public.claim_referral(text) to authenticated;
grant execute on function public.complete_appointment_with_referral(uuid,jsonb,text,uuid) to authenticated;

grant select, insert, update, delete on public.referrals to authenticated;
grant select, insert, update, delete on public.referral_coupons to authenticated;

revoke execute on function public.is_referral_staff() from public, anon;
revoke execute on function public.ensure_referral_code() from public, anon, authenticated;
revoke execute on function public.claim_referral(text) from public, anon;
revoke execute on function public.expire_referral_coupons() from public, anon, authenticated;
revoke execute on function public.complete_appointment_with_referral(uuid,jsonb,text,uuid) from public, anon;
grant execute on function public.is_referral_staff() to authenticated;
grant execute on function public.claim_referral(text) to authenticated;
grant execute on function public.complete_appointment_with_referral(uuid,jsonb,text,uuid) to authenticated;

create or replace function public.invoke_referral_coupon_reminder()
returns void language plpgsql security definer as $$
begin
  perform net.http_post(
    url := 'https://wabefmgfsatlusevxyfo.supabase.co/functions/v1/referral-coupon-reminder',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('source','daily-cron')
  );
exception when others then
  raise warning 'Erro ao executar lembretes de indicação: %', sqlerrm;
end; $$;

revoke execute on function public.invoke_referral_coupon_reminder() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule('referral-coupon-reminder-daily');
exception when others then null; end $$;

select cron.schedule('referral-coupon-reminder-daily','0 12 * * *','select public.invoke_referral_coupon_reminder();');

alter publication supabase_realtime add table public.referrals;
alter publication supabase_realtime add table public.referral_coupons;
