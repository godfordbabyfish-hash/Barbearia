create or replace function public.validate_managerial_closure_period()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.period_end >= (current_timestamp at time zone 'America/Sao_Paulo')::date then
    raise exception 'O fechamento definitivo só pode ser salvo após o término do período.';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_managerial_closure_period() from public, anon, authenticated;

create trigger managerial_financial_closures_completed_period
before insert on public.managerial_financial_closures
for each row execute function public.validate_managerial_closure_period();
