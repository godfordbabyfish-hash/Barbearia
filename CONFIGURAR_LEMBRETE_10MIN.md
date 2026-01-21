# Configurar Lembrete de 10 Minutos Antes do Agendamento

## ✅ O que já está configurado:

1. ✅ Edge Function `whatsapp-reminder` criada e deployada
2. ✅ Migration para adicionar coluna `reminder_sent` na tabela `appointments`
3. ✅ Lógica para verificar agendamentos 10 minutos antes do horário

## 📋 Passos para ativar o cron job:

### 1. Aplicar a migration no banco de dados

Execute a migration no Supabase SQL Editor:

```sql
-- Arquivo: supabase/migrations/20260120000000_add_reminder_sent.sql
```

Isso adicionará a coluna `reminder_sent` na tabela `appointments`.

### 2. Configurar o cron job

Acesse o **Supabase Dashboard** > **SQL Editor** e execute o seguinte SQL:

**IMPORTANTE:** Substitua `YOUR_SERVICE_ROLE_KEY` pela sua chave de service role que você encontra em:
**Supabase Dashboard** > **Settings** > **API** > **service_role key**

```sql
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Função para chamar a Edge Function de lembrete
CREATE OR REPLACE FUNCTION invoke_whatsapp_reminder()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT := 'https://wabefmgfsatlusevxyfo.supabase.co';
  function_url TEXT;
  service_role_key TEXT := 'YOUR_SERVICE_ROLE_KEY'; -- ⚠️ SUBSTITUA AQUI!
BEGIN
  function_url := supabase_url || '/functions/v1/whatsapp-reminder';
  
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error invoking reminder function: %', SQLERRM;
END;
$$;

-- Agendar o cron job para executar a cada minuto
SELECT cron.schedule(
  'whatsapp-reminder-every-minute',
  '* * * * *', -- A cada minuto (formato cron: minuto hora dia mês dia-da-semana)
  $$
  SELECT invoke_whatsapp_reminder();
  $$
);
```

### 3. Verificar se o cron job está funcionando

Execute no SQL Editor:

```sql
-- Ver jobs agendados
SELECT * FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute';

-- Ver histórico de execuções (últimas 10)
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute') 
ORDER BY start_time DESC 
LIMIT 10;
```

### 4. Testar manualmente (opcional)

Você pode testar a função manualmente chamando a Edge Function diretamente:

```bash
curl -X POST https://wabefmgfsatlusevxyfo.supabase.co/functions/v1/whatsapp-reminder \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Ou através do Supabase Dashboard > Edge Functions > whatsapp-reminder > Invoke

## 🔧 Como funciona:

1. **A cada minuto**, o cron job executa a função `invoke_whatsapp_reminder()`
2. A função chama a Edge Function `whatsapp-reminder` via HTTP
3. A Edge Function:
   - Busca agendamentos que estão **10 minutos antes** do horário agendado (± 1 minuto de tolerância)
   - Verifica se o lembrete já foi enviado (`reminder_sent = false`)
   - Envia mensagem WhatsApp para o cliente com:
     - Lembrete de que o agendamento está em 10 minutos
     - Data e horário
     - Serviço e barbeiro
     - Link do Google Maps (se configurado)
   - Marca `reminder_sent = true` para não enviar novamente

## 📝 Mensagem enviada:

```
*Olá [Nome]!* 👋

⏰ *Lembrete:* Seu agendamento está em 10 minutos!

📅 *Data:* [data]
🕐 *Horário:* [horário]
💇 *Serviço:* [serviço]
👨‍💼 *Barbeiro:* [barbeiro]

Não se esqueça! Estamos te esperando! 🎉

📍 *Localização:*
[link do Google Maps]
```

## 🛠️ Gerenciar o cron job:

### Parar o cron job:
```sql
SELECT cron.unschedule('whatsapp-reminder-every-minute');
```

### Reativar o cron job:
```sql
SELECT cron.schedule(
  'whatsapp-reminder-every-minute',
  '* * * * *',
  $$
  SELECT invoke_whatsapp_reminder();
  $$
);
```

### Alterar frequência:

Para executar a cada 5 minutos:
```sql
SELECT cron.unschedule('whatsapp-reminder-every-minute');
SELECT cron.schedule(
  'whatsapp-reminder-every-5-minutes',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT invoke_whatsapp_reminder();
  $$
);
```

## ⚠️ Observações importantes:

1. O cron job verifica agendamentos **apenas do dia atual**
2. O lembrete é enviado **10 minutos antes** do horário agendado (± 1 minuto)
3. Cada agendamento recebe **apenas um lembrete** (marcado com `reminder_sent = true`)
4. Agendamentos com status `cancelled` ou `completed` não recebem lembretes
5. Clientes sem telefone válido não recebem lembretes

## 🐛 Troubleshooting:

Se os lembretes não estiverem sendo enviados:

1. Verifique se o cron job está ativo:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute';
   ```

2. Verifique os logs de execução:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute')
   ORDER BY start_time DESC LIMIT 5;
   ```

3. Verifique os logs da Edge Function no Supabase Dashboard > Edge Functions > whatsapp-reminder > Logs

4. Verifique se a instância WhatsApp está conectada (Dashboard > WhatsApp Manager)

5. Teste manualmente chamando a Edge Function diretamente
