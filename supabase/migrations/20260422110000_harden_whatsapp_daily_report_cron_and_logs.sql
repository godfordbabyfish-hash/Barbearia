create table if not exists public.whatsapp_report_logs (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('daily', 'weekly', 'monthly')),
  status text not null check (status in ('success', 'error', 'skipped')),
  phone_number text,
  period_start date,
  period_end date,
  gross_revenue numeric(12,2) not null default 0,
  net_profit numeric(12,2) not null default 0,
  roi numeric(8,2) not null default 0,
  goals_daily_pct numeric(8,2) not null default 0,
  goals_weekly_pct numeric(8,2) not null default 0,
  goals_monthly_pct numeric(8,2) not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_report_logs_created_at
  on public.whatsapp_report_logs(created_at desc);

create index if not exists idx_whatsapp_report_logs_type_created
  on public.whatsapp_report_logs(report_type, created_at desc);

alter table public.whatsapp_report_logs enable row level security;

drop policy if exists "Admins and gestores can view whatsapp report logs" on public.whatsapp_report_logs;
create policy "Admins and gestores can view whatsapp report logs"
  on public.whatsapp_report_logs
  for select
  using (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'gestor')
  );

drop policy if exists "Service role can insert whatsapp report logs" on public.whatsapp_report_logs;
create policy "Service role can insert whatsapp report logs"
  on public.whatsapp_report_logs
  for insert
  with check (auth.role() = 'service_role');

comment on table public.whatsapp_report_logs is 'Logs de execução e envio do relatório automático de WhatsApp.';

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.invoke_whatsapp_daily_report()
returns void
language plpgsql
security definer
as $$
declare
  supabase_url text := 'https://wabefmgfsatlusevxyfo.supabase.co';
  function_url text;
begin
  function_url := supabase_url || '/functions/v1/whatsapp-daily-report';

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
exception
  when others then
    raise warning 'Error invoking whatsapp-daily-report: %', sqlerrm;
end;
$$;

select cron.unschedule('whatsapp-daily-report-every-10-minutes');
select cron.schedule(
  'whatsapp-daily-report-every-10-minutes',
  '*/10 * * * *',
  'select public.invoke_whatsapp_daily_report();'
);
