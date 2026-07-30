-- Step 5: fix mutable search paths and hide trigger-only functions from RPC.

alter function public.handle_product_sale_confirmation()
  set search_path = public, pg_temp;
alter function public.handle_updated_at()
  set search_path = public, pg_temp;
alter function public.has_role(text, uuid)
  set search_path = public, pg_temp;
alter function public.set_current_timestamp_barber_advances()
  set search_path = public, pg_temp;
alter function public.set_operational_expenses_updated_at()
  set search_path = public, pg_temp;
alter function public.update_barber_commissions_updated_at()
  set search_path = public, pg_temp;
alter function public.update_barber_fixed_commissions_updated_at()
  set search_path = public, pg_temp;
alter function public.update_barber_product_commissions_updated_at()
  set search_path = public, pg_temp;
alter function public.update_product_sales_updated_at()
  set search_path = public, pg_temp;
alter function public.update_updated_at_column()
  set search_path = public, pg_temp;

revoke all on function public.handle_product_sale_confirmation() from public, anon, authenticated;
revoke all on function public.handle_updated_at() from public, anon, authenticated;
revoke all on function public.set_current_timestamp_barber_advances() from public, anon, authenticated;
revoke all on function public.set_operational_expenses_updated_at() from public, anon, authenticated;
revoke all on function public.update_barber_commissions_updated_at() from public, anon, authenticated;
revoke all on function public.update_barber_fixed_commissions_updated_at() from public, anon, authenticated;
revoke all on function public.update_barber_product_commissions_updated_at() from public, anon, authenticated;
revoke all on function public.update_product_sales_updated_at() from public, anon, authenticated;
revoke all on function public.update_updated_at_column() from public, anon, authenticated;

revoke all on function public.has_role(text, uuid) from public, anon;
grant execute on function public.has_role(text, uuid) to authenticated, service_role;
