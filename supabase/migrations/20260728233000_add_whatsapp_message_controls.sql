update public.site_config
set config_value = case
  when config_value ? 'enabled' then config_value
  else config_value || '{"enabled":true}'::jsonb
end
where config_key in (
  'whatsapp_msg_created',
  'whatsapp_msg_updated',
  'whatsapp_msg_cancelled',
  'whatsapp_msg_reminder',
  'whatsapp_msg_completed',
  'whatsapp_msg_barber_new_appointment',
  'whatsapp_msg_referral_earned',
  'whatsapp_msg_referral_expiring',
  'whatsapp_msg_inactive_client'
);

insert into public.site_config(config_key, config_value) values
  ('whatsapp_msg_referral_earned', jsonb_build_object('text', E'🎁 *Você ganhou um cupom!*\n\nOlá, *{{clientName}}*! Seu amigo concluiu o primeiro atendimento. Seu cupom de {{serviceName}} de desconto já está disponível no painel.', 'enabled', true)),
  ('whatsapp_msg_referral_expiring', jsonb_build_object('text', E'⏳ *Seu cupom está perto de vencer!*\n\nOlá, *{{clientName}}*! Seu cupom de {{serviceName}} de desconto vence em {{appointmentDate}}. Agende seu corte e aproveite.', 'enabled', true))
on conflict (config_key) do update
set config_value = case
  when public.site_config.config_value ? 'enabled' then public.site_config.config_value
  else public.site_config.config_value || '{"enabled":true}'::jsonb
end;
