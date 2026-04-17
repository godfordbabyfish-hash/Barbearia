# 📱 Configurar Notificações WhatsApp para Cliente e Barbeiro

## ✅ Status Atual

O sistema **JÁ ESTÁ CONFIGURADO** para notificar tanto clientes quanto barbeiros em cada agendamento/cancelamento!

## 🔍 Como Funciona

### 1. Quando um Agendamento é Criado

O sistema automaticamente:
1. ✅ **Notifica o CLIENTE** (se tiver telefone cadastrado)
2. ✅ **Notifica o BARBEIRO** (se tiver WhatsApp configurado)

### 2. Quando um Agendamento é Cancelado

O sistema automaticamente:
1. ✅ **Notifica o CLIENTE** sobre o cancelamento
2. ✅ **Notifica o BARBEIRO** sobre o cancelamento

### 3. Quando um Agendamento é Remarcado

O sistema automaticamente:
1. ✅ **Notifica o CLIENTE** sobre a nova data/hora
2. ✅ **Notifica o BARBEIRO** sobre a nova data/hora

## ⚙️ Configuração Necessária

### Para Clientes

**Já funciona automaticamente!** O sistema usa o telefone cadastrado no perfil do cliente (`profiles.phone`).

### Para Barbeiros

**Precisa configurar o WhatsApp de cada barbeiro:**

1. Acesse: **Painel Admin → Usuários**
2. Encontre o barbeiro na lista
3. Clique para editar
4. No campo **"WhatsApp Pessoal"**, adicione o número:
   - Formato: `5511999999999` (código do país + DDD + número)
   - Exemplo: `5511987654321`
5. Salve as alterações

**OU**

1. Acesse: **Painel Admin → Barbeiros** (se disponível)
2. Configure o WhatsApp de cada barbeiro

## 📋 Verificação

### Verificar se a Migration Foi Aplicada

Execute no Supabase SQL Editor:

```sql
-- Verificar se a coluna whatsapp_phone existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'barbers' 
AND column_name = 'whatsapp_phone';

-- Verificar se target_type existe na fila
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_notifications_queue' 
AND column_name = 'target_type';
```

Se não existir, execute a migration:

```sql
-- Ver arquivo: supabase/migrations/20260123000000_add_barber_whatsapp_and_queue_target.sql
```

### Verificar Notificações na Fila

```sql
-- Ver últimas notificações (cliente e barbeiro)
SELECT 
  id,
  appointment_id,
  target_type,
  target_name,
  target_phone,
  message_action,
  status,
  created_at
FROM whatsapp_notifications_queue
ORDER BY created_at DESC
LIMIT 20;
```

Você deve ver entradas com:
- `target_type = 'client'` (para clientes)
- `target_type = 'barber'` (para barbeiros)

## 🧪 Teste

### 1. Criar Agendamento de Teste

1. Crie um agendamento normalmente
2. Verifique a fila de notificações:

```sql
SELECT * FROM whatsapp_notifications_queue 
WHERE appointment_id = 'ID_DO_AGENDAMENTO'
ORDER BY created_at DESC;
```

**Deve aparecer 2 entradas:**
- Uma para o cliente (`target_type = 'client'`)
- Uma para o barbeiro (`target_type = 'barber'`)

### 2. Processar a Fila

A fila é processada automaticamente, mas você pode processar manualmente:

**Via Frontend:**
- O sistema já dispara automaticamente após criar/cancelar agendamento

**Via Supabase:**
- Acesse: Edge Functions → `whatsapp-process-queue` → Invoke

**Via SQL (se tiver cron configurado):**
- O sistema processa automaticamente a cada X minutos

### 3. Verificar Envio

1. Verifique os logs do Supabase:
   - Edge Functions → `whatsapp-notify` → Logs
2. Verifique se as mensagens chegaram:
   - Cliente deve receber mensagem no WhatsApp
   - Barbeiro deve receber mensagem no WhatsApp

## 🔧 Troubleshooting

### Barbeiro Não Recebe Notificações

**Causa:** WhatsApp não configurado ou número inválido

**Solução:**
1. Verifique se o barbeiro tem `whatsapp_phone` configurado:
   ```sql
   SELECT id, name, whatsapp_phone 
   FROM barbers 
   WHERE id = 'ID_DO_BARBEIRO';
   ```
2. Se estiver vazio, configure no painel admin
3. Formato correto: `5511999999999` (sem espaços, sem caracteres especiais)

### Cliente Não Recebe Notificações

**Causa:** Telefone não cadastrado ou inválido

**Solução:**
1. Verifique se o cliente tem telefone:
   ```sql
   SELECT id, name, phone 
   FROM profiles 
   WHERE id = 'ID_DO_CLIENTE';
   ```
2. Se estiver vazio ou `00000000000`, atualize o perfil

### Notificações Não Aparecem na Fila

**Causa:** Trigger não está funcionando ou migration não foi aplicada

**Solução:**
1. Verifique se o trigger existe:
   ```sql
   SELECT trigger_name, event_manipulation, event_object_table
   FROM information_schema.triggers
   WHERE trigger_name LIKE '%whatsapp%';
   ```
2. Se não existir, execute a migration:
   ```sql
   -- Ver: supabase/migrations/20260123000000_add_barber_whatsapp_and_queue_target.sql
   ```

### Fila Não Está Sendo Processada

**Causa:** Edge Function não está sendo chamada

**Solução:**
1. Verifique se `whatsapp-process-queue` está sendo chamado após criar agendamento
2. Verifique logs do Supabase
3. Processe manualmente via Edge Function

## 📝 Checklist de Configuração

- [ ] Migration `20260123000000_add_barber_whatsapp_and_queue_target.sql` aplicada
- [ ] Campo `whatsapp_phone` existe na tabela `barbers`
- [ ] Campos `target_type`, `target_phone`, `target_name` existem na fila
- [ ] Trigger `trigger_queue_whatsapp_on_appointment_created` existe
- [ ] Trigger `trigger_queue_whatsapp_on_appointment_updated` existe
- [ ] Barbeiros têm `whatsapp_phone` configurado no painel admin
- [ ] Clientes têm `phone` cadastrado no perfil
- [ ] Edge Function `whatsapp-process-queue` está funcionando
- [ ] Edge Function `whatsapp-notify` está funcionando
- [ ] Evolution API está conectada e funcionando

## 🎯 Resultado Esperado

Após configurar tudo:

1. **Cliente cria agendamento:**
   - ✅ Cliente recebe: "Seu agendamento foi confirmado..."
   - ✅ Barbeiro recebe: "Você recebeu um novo agendamento..."

2. **Cliente cancela agendamento:**
   - ✅ Cliente recebe: "Seu agendamento foi cancelado..."
   - ✅ Barbeiro recebe: "Você recebeu um agendamento cancelado..."

3. **Agendamento é remarcado:**
   - ✅ Cliente recebe: "Seu agendamento foi remarcado..."
   - ✅ Barbeiro recebe: "Você recebeu um agendamento remarcado..."

## 💡 Dica

Para testar rapidamente:
1. Configure o WhatsApp de um barbeiro no painel admin
2. Crie um agendamento de teste
3. Verifique a fila: deve ter 2 entradas (cliente + barbeiro)
4. Processe a fila manualmente se necessário
5. Verifique se ambos receberam as mensagens
