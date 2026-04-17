# 🔍 Diagnóstico Completo - Notificações WhatsApp

## ❌ Problemas Identificados

### 1. Evolution API não está respondendo
- **URL esperada:** `https://evolution-api-barbearia.fly.dev`
- **Status:** ❌ Não responde
- **Possíveis causas:**
  - API não está rodando no Fly.io
  - API foi desligada ou removida
  - URL mudou

### 2. Variáveis do Supabase não verificadas via CLI
- Precisa verificar manualmente no dashboard

### 3. Processamento da fila falhando
- Provavelmente porque a Evolution API não está disponível

---

## ✅ Verificações Necessárias

### 1. Verificar Evolution API no Fly.io

**Opção A - Via Fly CLI:**
```powershell
fly status --app evolution-api-barbearia
fly logs --app evolution-api-barbearia
```

**Opção B - Via Dashboard:**
1. Acesse: https://fly.io/dashboard
2. Procure pelo app `evolution-api-barbearia`
3. Verifique se está rodando
4. Veja os logs

**Se a API não existir ou não estiver rodando:**
- Você pode ter migrado para Railway
- Verifique se há uma URL do Railway configurada

---

### 2. Verificar Variáveis do Supabase

**Acesse:**
https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets

**Verifique se estão configuradas:**
- ✅ `EVOLUTION_API_URL` - URL da Evolution API
- ✅ `EVOLUTION_API_KEY` - Chave da API (geralmente `testdaapi2026`)
- ✅ `EVOLUTION_INSTANCE_NAME` - Nome da instância (geralmente `evolution-4`)

**Valores esperados (se usando Fly.io):**
```
EVOLUTION_API_URL=https://evolution-api-barbearia.fly.dev
EVOLUTION_API_KEY=testdaapi2026
EVOLUTION_INSTANCE_NAME=evolution-4
```

**Se estiver usando Railway:**
```
EVOLUTION_API_URL=https://whatsapp-bot-xxxx.up.railway.app
EVOLUTION_API_KEY=testdaapi2026
EVOLUTION_INSTANCE_NAME=evolution-4
```

**Para configurar via CLI:**
```powershell
npx supabase secrets set EVOLUTION_API_URL=<URL_DA_API>
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
npx supabase secrets set EVOLUTION_INSTANCE_NAME=evolution-4
```

---

### 3. Verificar Instância WhatsApp Ativa

**No Supabase SQL Editor, execute:**
```sql
SELECT config_value 
FROM site_config 
WHERE config_key = 'whatsapp_active_instance';
```

**Se não retornar nada ou retornar null:**
- Você precisa criar uma instância WhatsApp no painel admin
- Acesse: Admin > WhatsApp > WhatsApp Manager
- Crie uma nova instância e escaneie o QR code

---

### 4. Verificar Fila de Notificações

**No Supabase SQL Editor, execute:**
```sql
SELECT 
  id,
  appointment_id,
  client_phone,
  target_phone,
  target_type,
  message_action,
  status,
  attempts,
  error_message,
  created_at
FROM whatsapp_notifications_queue
ORDER BY created_at DESC
LIMIT 10;
```

**Interpretação:**
- `status='pending'` → Fila não está sendo processada
- `status='failed'` → Verifique `error_message` para ver o erro
- `status='sent'` → ✅ Funcionando!

**Se houver mensagens `pending`:**
- O processamento da fila não está funcionando
- Verifique os logs do Supabase Functions

---

### 5. Verificar Logs do Supabase

**Acesse:**
https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions

**Verifique os logs de:**
1. `whatsapp-notify` - Função que envia mensagens
2. `whatsapp-process-queue` - Função que processa a fila

**Procure por:**
- ✅ `[Queue] Iniciando processamento...`
- ✅ `[Queue] Encontradas X mensagens pendentes`
- ✅ `[WhatsApp] Attempting to send message...`
- ✅ `[WhatsApp] Message sent successfully`
- ❌ `[WhatsApp] Evolution API error`
- ❌ `Nenhuma instância WhatsApp ativa`
- ❌ `EVOLUTION_API_URL não configurada`

---

## 🔧 Correções Possíveis

### Correção 1: Evolution API não está rodando

**Se estiver usando Fly.io:**
```powershell
# Verificar status
fly status --app evolution-api-barbearia

# Se não estiver rodando, iniciar
fly machines start --app evolution-api-barbearia

# Ver logs
fly logs --app evolution-api-barbearia
```

**Se estiver usando Railway:**
1. Acesse: https://railway.app
2. Verifique se o serviço está rodando
3. Veja os logs
4. Se necessário, faça redeploy

---

### Correção 2: Variáveis do Supabase incorretas

**Configure as variáveis corretas:**
```powershell
# Se usando Fly.io
npx supabase secrets set EVOLUTION_API_URL=https://evolution-api-barbearia.fly.dev
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
npx supabase secrets set EVOLUTION_INSTANCE_NAME=evolution-4

# Se usando Railway (substitua pela URL do seu Railway)
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-xxxx.up.railway.app
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
npx supabase secrets set EVOLUTION_INSTANCE_NAME=evolution-4
```

---

### Correção 3: Instância WhatsApp não configurada

1. Acesse o painel admin: http://localhost:8080/admin
2. Vá em: WhatsApp > WhatsApp Manager
3. Se não houver instância, crie uma nova
4. Escaneie o QR code com seu WhatsApp
5. Aguarde o status ficar "Conectado"

---

### Correção 4: Processar fila manualmente

**Teste o processamento da fila:**
```javascript
// No console do navegador (F12)
const supabaseUrl = 'https://wabefmgfsatlusevxyfo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc';

fetch(`${supabaseUrl}/functions/v1/whatsapp-process-queue`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey,
  },
  body: JSON.stringify({}),
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## 📋 Checklist de Verificação

- [ ] Evolution API está rodando (Fly.io ou Railway)
- [ ] Variáveis do Supabase configuradas corretamente
- [ ] Instância WhatsApp criada e conectada
- [ ] Fila de notificações tem mensagens pendentes
- [ ] Logs do Supabase mostram tentativas de envio
- [ ] Números de telefone estão no formato correto (55XXXXXXXXXXX)
- [ ] Cliente tem número de telefone válido no perfil
- [ ] Barbeiro tem número de WhatsApp configurado (se aplicável)

---

## 🎯 Próximos Passos

1. **Verifique a Evolution API** - Confirme se está rodando e qual a URL correta
2. **Configure as variáveis do Supabase** - Use a URL correta da API
3. **Verifique a instância WhatsApp** - Certifique-se de que está conectada
4. **Crie um agendamento de teste** - Veja se a mensagem é enviada
5. **Verifique os logs** - Veja onde está falhando

---

## 📞 Informações Importantes

**URLs do Projeto:**
- Supabase: https://wabefmgfsatlusevxyfo.supabase.co
- Dashboard: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo

**Possíveis URLs da Evolution API:**
- Fly.io: `https://evolution-api-barbearia.fly.dev`
- Railway: `https://whatsapp-bot-xxxx.up.railway.app` (verificar no Railway)

**Chave da API:**
- `testdaapi2026` (padrão)

---

Execute o diagnóstico novamente após corrigir os problemas:
```powershell
.\diagnosticar-whatsapp-completo.ps1
```
