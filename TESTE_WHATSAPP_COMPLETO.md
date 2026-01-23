# 🧪 Guia Completo de Teste - Mensagens WhatsApp

## ✅ Status da Configuração

**Railway Bot:** `https://whatsapp-bot-barbearia-production.up.railway.app`  
**API Key:** `testdaapi2026`  
**Instance Name:** `default`

**Supabase Secrets Configurados:**
- ✅ `EVOLUTION_API_URL`
- ✅ `EVOLUTION_API_KEY`
- ✅ `EVOLUTION_INSTANCE_NAME`

---

## 📋 Pré-requisitos

1. ✅ WhatsApp conectado no painel admin
2. ✅ Railway bot online e funcionando
3. ✅ Secrets do Supabase configurados
4. ✅ Cliente com telefone cadastrado no perfil

---

## 🧪 Teste 1: Verificar Conexão WhatsApp

### Passo 1: Acessar Painel Admin
1. Acesse: `http://localhost:8080/admin` (ou sua URL de produção)
2. Faça login como admin/gestor

### Passo 2: Verificar Status WhatsApp
1. No menu lateral, clique em **"WhatsApp"**
2. Verifique se mostra:
   - ✅ Status: **"Conectado"** (verde)
   - ✅ Instância: **"default"**
   - ✅ QR Code não deve aparecer (já conectado)

### Passo 3: Se Não Estiver Conectado
1. Clique em **"Conectar WhatsApp"** ou **"Gerar QR Code"**
2. Escaneie o QR code com seu WhatsApp:
   - Abra WhatsApp no celular
   - Vá em: **Configurações → Aparelhos conectados → Conectar um aparelho**
   - Escaneie o QR code exibido no painel
3. Aguarde status mudar para **"Conectado"**

---

## 🧪 Teste 2: Criar Agendamento de Teste

### Passo 1: Preparar Cliente de Teste
1. Acesse: `http://localhost:8080/admin`
2. Vá em: **Usuários** (menu lateral)
3. Verifique se existe um cliente com telefone válido
4. Se não existir, crie um:
   - Clique em **"Novo Usuário"**
   - Preencha nome e **telefone** (formato: 5511999999999)
   - Role: **Cliente**
   - Salve

### Passo 2: Criar Agendamento
1. Acesse: `http://localhost:8080` (página inicial)
2. Clique em **"Agendar"**
3. Preencha:
   - **Serviço:** Escolha qualquer serviço
   - **Barbeiro:** Escolha qualquer barbeiro
   - **Data:** Data futura
   - **Horário:** Horário disponível
4. Clique em **"Confirmar Agendamento"**

### Passo 3: Verificar Fila de WhatsApp
1. Acesse: Supabase Dashboard → SQL Editor
2. Execute:
```sql
SELECT 
  id,
  appointment_id,
  client_name,
  client_phone,
  message_action,
  status,
  attempts,
  error_message,
  created_at,
  processed_at
FROM whatsapp_notifications_queue
ORDER BY created_at DESC
LIMIT 10;
```

**Resultado Esperado:**
- ✅ Deve aparecer 2 entradas (uma para cliente, uma para barbeiro)
- ✅ `status` = `'pending'` ou `'sent'`
- ✅ `message_action` = `'created'`

---

## 🧪 Teste 3: Processar Fila Manualmente

### Opção A: Via Supabase Function (Recomendado)
1. Acesse: Supabase Dashboard → Edge Functions
2. Execute a função: `whatsapp-process-queue`
3. Ou via SQL:
```sql
SELECT net.http_post(
  url := 'https://wabefmgfsatlusevxyfo.supabase.co/functions/v1/whatsapp-process-queue',
  headers := jsonb_build_object(
    'Authorization', 'Bearer SEU_SERVICE_ROLE_KEY',
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb
);
```

### Opção B: Via Código (Automático)
A fila é processada automaticamente quando:
- Um agendamento é criado
- Um agendamento é atualizado
- Um agendamento é cancelado

---

## 🧪 Teste 4: Verificar Mensagem Recebida

### No WhatsApp do Cliente:
1. Abra o WhatsApp no celular do cliente de teste
2. Verifique se recebeu mensagem com:
   - ✅ Nome do serviço
   - ✅ Data e horário do agendamento
   - ✅ Nome do barbeiro
   - ✅ Confirmação do agendamento

