-- Tabela de despesas operacionais para uso no Financeiro e relatório diário
create table if not exists public.operational_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  category text not null default 'Outros',
  expense_date date not null default current_date,
  notes text,
  status text not null default 'confirmed',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_operational_expenses_date
  on public.operational_expenses(expense_date desc);

create index if not exists idx_operational_expenses_status_date
  on public.operational_expenses(status, expense_date desc);

alter table public.operational_expenses enable row level security;

drop policy if exists "Admins and gestores can view operational expenses" on public.operational_expenses;
create policy "Admins and gestores can view operational expenses"
  on public.operational_expenses
  for select
  using (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'gestor')
  );

drop policy if exists "Admins and gestores can insert operational expenses" on public.operational_expenses;
create policy "Admins and gestores can insert operational expenses"
  on public.operational_expenses
  for insert
  with check (
    (
      public.has_role(auth.uid(), 'admin')
      or public.has_role(auth.uid(), 'gestor')
    )
    and (created_by is null or created_by = auth.uid())
  );

drop policy if exists "Admins and gestores can update operational expenses" on public.operational_expenses;
create policy "Admins and gestores can update operational expenses"
  on public.operational_expenses
  for update
  using (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'gestor')
  )
  with check (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'gestor')
  );

drop policy if exists "Admins and gestores can delete operational expenses" on public.operational_expenses;
create policy "Admins and gestores can delete operational expenses"
  on public.operational_expenses
  for delete
  using (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'gestor')
  );

create or replace function public.set_operational_expenses_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_operational_expenses_updated_at on public.operational_expenses;
create trigger trg_operational_expenses_updated_at
before update on public.operational_expenses
for each row
execute function public.set_operational_expenses_updated_at();

comment on table public.operational_expenses is 'Despesas operacionais registradas no painel financeiro.';
comment on column public.operational_expenses.amount is 'Valor da despesa em BRL.';
comment on column public.operational_expenses.expense_date is 'Data de competência da despesa.';

-- Configuração padrão do relatório diário no WhatsApp
insert into public.site_config (config_key, config_value)
values (
  'whatsapp_daily_report',
  jsonb_build_object(
    'enabled', false,
    'schedule_time', '22:00',
    'phone_number', '',
    'include_insights', true,
    'include_roi', true,
    'goals', jsonb_build_object(
      'daily_gross_revenue', 0,
      'weekly_gross_revenue', 0,
      'monthly_gross_revenue', 0,
      'week_starts_on', 'monday'
    )
  )
)
on conflict (config_key) do nothing;

-- IMPORTANTE:
-- Para ativar envio automático, configure a função invoke_whatsapp_daily_report()
-- com a service_role key e depois agende o cron.
create or replace function public.invoke_whatsapp_daily_report()
returns void
language plpgsql
security definer
as $$
declare
  supabase_url text := 'https://wabefmgfsatlusevxyfo.supabase.co';
  function_url text;
  service_role_key text := 'YOUR_SERVICE_ROLE_KEY';
begin
  function_url := supabase_url || '/functions/v1/whatsapp-daily-report';

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  );
exception
  when others then
    raise warning 'Error invoking whatsapp-daily-report: %', sqlerrm;
end;
$$;

-- Rodar a cada 10 minutos; a edge function decide se já chegou no horário configurado.
select cron.unschedule('whatsapp-daily-report-every-10-minutes');
select cron.schedule(
  'whatsapp-daily-report-every-10-minutes',
  '*/10 * * * *',
  'select public.invoke_whatsapp_daily_report();'
);
