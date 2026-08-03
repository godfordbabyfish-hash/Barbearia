create table public.supply_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Geral',
  unit text not null default 'unidade',
  minimum_stock numeric(12,3) not null default 0 check (minimum_stock >= 0),
  expiry_warning_days integer not null default 15 check (expiry_warning_days between 0 and 365),
  notes text,
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supply_items_name_key unique (name)
);

create table public.supply_batches (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.supply_items(id) on delete restrict,
  quantity_received numeric(12,3) not null check (quantity_received > 0),
  quantity_remaining numeric(12,3) not null check (quantity_remaining >= 0),
  total_cost numeric(12,2) not null check (total_cost >= 0),
  unit_cost numeric(14,6) not null check (unit_cost >= 0),
  purchased_on date not null default current_date,
  expires_on date,
  supplier text,
  invoice_reference text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint supply_batches_remaining_check check (quantity_remaining <= quantity_received)
);

create table public.supply_consumptions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.supply_items(id) on delete restrict,
  barber_id uuid not null references public.barbers(id) on delete restrict,
  consumption_date date not null,
  quantity numeric(12,3) not null check (quantity > 0),
  notes text,
  status text not null default 'active' check (status in ('active','reversed')),
  idempotency_key uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  reversed_by uuid references auth.users(id) on delete restrict,
  reversed_at timestamptz,
  reversal_reason text,
  created_at timestamptz not null default now(),
  constraint supply_consumptions_actor_idempotency_key unique (created_by, idempotency_key)
);

create table public.supply_consumption_allocations (
  id uuid primary key default gen_random_uuid(),
  consumption_id uuid not null references public.supply_consumptions(id) on delete restrict,
  batch_id uuid not null references public.supply_batches(id) on delete restrict,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_cost numeric(14,6) not null check (unit_cost >= 0),
  created_at timestamptz not null default now(),
  constraint supply_consumption_allocations_pair_key unique (consumption_id, batch_id)
);

create table public.supply_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.supply_items(id) on delete restrict,
  batch_id uuid references public.supply_batches(id) on delete restrict,
  consumption_id uuid references public.supply_consumptions(id) on delete restrict,
  movement_type text not null check (movement_type in ('entry','consumption','adjustment_in','adjustment_out','reversal')),
  quantity numeric(12,3) not null check (quantity > 0),
  unit_cost numeric(14,6) not null default 0 check (unit_cost >= 0),
  movement_date date not null default current_date,
  barber_id uuid references public.barbers(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  notes text,
  created_at timestamptz not null default now()
);

create table public.supply_alert_notifications (
  id uuid primary key default gen_random_uuid(),
  alert_date date not null,
  alert_key text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  message text not null,
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint supply_alert_notifications_key unique (alert_date, alert_key)
);

create index supply_batches_item_available_idx on public.supply_batches (item_id, expires_on, purchased_on) where quantity_remaining > 0;
create index supply_consumptions_barber_date_idx on public.supply_consumptions (barber_id, consumption_date desc);
create index supply_consumptions_item_date_idx on public.supply_consumptions (item_id, consumption_date desc);
create index supply_movements_date_idx on public.supply_movements (movement_date desc, item_id);
create index supply_allocations_consumption_idx on public.supply_consumption_allocations (consumption_id);

alter table public.supply_items enable row level security;
alter table public.supply_batches enable row level security;
alter table public.supply_consumptions enable row level security;
alter table public.supply_consumption_allocations enable row level security;
alter table public.supply_movements enable row level security;
alter table public.supply_alert_notifications enable row level security;

revoke all on public.supply_items, public.supply_batches, public.supply_consumptions, public.supply_consumption_allocations, public.supply_movements from anon, authenticated;
grant select on public.supply_items to authenticated;
grant select, insert, update on public.supply_items to authenticated;
grant select on public.supply_batches to authenticated;
grant select (id, item_id, barber_id, consumption_date, quantity, notes, status, idempotency_key, created_by, reversed_by, reversed_at, reversal_reason, created_at) on public.supply_consumptions to authenticated;
grant select on public.supply_consumption_allocations, public.supply_movements to authenticated;
grant select on public.supply_alert_notifications to authenticated;

create policy supply_items_staff_read on public.supply_items for select to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or public.has_role((select auth.uid()), 'gestor'::public.app_role)
  or exists (select 1 from public.barbers b where b.user_id = (select auth.uid()))
);
create policy supply_items_management_insert on public.supply_items for insert to authenticated
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.has_role((select auth.uid()), 'gestor'::public.app_role));
create policy supply_items_management_update on public.supply_items for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.has_role((select auth.uid()), 'gestor'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.has_role((select auth.uid()), 'gestor'::public.app_role));