### No WhatsApp do Barbeiro:
1. Abra o WhatsApp do barbeiro (se configurado)
2. Verifique se recebeu notificação do novo agendamento

---

## 🧪 Teste 5: Verificar Logs e Erros

### Verificar Fila com Erros:
```sql
SELECT 
  id,
  client_name,
  client_phone,
  message_action,
  status,
  attempts,
  error_message,
  created_at
FROM whatsapp_notifications_queue
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Verificar Logs do Railway:
1. Acesse: https://railway.app
2. Vá em seu projeto: `whatsapp-bot-barbearia`
3. Clique em **"Logs"**
4. Verifique se há erros ou mensagens de sucesso

### Verificar Logs do Supabase:
1. Acesse: Supabase Dashboard → Logs → Edge Functions
2. Filtre por: `whatsapp-notify` ou `whatsapp-process-queue`
3. Verifique se há erros

---

## 🧪 Teste 6: Testar Atualização de Agendamento

### Passo 1: Atualizar Agendamento
1. Acesse: Painel do Cliente ou Admin
2. Encontre o agendamento criado
3. Altere a **data** ou **horário**
4. Salve

### Passo 2: Verificar Notificação
1. Verifique a fila novamente (SQL acima)
2. Deve aparecer nova entrada com `message_action` = `'updated'`
3. Cliente deve receber mensagem de atualização no WhatsApp

---

## 🧪 Teste 7: Testar Cancelamento

### Passo 1: Cancelar Agendamento
1. Acesse: Painel do Cliente ou Admin
2. Encontre o agendamento
3. Clique em **"Cancelar"**
4. Confirme

### Passo 2: Verificar Notificação
1. Verifique a fila (SQL acima)
2. Deve aparecer entrada com `message_action` = `'cancelled'`
3. Cliente deve receber mensagem de cancelamento no WhatsApp

---

## 🔍 Troubleshooting

### Problema: Mensagens não estão sendo enviadas

**Verificar:**
1. ✅ WhatsApp está conectado? (Painel Admin → WhatsApp)
2. ✅ Railway bot está online? (Acesse URL do Railway)
3. ✅ Secrets do Supabase estão corretos?
4. ✅ Cliente tem telefone válido no perfil?
5. ✅ Fila tem entradas com `status = 'pending'`?

**Solução:**
```sql
-- Verificar secrets
SELECT name FROM supabase_secrets;

-- Verificar fila pendente
SELECT COUNT(*) FROM whatsapp_notifications_queue WHERE status = 'pending';

-- Reprocessar fila manualmente
SELECT net.http_post(
  url := 'https://wabefmgfsatlusevxyfo.supabase.co/functions/v1/whatsapp-process-queue',
  headers := jsonb_build_object(
    'Authorization', 'Bearer SEU_SERVICE_ROLE_KEY',
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb
);
```

### Problema: Erro 404 ou 500 no Railway

**Verificar:**
1. Railway bot está deployado?
2. URL está correta?
3. API Key está correta?

**Solução:**
- Verifique logs do Railway
- Teste health check: `https://whatsapp-bot-barbearia-production.up.railway.app/health`

### Problema: WhatsApp desconectado

**Solução:**
1. Acesse: Painel Admin → WhatsApp
2. Clique em **"Desconectar"**
3. Clique em **"Conectar WhatsApp"** ou **"Gerar QR Code"**
4. Escaneie novamente

---

## ✅ Checklist Final

- [ ] WhatsApp conectado no painel admin
- [ ] Railway bot online e acessível
- [ ] Secrets do Supabase configurados
- [ ] Cliente de teste criado com telefone válido
- [ ] Agendamento de teste criado
- [ ] Fila de WhatsApp tem entradas
- [ ] Mensagem recebida no WhatsApp do cliente
- [ ] Mensagem recebida no WhatsApp do barbeiro (se configurado)
- [ ] Atualização de agendamento envia notificação
- [ ] Cancelamento envia notificação

---

## 📞 Próximos Passos

1. **Testar em produção** (se aplicável)
2. **Configurar lembretes automáticos** (10 minutos antes)
3. **Monitorar logs** regularmente
4. **Ajustar mensagens** se necessário

---

**Status:** ✅ Pronto para testes!  
**Última atualização:** 2026-01-24
