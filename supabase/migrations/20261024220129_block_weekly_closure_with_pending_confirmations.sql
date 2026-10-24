-- Stop weekly closures while services or product sales still need barber action.
create or replace function public.guard_weekly_financial_closure_pending_confirmations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pending_services integer;
  v_pending_products integer;
begin
  select count(*)::integer
    into v_pending_services
  from public.appointments appointment
  where appointment.barber_id = new.barber_id
    and appointment.appointment_date between new.week_start and new.week_end
    and appointment.status in ('pending', 'confirmed');

  select count(*)::integer
    into v_pending_products
  from public.product_sales sale
  where sale.barber_id = new.barber_id
    and sale.sale_date between new.week_start and new.week_end
    and sale.status = 'pending';

  if v_pending_services > 0 or v_pending_products > 0 then
    raise exception using
      errcode = '23514',
      message = format(
        'Fechamento bloqueado: %s serviço(s) aguardam finalização e %s venda(s) de produto aguardam confirmação do barbeiro.',
        v_pending_services,
        v_pending_products
      );
  end if;

  return new;
end;
$$;

revoke all on function public.guard_weekly_financial_closure_pending_confirmations() from public, anon, authenticated;

drop trigger if exists weekly_closure_pending_confirmations_guard
  on public.weekly_financial_closures;
create trigger weekly_closure_pending_confirmations_guard
before insert on public.weekly_financial_closures
for each row
execute function public.guard_weekly_financial_closure_pending_confirmations();

create index if not exists appointments_weekly_closure_pending_idx
  on public.appointments (barber_id, appointment_date)
  where status in ('pending', 'confirmed');

create index if not exists product_sales_weekly_closure_pending_idx
  on public.product_sales (barber_id, sale_date)
  where status = 'pending';

comment on function public.guard_weekly_financial_closure_pending_confirmations() is
  'Rejects weekly closure insertion when appointments or product sales in the period still await barber confirmation/finalization.';
