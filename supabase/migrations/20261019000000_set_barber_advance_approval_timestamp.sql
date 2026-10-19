-- Use the database clock as the source of truth for advance approval times.
create or replace function public.set_barber_advance_approval_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_approval_time timestamptz;
begin
  if new.status = 'approved' then
    if tg_op = 'INSERT' then
      v_approval_time := statement_timestamp();
    elsif old.status is distinct from 'approved' then
      v_approval_time := statement_timestamp();
    end if;

    if v_approval_time is not null then
      new.approved_at := v_approval_time;
      new.digital_signature := coalesce(new.digital_signature, '{}'::jsonb)
        || jsonb_build_object('approved_at', v_approval_time);
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.set_barber_advance_approval_timestamp() from public, anon, authenticated;

drop trigger if exists set_barber_advance_approval_timestamp on public.barber_advances;
create trigger set_barber_advance_approval_timestamp
before insert or update on public.barber_advances
for each row
execute function public.set_barber_advance_approval_timestamp();

comment on function public.set_barber_advance_approval_timestamp() is
  'Sets approved_at and digital_signature.approved_at from the database clock when a barber advance becomes approved.';
