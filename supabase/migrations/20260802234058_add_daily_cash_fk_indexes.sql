create index daily_cash_sessions_opened_by_idx
  on public.daily_cash_sessions (opened_by);
create index daily_cash_sessions_closed_by_idx
  on public.daily_cash_sessions (closed_by)
  where closed_by is not null;
create index daily_cash_movements_created_by_idx
  on public.daily_cash_movements (created_by);
