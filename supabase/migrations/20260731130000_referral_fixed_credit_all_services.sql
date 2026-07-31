-- Referral credits are monetary caps, calculated from a configurable R$ 25.00 base.
-- A 50% campaign gives up to R$ 12.50; 100% gives up to R$ 25.00.

alter table public.referral_coupons
  add column if not exists discount_amount_limit numeric(10,2);

alter table public.referral_coupons
  drop constraint if exists referral_coupons_discount_amount_limit_check;

alter table public.referral_coupons
  add constraint referral_coupons_discount_amount_limit_check
  check (discount_amount_limit is null or discount_amount_limit > 0);

-- Preserve existing earned coupons, converting the former 50% haircut benefit
-- into its new monetary equivalent based on the R$ 25.00 campaign base.
update public.referral_coupons
set discount_amount_limit = round(25 * discount_percent / 100, 2)
where discount_amount_limit is null;

update public.site_config
set config_value = coalesce(config_value, '{}'::jsonb) || jsonb_build_object(
  'eligible_service_id', null,
  'credit_base_amount', 25,
  'minimum_qualifying_amount', 25,
  'redemption_scope', 'all_services'
)
where config_key = 'referral_program';

-- Update only the original default WhatsApp texts; administrator customizations remain untouched.
update public.site_config
set config_value = jsonb_set(
  config_value,
  '{text}',
  to_jsonb(E'🎁 *Você ganhou um crédito!*\n\nOlá, *{{clientName}}*! Seu amigo concluiu o primeiro atendimento elegível. Seu crédito de {{serviceName}} já está disponível para usar em qualquer serviço.')
)
where config_key = 'whatsapp_msg_referral_earned'
  and config_value->>'text' = E'🎁 *Você ganhou um cupom!*\n\nOlá, *{{clientName}}*! Seu amigo concluiu o primeiro atendimento. Seu cupom de {{serviceName}} de desconto já está disponível no painel.';

update public.site_config
set config_value = jsonb_set(
  config_value,
  '{text}',
  to_jsonb(E'⏳ *Seu crédito está perto de vencer!*\n\nOlá, *{{clientName}}*! Seu crédito de {{serviceName}} vence em {{appointmentDate}}. Agende qualquer serviço e aproveite.')
)
where config_key = 'whatsapp_msg_referral_expiring'
  and config_value->>'text' = E'⏳ *Seu cupom está perto de vencer!*\n\nOlá, *{{clientName}}*! Seu cupom de {{serviceName}} de desconto vence em {{appointmentDate}}. Agende seu corte e aproveite.';

