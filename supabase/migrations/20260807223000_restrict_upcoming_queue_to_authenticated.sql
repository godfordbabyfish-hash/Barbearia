revoke all on function public.get_public_upcoming_queue() from public;
revoke all on function public.get_public_upcoming_queue() from anon, authenticated;
grant execute on function public.get_public_upcoming_queue() to authenticated;

comment on function public.get_public_upcoming_queue() is
  'Fila futura informativa para usuários autenticados. Expõe somente primeiro nome, serviço, data e horário; não retorna dados pessoais de contato.';