create policy supply_batches_management_read on public.supply_batches for select to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.has_role((select auth.uid()), 'gestor'::public.app_role));
create policy supply_batches_management_insert on public.supply_batches for insert to authenticated
with check (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.has_role((select auth.uid()), 'gestor'::public.app_role));

create trigger update_supply_items_updated_at before update on public.supply_items
for each row execute function public.update_updated_at_column();

create policy supply_consumptions_read on public.supply_consumptions for select to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or public.has_role((select auth.uid()), 'gestor'::public.app_role)
  or exists (select 1 from public.barbers b where b.id = supply_consumptions.barber_id and b.user_id = (select auth.uid()))
);
create policy supply_allocations_management_read on public.supply_consumption_allocations for select to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.has_role((select auth.uid()), 'gestor'::public.app_role));
create policy supply_movements_management_read on public.supply_movements for select to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.has_role((select auth.uid()), 'gestor'::public.app_role));
create policy supply_alerts_management_read on public.supply_alert_notifications for select to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role) or public.has_role((select auth.uid()), 'gestor'::public.app_role));

create or replace function public.get_supply_stock()
returns table (item_id uuid, name text, category text, unit text, minimum_stock numeric, expiry_warning_days integer, notes text, active boolean, current_stock numeric, nearest_expiry date)
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'gestor'::public.app_role)
    or exists (select 1 from public.barbers b where b.user_id = (select auth.uid()))
  ) then raise exception 'Acesso negado'; end if;
  return query
  select i.id, i.name, i.category, i.unit, i.minimum_stock, i.expiry_warning_days, i.notes, i.active,
    coalesce(sum(b.quantity_remaining), 0)::numeric,
    min(b.expires_on) filter (where b.quantity_remaining > 0)
  from public.supply_items i
  left join public.supply_batches b on b.item_id = i.id
  group by i.id;
end; $$;

create or replace function public.create_supply_batch(
  p_item_id uuid, p_quantity numeric, p_total_cost numeric, p_purchased_on date,
  p_expires_on date default null, p_supplier text default null, p_invoice_reference text default null, p_notes text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_actor uuid := (select auth.uid());
begin
  if not (public.has_role(v_actor, 'admin'::public.app_role) or public.has_role(v_actor, 'gestor'::public.app_role)) then raise exception 'Acesso negado'; end if;
  if p_quantity <= 0 or p_total_cost < 0 then raise exception 'Quantidade ou custo inválido'; end if;
  if p_expires_on is not null and p_expires_on < p_purchased_on then raise exception 'Validade anterior à compra'; end if;
  insert into public.supply_batches(item_id,quantity_received,quantity_remaining,total_cost,unit_cost,purchased_on,expires_on,supplier,invoice_reference,notes,created_by)
  values(p_item_id,p_quantity,p_quantity,p_total_cost,p_total_cost/p_quantity,coalesce(p_purchased_on,current_date),p_expires_on,nullif(trim(p_supplier),''),nullif(trim(p_invoice_reference),''),nullif(trim(p_notes),''),v_actor)
  returning id into v_id;
  insert into public.supply_movements(item_id,batch_id,movement_type,quantity,unit_cost,movement_date,actor_id,notes)
  values(p_item_id,v_id,'entry',p_quantity,p_total_cost/p_quantity,coalesce(p_purchased_on,current_date),v_actor,p_notes);
  return v_id;
end; $$;

create or replace function public.record_supply_consumption(
  p_item_id uuid, p_quantity numeric, p_consumption_date date, p_notes text, p_idempotency_key uuid, p_barber_id uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid()); v_barber uuid; v_id uuid; v_remaining numeric := p_quantity; v_take numeric; v_batch record; v_existing uuid; v_is_management boolean;
begin
  if v_actor is null then raise exception 'Sessão inválida'; end if;
  v_is_management := public.has_role(v_actor, 'admin'::public.app_role) or public.has_role(v_actor, 'gestor'::public.app_role);
  if v_is_management then v_barber := p_barber_id; else select b.id into v_barber from public.barbers b where b.user_id = v_actor; end if;
  if v_barber is null then raise exception 'Barbeiro não identificado'; end if;
  if p_quantity <= 0 then raise exception 'Quantidade inválida'; end if;
  if not v_is_management and p_consumption_date not between current_date - 1 and current_date then raise exception 'O consumo deve ser de hoje ou ontem'; end if;
  select c.id into v_existing from public.supply_consumptions c where c.created_by=v_actor and c.idempotency_key=p_idempotency_key;
  if v_existing is not null then return v_existing; end if;
  if not exists(select 1 from public.supply_items i where i.id=p_item_id and i.active) then raise exception 'Insumo indisponível'; end if;
  insert into public.supply_consumptions(item_id,barber_id,consumption_date,quantity,notes,idempotency_key,created_by)
  values(p_item_id,v_barber,p_consumption_date,p_quantity,nullif(trim(p_notes),''),p_idempotency_key,v_actor) returning id into v_id;
  for v_batch in
    select b.* from public.supply_batches b where b.item_id=p_item_id and b.quantity_remaining>0
    order by b.expires_on asc nulls last, b.purchased_on, b.created_at for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_remaining,v_batch.quantity_remaining);
    update public.supply_batches set quantity_remaining=quantity_remaining-v_take where id=v_batch.id;
    insert into public.supply_consumption_allocations(consumption_id,batch_id,quantity,unit_cost) values(v_id,v_batch.id,v_take,v_batch.unit_cost);
    insert into public.supply_movements(item_id,batch_id,consumption_id,movement_type,quantity,unit_cost,movement_date,barber_id,actor_id,notes)
    values(p_item_id,v_batch.id,v_id,'consumption',v_take,v_batch.unit_cost,p_consumption_date,v_barber,v_actor,p_notes);
    v_remaining := v_remaining-v_take;
  end loop;
  if v_remaining > 0 then raise exception 'Estoque insuficiente'; end if;
  return v_id;
