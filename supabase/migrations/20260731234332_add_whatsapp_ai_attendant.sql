-- Optional WhatsApp AI attendant.
-- API credentials are stored in Supabase Vault and are never exposed through site_config.

create table if not exists public.whatsapp_ai_conversations (
  phone text primary key,
  customer_name text,
  status text not null default 'active' check (status in ('active', 'human_requested', 'paused')),
  paused_until timestamptz,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_ai_messages (
  id uuid primary key default gen_random_uuid(),
  phone text not null references public.whatsapp_ai_conversations(phone) on delete cascade,
  external_message_id text,
  direction text not null check (direction in ('inbound', 'outbound')),
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null check (char_length(content) between 1 and 4000),
  delivery_status text not null default 'received' check (delivery_status in ('received', 'generated', 'sent', 'failed', 'ignored')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists whatsapp_ai_messages_external_id_uidx
  on public.whatsapp_ai_messages(external_message_id)
  where external_message_id is not null;

create index if not exists whatsapp_ai_messages_phone_created_idx
  on public.whatsapp_ai_messages(phone, created_at desc);

create index if not exists whatsapp_ai_conversations_status_idx
  on public.whatsapp_ai_conversations(status, last_message_at desc);

alter table public.whatsapp_ai_conversations enable row level security;
alter table public.whatsapp_ai_messages enable row level security;

drop policy if exists "Staff can read WhatsApp AI conversations" on public.whatsapp_ai_conversations;
create policy "Staff can read WhatsApp AI conversations"
on public.whatsapp_ai_conversations for select
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role in ('admin', 'gestor')
  )
);

drop policy if exists "Staff can read WhatsApp AI messages" on public.whatsapp_ai_messages;
create policy "Staff can read WhatsApp AI messages"
on public.whatsapp_ai_messages for select
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role in ('admin', 'gestor')
  )
);

insert into public.site_config(config_key, config_value)
values (
  'whatsapp_ai_attendant',
  jsonb_build_object(
    'enabled', false,
    'assistant_name', 'Raimunda',
    'model', 'gpt-5.6-luna',
    'booking_url', 'https://barbeariaraimundoss.vercel.app/',
    'max_history_messages', 12,
    'human_handoff_enabled', true,
    'handoff_message', 'Vou encaminhar sua conversa para nossa equipe. Assim que alguém estiver disponível, continuará o atendimento por aqui.',
    'prompt', 'Você é a atendente virtual da Barbearia Raimundos. Responda em português do Brasil, de forma simpática, breve e profissional. Use somente os dados oficiais fornecidos no contexto. Nunca invente preços, serviços, barbeiros, horários disponíveis, promoções ou agendamentos. Você não pode confirmar, criar, alterar ou cancelar agendamentos. Para agendar, forneça exclusivamente o link oficial. Se a informação não estiver no contexto, diga que não possui essa confirmação e ofereça atendimento humano. Não peça CPF completo, cartão, senha, código ou qualquer dado sensível. Quando o cliente solicitar uma pessoa, responda apenas com a mensagem de encaminhamento.'
  )
)
on conflict (config_key) do nothing;

create or replace function public.set_whatsapp_ai_api_key(p_api_key text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, vault
as $$
declare
  v_secret_id uuid;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'forbidden';
  end if;

  if p_api_key is null or char_length(trim(p_api_key)) < 20 then
    raise exception 'invalid_api_key';
  end if;

  select id into v_secret_id
  from vault.secrets
  where name = 'whatsapp_ai_openai_api_key'
  order by created_at desc
  limit 1;

  if v_secret_id is null then
    perform vault.create_secret(trim(p_api_key), 'whatsapp_ai_openai_api_key', 'OpenAI API key for WhatsApp AI attendant');
  else
    perform vault.update_secret(v_secret_id, trim(p_api_key), 'whatsapp_ai_openai_api_key', 'OpenAI API key for WhatsApp AI attendant');
  end if;
end;
$$;

create or replace function public.get_whatsapp_ai_api_key()
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, vault
as $$
declare
  v_secret text;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'forbidden';
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'whatsapp_ai_openai_api_key'
  order by created_at desc
  limit 1;

  return v_secret;
end;
$$;

create or replace function public.has_whatsapp_ai_api_key()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, vault
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return exists (
    select 1 from vault.secrets where name = 'whatsapp_ai_openai_api_key'
  );
end;
$$;

revoke all on function public.set_whatsapp_ai_api_key(text) from public, anon, authenticated;
revoke all on function public.get_whatsapp_ai_api_key() from public, anon, authenticated;
revoke all on function public.has_whatsapp_ai_api_key() from public, anon, authenticated;
grant execute on function public.set_whatsapp_ai_api_key(text) to service_role;
grant execute on function public.get_whatsapp_ai_api_key() to service_role;
grant execute on function public.has_whatsapp_ai_api_key() to service_role;

revoke all on public.whatsapp_ai_conversations from anon;
revoke all on public.whatsapp_ai_messages from anon;
grant select on public.whatsapp_ai_conversations to authenticated;
grant select on public.whatsapp_ai_messages to authenticated;
grant all on public.whatsapp_ai_conversations to service_role;
grant all on public.whatsapp_ai_messages to service_role;
