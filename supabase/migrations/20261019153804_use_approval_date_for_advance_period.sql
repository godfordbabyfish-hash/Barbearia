-- Rebuild historical approval timestamps from the immutable database audit log.
with approval_events as (
  select distinct on (log.record_id)
    log.record_id::uuid as advance_id,
    log.occurred_at as approved_at
  from public.admin_audit_logs log
  where log.table_name = 'barber_advances'
    and log.action = 'update'
    and log.old_data->>'status' = 'pending'
    and log.new_data->>'status' = 'approved'
  order by log.record_id, log.occurred_at desc
)
update public.barber_advances advance
set approved_at = event.approved_at,
    digital_signature = coalesce(advance.digital_signature, '{}'::jsonb)
      || jsonb_build_object('approved_at', event.approved_at)
from approval_events event
where advance.id = event.advance_id
  and advance.status = 'approved'
  and advance.approved_at is distinct from event.approved_at;

-- Keep the date filter efficient for period reports and barber dashboards.
create index if not exists idx_barber_advances_approved_at
  on public.barber_advances (approved_at)
  where status = 'approved';

-- Preserve the existing preview calculation, but replace advance totals with
-- totals grouped by the approval instant in the business timezone.
alter function public.preview_managerial_financial_closure(date, date)
  rename to preview_managerial_financial_closure_effective_date_legacy;

revoke all on function public.preview_managerial_financial_closure_effective_date_legacy(date, date)
  from public, anon, authenticated;

create function public.preview_managerial_financial_closure(
  p_period_start date,
  p_period_end date
)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
  v_advance_total numeric;
  v_advance_count integer;
begin
  if v_user_id is null or not (
    public.has_role(v_user_id, 'admin'::public.app_role)
    or public.has_role(v_user_id, 'gestor'::public.app_role)
  ) then
    raise exception 'Acesso restrito à gestão.';
  end if;
  if p_period_start is null or p_period_end is null or p_period_start > p_period_end
     or p_period_end - p_period_start > 366 then
    raise exception 'Período inválido.';
  end if;

  v_result := public.preview_managerial_financial_closure_effective_date_legacy(
    p_period_start,
    p_period_end
  );

  select
    coalesce(sum(advance.amount), 0)::numeric,
    count(*)::integer
  into v_advance_total, v_advance_count
  from public.barber_advances advance
  where advance.status = 'approved'
    and advance.approved_at >= (p_period_start::timestamp at time zone 'America/Sao_Paulo')
    and advance.approved_at < ((p_period_end + 1)::timestamp at time zone 'America/Sao_Paulo');

  v_result := jsonb_set(v_result, '{approved_advances}', to_jsonb(round(v_advance_total, 2)), true);
  v_result := jsonb_set(v_result, '{advance_count}', to_jsonb(v_advance_count), true);
  return v_result;
end;
$$;

revoke all on function public.preview_managerial_financial_closure(date, date) from public, anon;
grant execute on function public.preview_managerial_financial_closure(date, date) to authenticated, service_role;

comment on function public.preview_managerial_financial_closure(date, date) is
  'Previews management period totals; approved advances are grouped by database approval timestamp in America/Sao_Paulo.';
