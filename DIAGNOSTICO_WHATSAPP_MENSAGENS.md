# Diagnóstico: Mensagens WhatsApp Não Chegam

## Checklist de Verificação

### 1. Verificar se a Migration foi Aplicada

Execute no SQL Editor do Supabase:

```sql
-- Verificar se a função foi atualizada
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'queue_whatsapp_notification';

-- Verificar se há mensagens na fila
SELECT 
  id,
  appointment_id,
  client_phone,
  target_phone,
  target_type,
  status,
  error_message,
  created_at,
  processed_at
FROM whatsapp_notifications_queue
ORDER BY created_at DESC
LIMIT 10;
```

### 2. Verificar Dados dos Clientes

```sql
-- Verificar se os clientes têm whatsapp preenchido
SELECT 
  id,
  name,
  phone,
  whatsapp,
  cpf
FROM profiles
WHERE whatsapp IS NOT NULL OR phone IS NOT NULL
LIMIT 10;
```

### 3. Verificar Formato dos Números

```sql
-- Verificar formato dos números na fila
SELECT 
  id,
  client_phone,
  target_phone,
  LENGTH(REGEXP_REPLACE(client_phone, '[^0-9]', '', 'g')) as client_phone_length,
  LENGTH(REGEXP_REPLACE(target_phone, '[^0-9]', '', 'g')) as target_phone_length,
  status,
  error_message
FROM whatsapp_notifications_queue
WHERE status = 'pending' OR status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### 4. Testar Criação de Agendamento

1. Criar um novo agendamento
2. Verificar se foi criado na fila:

```sql
SELECT * FROM whatsapp_notifications_queue 
WHERE appointment_id = 'ID_DO_AGENDAMENTO';
```

### 5. Verificar Logs da Edge Function

1. Acesse Supabase Dashboard > Edge Functions > whatsapp-notify
2. Verifique os logs para erros
3. Procure por mensagens como:
   - `[Queue] Processando item`
   - `[WhatsApp] Phone formatado`
   - `[WhatsApp] Error`

### 6. Verificar Instância Ativa

```sql
SELECT config_value 
FROM site_config 
WHERE config_key = 'whatsapp_active_instance';
```

### 7. Testar Processamento Manual da Fila

Chame a Edge Function manualmente:

```javascript
// No console do navegador ou via Postman
const response = await fetch('https://SEU_PROJETO.supabase.co/functions/v1/whatsapp-notify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer SEU_SERVICE_ROLE_KEY'
  },
  body: JSON.stringify({
    action: 'process-queue'
  })
});

const data = await response.json();
console.log(data);
```

## Problemas Comuns e Soluções

### Problema 1: Migration não foi aplicada
**Solução:** Execute a migration `20260126000001_update_whatsapp_to_use_whatsapp_field.sql` no SQL Editor

### Problema 2: Clientes não têm campo whatsapp preenchido
**Solução:** 
- Verificar se o cadastro está salvando o campo whatsapp
- Atualizar clientes existentes:

```sql
-- Copiar phone para whatsapp se whatsapp estiver vazio
UPDATE profiles
SET whatsapp = phone
WHERE whatsapp IS NULL AND phone IS NOT NULL AND phone <> '';
```

### Problema 3: Números com formato incorreto
**Solução:** Verificar se os números estão no formato correto (10 ou 11 dígitos sem código do país)

### Problema 4: Instância WhatsApp não está ativa
**Solução:** Verificar e configurar a instância ativa no painel admin

### Problema 5: Fila não está sendo processada
**Solução:** 
- Verificar se há um cron job configurado
- Processar manualmente a fila chamando a Edge Function

## Próximos Passos

1. Execute as queries de diagnóstico acima
2. Compartilhe os resultados para análise
3. Verifique os logs da Edge Function
4. Teste criar um novo agendamento e verificar se aparece na fila
