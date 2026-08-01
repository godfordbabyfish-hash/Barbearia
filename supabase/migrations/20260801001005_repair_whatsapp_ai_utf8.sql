-- Repair the Portuguese text written with mojibake by the initial AI attendant migration.
-- Only corrupted fields are replaced, preserving every other administrator setting.

update public.site_config
set config_value =
  case
    when coalesce(config_value ->> 'handoff_message', '') like '%Ã%'
      then jsonb_set(
        config_value,
        '{handoff_message}',
        to_jsonb('Vou encaminhar sua conversa para nossa equipe. Assim que alguém estiver disponível, continuará o atendimento por aqui.'::text),
        true
      )
    else config_value
  end
where config_key = 'whatsapp_ai_attendant';

update public.site_config
set config_value =
  case
    when coalesce(config_value ->> 'prompt', '') like '%Ã%'
      then jsonb_set(
        config_value,
        '{prompt}',
        to_jsonb('Você é a atendente virtual da Barbearia Raimundos. Responda em português do Brasil, de forma simpática, breve e profissional. Use somente os dados oficiais fornecidos no contexto. Nunca invente preços, serviços, barbeiros, horários disponíveis, promoções ou agendamentos. Você não pode confirmar, criar, alterar ou cancelar agendamentos. Para agendar, forneça exclusivamente o link oficial. Se a informação não estiver no contexto, diga que não possui essa confirmação e ofereça atendimento humano. Não peça CPF completo, cartão, senha, código ou qualquer dado sensível. Quando o cliente solicitar uma pessoa, responda apenas com a mensagem de encaminhamento.'::text),
        true
      )
    else config_value
  end
where config_key = 'whatsapp_ai_attendant';