create or replace function public.complete_appointment_with_referral(
  p_appointment_id uuid,
  p_payments jsonb,
  p_photo_url text default null,
  p_coupon_id uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_apt appointments%rowtype;
  v_price numeric(10,2);
  v_discount numeric(10,2) := 0;
  v_final numeric(10,2);
  v_paid numeric(10,2);
  v_coupon referral_coupons%rowtype;
  v_cfg jsonb;
  v_main_method text;
  v_ref referrals%rowtype;
  v_days integer;
  v_percent numeric;
  v_credit_base numeric(10,2);
  v_minimum_qualifying_amount numeric(10,2);
  v_coupon_limit numeric(10,2);
  v_basis text;
  v_is_staff boolean;
  v_is_barber boolean;
begin
  select a.* into v_apt from appointments a where a.id=p_appointment_id for update;
  if not found then raise exception 'Agendamento não encontrado'; end if;

  select public.is_referral_staff(), exists(
    select 1 from barbers b where b.id=v_apt.barber_id and b.user_id=auth.uid()
  ) into v_is_staff,v_is_barber;
  if not coalesce(v_is_staff,false) and not coalesce(v_is_barber,false) then
    raise exception 'Sem permissão para concluir este atendimento';
  end if;

  if v_apt.status='completed' then
    return jsonb_build_object('success',true,'idempotent',true,'final_price',v_apt.final_price);
  end if;

  select price into v_price from services where id=v_apt.service_id;
  if v_price is null or v_price <= 0 then raise exception 'Serviço inválido para conclusão'; end if;

  select config_value into v_cfg from site_config where config_key='referral_program';
  v_percent := least(100, greatest(0, coalesce((v_cfg->>'discount_percent')::numeric, 50)));
  v_days := greatest(1, coalesce((v_cfg->>'validity_days')::integer, 90));
  v_credit_base := greatest(0, coalesce((v_cfg->>'credit_base_amount')::numeric, 25));
  v_minimum_qualifying_amount := greatest(0, coalesce((v_cfg->>'minimum_qualifying_amount')::numeric, 25));
  v_basis := case when v_cfg->>'commission_basis'='original' then 'original' else 'final' end;

  perform public.expire_referral_coupons();

  if p_coupon_id is not null then
    if coalesce((v_cfg->>'enabled')::boolean,false) is not true then
      raise exception 'Programa de indicação inativo';
    end if;

    select * into v_coupon from referral_coupons where id=p_coupon_id for update;
    if not found or v_coupon.owner_id<>v_apt.client_id or v_coupon.status<>'available' or v_coupon.expires_at<=now() then
      raise exception 'Cupom inválido ou expirado';
    end if;

    v_coupon_limit := coalesce(
      v_coupon.discount_amount_limit,
      round(v_credit_base * v_coupon.discount_percent / 100, 2)
    );
    if v_coupon_limit <= 0 then raise exception 'Cupom sem crédito disponível'; end if;
    v_discount := least(v_price, v_coupon_limit);
  end if;

  v_final := greatest(v_price-v_discount,0);
  if jsonb_typeof(coalesce(p_payments, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_payments) = 0
     or exists (
       select 1 from jsonb_array_elements(p_payments) x
       where coalesce((x->>'amount')::numeric, 0) <= 0
          or x->>'method' not in ('pix','dinheiro','cartao')
     ) then
    raise exception 'Pagamentos inválidos';
  end if;

  select coalesce(sum((x->>'amount')::numeric),0),
         (array_agg(x->>'method' order by (x->>'amount')::numeric desc))[1]
    into v_paid,v_main_method
    from jsonb_array_elements(coalesce(p_payments,'[]'::jsonb)) x;

  if v_final<=0 or abs(v_paid-v_final)>0.01 then
    raise exception 'Pagamentos devem totalizar R$ %', v_final;
  end if;
  if v_main_method not in ('pix','dinheiro','cartao') then
    raise exception 'Forma de pagamento inválida';
  end if;

  delete from appointment_payments where appointment_id=p_appointment_id;
  insert into appointment_payments(appointment_id,payment_method,amount)
    select p_appointment_id,x->>'method',(x->>'amount')::numeric
    from jsonb_array_elements(p_payments) x;

  update appointments set
    status='completed',
    photo_url=p_photo_url,
    payment_method=v_main_method,
    referral_coupon_id=p_coupon_id,
    original_price=v_price,
    discount_amount=v_discount,
    final_price=v_final,
    commission_basis=v_basis
  where id=p_appointment_id;

  if p_coupon_id is not null then
    update referral_coupons
    set status='used',used_at=now(),used_appointment_id=p_appointment_id
    where id=p_coupon_id;
  end if;

  select * into v_ref
  from referrals
  where referred_id=v_apt.client_id and status='pending'
  for update;

  if found then
    -- A referral is decided by the referred client's first paid completion only.
    if v_price >= v_minimum_qualifying_amount
       and v_paid >= v_minimum_qualifying_amount
       and not exists (
         select 1 from appointments prior
         where prior.client_id = v_apt.client_id
           and prior.status = 'completed'
           and prior.id <> p_appointment_id
       ) then
      update referrals
      set status='qualified',qualified_at=now(),qualifying_appointment_id=p_appointment_id
      where id=v_ref.id;

      insert into referral_coupons(
        owner_id,referral_id,discount_percent,discount_amount_limit,expires_at
      ) values(
        v_ref.referrer_id,
        v_ref.id,
        v_percent,
        round(v_credit_base * v_percent / 100, 2),
        now()+make_interval(days=>v_days)
      ) on conflict(referral_id) do nothing;
    else
      update referrals set status='cancelled' where id=v_ref.id;
    end if;
  end if;

  return jsonb_build_object(
    'success',true,
    'original_price',v_price,
    'discount_amount',v_discount,
    'final_price',v_final,
    'coupon_generated',found
  );
end; $$;

grant execute on function public.complete_appointment_with_referral(uuid,jsonb,text,uuid) to authenticated;
