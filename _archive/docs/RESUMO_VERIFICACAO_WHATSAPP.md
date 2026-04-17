# 📋 Resumo - Verificação WhatsApp Notificações

## 🎯 Problema Principal
As mensagens do WhatsApp após agendamento não estão chegando no cliente e no barbeiro.

---

## ✅ Ações Imediatas

### 1. Verificar Evolution API (URGENTE)

**A Evolution API não está respondendo!**

**Verifique qual plataforma você está usando:**

#### Se estiver usando Fly.io:
```powershell
fly status --app evolution-api-barbearia
fly logs --app evolution-api-barbearia
```

**Se não estiver rodando:**
```powershell
fly machines start --app evolution-api-barbearia
```

#### Se estiver usando Railway:
1. Acesse: https://railway.app
2. Verifique se o serviço está rodando
3. Veja a URL do serviço (ex: `https://whatsapp-bot-xxxx.up.railway.app`)

---

### 2. Verificar Variáveis do Supabase

**Acesse:**
https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets

**Verifique se estão configuradas:**
- `EVOLUTION_API_URL` - Deve ser a URL da sua Evolution API
- `EVOLUTION_API_KEY` - Deve ser `testdaapi2026`
- `EVOLUTION_INSTANCE_NAME` - Deve ser `evolution-4`

**Se não estiverem configuradas ou estiverem incorretas:**

**Para Fly.io:**
```powershell
npx supabase secrets set EVOLUTION_API_URL=https://evolution-api-barbearia.fly.dev
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
npx supabase secrets set EVOLUTION_INSTANCE_NAME=evolution-4
```

**Para Railway (substitua pela sua URL):**
```powershell
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-xxxx.up.railway.app
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
npx supabase secrets set EVOLUTION_INSTANCE_NAME=evolution-4
```

---

### 3. Verificar Instância WhatsApp

**No Supabase SQL Editor, execute:**
```sql
SELECT config_value 
FROM site_config 
WHERE config_key = 'whatsapp_active_instance';
```

**Se não retornar nada:**
1. Acesse: http://localhost:8080/admin
2. Vá em: WhatsApp > WhatsApp Manager
3. Crie uma nova instância (se não existir)
4. Escaneie o QR code com seu WhatsApp
5. Aguarde status "Conectado"

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
- `status='pending'` → ❌ Fila não está sendo processada
- `status='failed'` → ❌ Verifique `error_message`
- `status='sent'` → ✅ Funcionando!

---

### 5. Verificar Logs do Supabase

**Acesse:**
https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions

**Verifique os logs de:**
- `whatsapp-notify`
- `whatsapp-process-queue`

**Procure por erros como:**
- `Evolution API error`
- `Nenhuma instância WhatsApp ativa`
- `EVOLUTION_API_URL não configurada`

---

## 🔍 Verificações Adicionais

### Verificar Números de Telefone

**Clientes:**
```sql
SELECT id, name, phone 
FROM profiles 
WHERE phone IS NOT NULL 
AND phone != '' 
AND phone != '00000000000'
LIMIT 10;
```

**Barbeiros:**
```sql
SELECT id, name, whatsapp_phone 
FROM barbers 
WHERE whatsapp_phone IS NOT NULL 
AND whatsapp_phone != '' 
AND whatsapp_phone != '00000000000';
```

---

### Testar Processamento Manual

**No console do navegador (F12), execute:**
```javascript
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

## 📊 Checklist Completo

- [ ] Evolution API está rodando (Fly.io ou Railway)
- [ ] URL da Evolution API está correta nas variáveis do Supabase
- [ ] `EVOLUTION_API_KEY` está configurada
- [ ] `EVOLUTION_INSTANCE_NAME` está configurada
- [ ] Instância WhatsApp criada no painel admin
- [ ] Instância WhatsApp está conectada (status "Conectado")
- [ ] Fila de notificações tem mensagens (se houver agendamentos)
- [ ] Logs do Supabase mostram tentativas de envio
- [ ] Clientes têm números de telefone válidos
- [ ] Barbeiros têm números de WhatsApp configurados (se aplicável)

---

## 🚀 Após Corrigir

1. **Crie um agendamento de teste**
2. **Verifique a fila** - Veja se a mensagem foi adicionada
3. **Verifique os logs** - Veja se houve tentativa de envio
4. **Verifique o WhatsApp** - Veja se a mensagem chegou

---

## 📞 Informações do Projeto

- **Supabase Project ID:** `wabefmgfsatlusevxyfo`
- **Supabase URL:** `https://wabefmgfsatlusevxyfo.supabase.co`
- **Dashboard:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo
- **Evolution API (Fly.io):** `https://evolution-api-barbearia.fly.dev`
- **Evolution API (Railway):** Verificar no Railway dashboard

---

## ⚠️ Problema Mais Provável

Com base no diagnóstico, o problema mais provável é:

1. **Evolution API não está rodando** - Verifique no Fly.io ou Railway
2. **Variáveis do Supabase incorretas** - Verifique a URL da API
3. **Instância WhatsApp não conectada** - Conecte no painel admin

---

Execute o diagnóstico novamente após corrigir:
```powershell
.\diagnosticar-whatsapp-completo.ps1
```