end; $$;

create or replace function public.reverse_supply_consumption(p_consumption_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := (select auth.uid()); v_consumption record; v_allocation record;
begin
  if not (public.has_role(v_actor, 'admin'::public.app_role) or public.has_role(v_actor, 'gestor'::public.app_role)) then raise exception 'Acesso negado'; end if;
  select * into v_consumption from public.supply_consumptions where id=p_consumption_id for update;
  if v_consumption.id is null or v_consumption.status='reversed' then raise exception 'Consumo inexistente ou já estornado'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'Informe o motivo'; end if;
  for v_allocation in select * from public.supply_consumption_allocations where consumption_id=p_consumption_id loop
    update public.supply_batches set quantity_remaining=quantity_remaining+v_allocation.quantity where id=v_allocation.batch_id;
    insert into public.supply_movements(item_id,batch_id,consumption_id,movement_type,quantity,unit_cost,movement_date,barber_id,actor_id,notes)
    values(v_consumption.item_id,v_allocation.batch_id,p_consumption_id,'reversal',v_allocation.quantity,v_allocation.unit_cost,current_date,v_consumption.barber_id,v_actor,p_reason);
  end loop;
  update public.supply_consumptions set status='reversed',reversed_by=v_actor,reversed_at=now(),reversal_reason=p_reason where id=p_consumption_id;
end; $$;

revoke all on function public.get_supply_stock(), public.create_supply_batch(uuid,numeric,numeric,date,date,text,text,text), public.record_supply_consumption(uuid,numeric,date,text,uuid,uuid), public.reverse_supply_consumption(uuid,text) from public, anon;
grant execute on function public.get_supply_stock(), public.create_supply_batch(uuid,numeric,numeric,date,date,text,text,text), public.record_supply_consumption(uuid,numeric,date,text,uuid,uuid), public.reverse_supply_consumption(uuid,text) to authenticated;

insert into public.site_config(config_key,config_value) values('supply_inventory', jsonb_build_object('whatsapp_enabled',true,'expiry_warning_days',15))
on conflict(config_key) do nothing;

alter publication supabase_realtime add table public.supply_items, public.supply_batches, public.supply_consumptions, public.supply_movements;

create or replace function private.invoke_whatsapp_supply_alerts()
returns void language plpgsql security definer set search_path = '' as $$
declare v_token text;
begin
  select decrypted_secret into v_token from vault.decrypted_secrets where name='referral_cron_anon_key' limit 1;
  if nullif(v_token,'') is null then raise exception 'Token do cron não configurado'; end if;
  perform net.http_post(
    url := 'https://wabefmgfsatlusevxyfo.supabase.co/functions/v1/whatsapp-supply-alerts',
    headers := jsonb_build_object('Content-Type','application/json','apikey',v_token,'Authorization','Bearer '||v_token),
    body := '{}'::jsonb, timeout_milliseconds := 30000
  );
end; $$;
revoke all on function private.invoke_whatsapp_supply_alerts() from public, anon, authenticated;

do $$ declare v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname='whatsapp-supply-alerts-daily';
  if v_jobid is null then
    perform cron.schedule('whatsapp-supply-alerts-daily','30 11 * * *','select private.invoke_whatsapp_supply_alerts();');
  else
    perform cron.alter_job(job_id:=v_jobid,schedule:='30 11 * * *',active:=true);
  end if;
end $$;
