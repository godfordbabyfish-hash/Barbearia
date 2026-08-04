create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null check (action in ('insert', 'update', 'delete')),
  module text not null,
  table_name text not null,
  record_id text,
  changed_fields text[] not null default '{}',
  old_data jsonb,
  new_data jsonb,
  transaction_id bigint not null default txid_current(),
  source text not null default 'panel'
);

create index admin_audit_logs_occurred_idx on public.admin_audit_logs (occurred_at desc);
create index admin_audit_logs_actor_idx on public.admin_audit_logs (actor_id, occurred_at desc);
create index admin_audit_logs_module_idx on public.admin_audit_logs (module, occurred_at desc);
create index admin_audit_logs_table_record_idx on public.admin_audit_logs (table_name, record_id, occurred_at desc);
create index admin_audit_logs_action_idx on public.admin_audit_logs (action, occurred_at desc);

alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from public, anon, authenticated;
grant select on public.admin_audit_logs to authenticated;
grant all on public.admin_audit_logs to service_role;

create policy admin_audit_logs_management_select
on public.admin_audit_logs for select to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'gestor'))
);

create or replace function private.redact_audit_json(p_value jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if p_value is null then return null; end if;
  if jsonb_typeof(p_value) = 'object' then
    select coalesce(jsonb_object_agg(entry.key,
      case
        when lower(entry.key) ~ '(password|passwd|token|secret|api.?key|service.?role|authorization|credential)'
          then '"[PROTEGIDO]"'::jsonb
        else private.redact_audit_json(entry.value)
      end
    ), '{}'::jsonb) into v_result
    from jsonb_each(p_value) entry;
    return v_result;
  elsif jsonb_typeof(p_value) = 'array' then
    select coalesce(jsonb_agg(private.redact_audit_json(item.value)), '[]'::jsonb)
    into v_result from jsonb_array_elements(p_value) item;
    return v_result;
  end if;
  return p_value;
end;
$$;

create or replace function public.capture_admin_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_role text;
  v_old jsonb;
  v_new jsonb;
  v_fields text[] := '{}';
  v_record_id text;
  v_module text := coalesce(tg_argv[0], tg_table_name);
begin
  if v_actor is not null then
    select roles.role::text into v_role
    from public.user_roles roles
    where roles.user_id = v_actor and roles.role::text in ('admin', 'gestor')
    order by case roles.role::text when 'admin' then 1 else 2 end
    limit 1;
    if v_role is null then
      if tg_op = 'DELETE' then return old; else return new; end if;
    end if;
  else
    v_role := 'system';
  end if;

  v_old := case when tg_op in ('UPDATE', 'DELETE') then private.redact_audit_json(to_jsonb(old)) end;
  v_new := case when tg_op in ('INSERT', 'UPDATE') then private.redact_audit_json(to_jsonb(new)) end;
  v_record_id := coalesce(v_new->>'id', v_old->>'id', v_new->>'config_key', v_old->>'config_key');

  if tg_op = 'INSERT' then
    select coalesce(array_agg(item.value order by item.value), '{}') into v_fields
    from jsonb_object_keys(v_new) as item(value);
  elsif tg_op = 'DELETE' then
    select coalesce(array_agg(item.value order by item.value), '{}') into v_fields
    from jsonb_object_keys(v_old) as item(value);
  else
    select coalesce(array_agg(keys.key order by keys.key), '{}') into v_fields
    from (
      select item.value as key from jsonb_object_keys(coalesce(v_old, '{}'::jsonb)) as item(value)
      union select item.value as key from jsonb_object_keys(coalesce(v_new, '{}'::jsonb)) as item(value)
    ) keys
    where v_old->keys.key is distinct from v_new->keys.key;
    if cardinality(v_fields) = 0 then return new; end if;
  end if;

  insert into public.admin_audit_logs (
    actor_id, actor_role, action, module, table_name, record_id,
    changed_fields, old_data, new_data, source
  ) values (
    v_actor, v_role, lower(tg_op), v_module, tg_table_name, v_record_id,
    v_fields, v_old, v_new, case when v_actor is null then 'system' else 'panel' end
  );
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

revoke all on function private.redact_audit_json(jsonb) from public, anon, authenticated;
revoke all on function public.capture_admin_audit() from public, anon, authenticated;

do $$
declare
  v_target record;
begin
  for v_target in
    select * from (values
      ('profiles', 'Usuários'), ('user_roles', 'Usuários'), ('barbers', 'Equipe'),
      ('services', 'Serviços'), ('products', 'Produtos'),
      ('appointments', 'Agendamentos'), ('appointment_payments', 'Financeiro'),
      ('product_sales', 'Vendas'), ('barber_advances', 'Vales'),
      ('barber_commissions', 'Comissões'), ('barber_fixed_commissions', 'Comissões'),
      ('barber_product_commissions', 'Comissões'),
      ('barber_schedules', 'Horários'), ('barber_breaks', 'Horários'),
      ('operational_expenses', 'Despesas'), ('expense_recurrence_rules', 'Despesas'),
      ('daily_cash_sessions', 'Caixa'), ('daily_cash_movements', 'Caixa'),
      ('weekly_financial_closures', 'Fechamentos'), ('managerial_financial_closures', 'Fechamentos'),
      ('referrals', 'Indicações'), ('referral_coupons', 'Indicações'),
      ('supply_items', 'Estoque'), ('supply_batches', 'Estoque'),
      ('supply_consumptions', 'Estoque'), ('supply_movements', 'Estoque'),
      ('site_config', 'Configurações')
    ) as targets(table_name, module)
  loop
    if to_regclass(format('public.%I', v_target.table_name)) is not null then
      execute format('drop trigger if exists %I on public.%I', 'admin_audit_' || v_target.table_name, v_target.table_name);
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.capture_admin_audit(%L)',
        'admin_audit_' || v_target.table_name, v_target.table_name, v_target.module
      );
    end if;
  end loop;
end;
$$;

comment on table public.admin_audit_logs is 'Immutable centralized audit trail for administrative and system changes.';
comment on column public.admin_audit_logs.changed_fields is 'Columns changed by the administrative action.';

alter publication supabase_realtime add table public.admin_audit_logs;
