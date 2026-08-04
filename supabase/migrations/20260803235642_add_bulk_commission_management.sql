-- Atomic bulk fill for service and product commissions.

create or replace function public.apply_bulk_commission(
  p_kind text,
  p_percentage numeric,
  p_barber_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_affected integer := 0;
  v_barber_count integer := 0;
  v_item_count integer := 0;
begin
  if v_user_id is null or not (
    public.has_role(v_user_id, 'admin') or public.has_role(v_user_id, 'gestor')
  ) then
    raise exception 'Acesso restrito a administradores e gestores.';
  end if;

  if p_kind not in ('service', 'product') then
    raise exception 'Tipo de comissao invalido.';
  end if;
  if p_percentage is null or p_percentage < 0 or p_percentage > 100 then
    raise exception 'O percentual deve estar entre 0 e 100.';
  end if;
  if p_barber_id is not null and not exists (
    select 1 from public.barbers barber
    where barber.id = p_barber_id and coalesce(barber.visible, true)
  ) then
    raise exception 'Barbeiro nao encontrado ou inativo.';
  end if;

  select count(*) into v_barber_count
  from public.barbers barber
  where coalesce(barber.visible, true)
    and (p_barber_id is null or barber.id = p_barber_id);

  if p_kind = 'service' then
    select count(*) into v_item_count
    from public.services service where coalesce(service.visible, true);

    insert into public.barber_commissions (
      barber_id, service_id, commission_percentage, created_at, updated_at
    )
    select barber.id, service.id, round(p_percentage, 2), now(), now()
    from public.barbers barber
    cross join public.services service
    where coalesce(barber.visible, true)
      and coalesce(service.visible, true)
      and (p_barber_id is null or barber.id = p_barber_id)
    on conflict (barber_id, service_id) do update set
      commission_percentage = excluded.commission_percentage,
      updated_at = now();
    get diagnostics v_affected = row_count;
  else
    select count(*) into v_item_count
    from public.products product where coalesce(product.visible, true);

    insert into public.barber_product_commissions (
      barber_id, product_id, commission_percentage, created_at, updated_at
    )
    select barber.id, product.id, round(p_percentage, 2), now(), now()
    from public.barbers barber
    cross join public.products product
    where coalesce(barber.visible, true)
      and coalesce(product.visible, true)
      and (p_barber_id is null or barber.id = p_barber_id)
    on conflict (barber_id, product_id) do update set
      commission_percentage = excluded.commission_percentage,
      updated_at = now();
    get diagnostics v_affected = row_count;
  end if;

  return jsonb_build_object(
    'kind', p_kind,
    'percentage', round(p_percentage, 2),
    'barber_count', v_barber_count,
    'item_count', v_item_count,
    'affected_rows', v_affected,
    'scope', case when p_barber_id is null then 'all' else 'barber' end
  );
end;
$$;

revoke all on function public.apply_bulk_commission(text, numeric, uuid) from public, anon;
grant execute on function public.apply_bulk_commission(text, numeric, uuid) to authenticated, service_role;

comment on function public.apply_bulk_commission(text, numeric, uuid) is
  'Fills all visible service or product commissions atomically for every active barber or one selected barber.';
