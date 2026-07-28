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
revoke all on public.whatsapp_report_logs from public, anon;
grant select on public.whatsapp_report_logs to authenticated;

drop policy if exists "Admins and gestores can view whatsapp report logs" on public.whatsapp_report_logs;
create policy "Admins and gestores can view whatsapp report logs"
on public.whatsapp_report_logs for select to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'gestor'))
);
