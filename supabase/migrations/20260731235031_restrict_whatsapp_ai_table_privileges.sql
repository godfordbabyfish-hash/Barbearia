revoke all on public.whatsapp_ai_conversations from authenticated;
revoke all on public.whatsapp_ai_messages from authenticated;
grant select on public.whatsapp_ai_conversations to authenticated;
grant select on public.whatsapp_ai_messages to authenticated;
