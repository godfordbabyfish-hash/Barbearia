# 🔍 Verificar e Corrigir Notificações WhatsApp

## ✅ O Que Foi Corrigido

1. ✅ **Logs melhorados** - Agora há logs detalhados em cada etapa
2. ✅ **Retry automático** - Se falhar, tenta novamente após 2 segundos
3. ✅ **Melhor tratamento de erros** - Erros são logados com detalhes

## 🔍 Verificações Necessárias

### 1. Verificar URL do Railway no Supabase

**Execute:**
```powershell
npx supabase secrets list
```

**Verifique se aparece:**
- `EVOLUTION_API_URL` = URL do Railway (ex: `https://whatsapp-bot-xxxx.up.railway.app`)
- `EVOLUTION_API_KEY` = Chave da API (ex: `testdaapi2026`)

**Se não estiver configurado, configure:**
```powershell
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-barbearia-production.up.railway.app
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
```

### 2. Verificar se WhatsApp está Conectado

1. Acesse o painel admin: http://localhost:8080/admin
2. Vá em **"WhatsApp Manager"**
3. Verifique se mostra **"Conectado"** (status verde)
4. Se mostrar "Conectando..." ou erro, escaneie o QR code novamente

### 3. Verificar Fila de Notificações

**No Supabase Dashboard:**
1. Acesse: https://supabase.com/dashboard
2. Vá em **SQL Editor**
3. Execute:
```sql
SELECT 
  id,
  appointment_id,
  client_phone,
  client_name,
  message_action,
  status,
  attempts,
  error_message,
  created_at
FROM whatsapp_notifications_queue
ORDER BY created_at DESC
LIMIT 10;
```

**Verifique:**
- Se há mensagens com `status = 'pending'` → A fila não está sendo processada
- Se há mensagens com `status = 'failed'` → Verifique `error_message`
- Se há mensagens com `status = 'sent'` → Está funcionando! ✅

### 4. Testar Processamento Manual

**Execute no console do navegador (F12):**
```javascript
const supabaseUrl = 'SUA_URL_SUPABASE';
const supabaseAnonKey = 'SUA_ANON_KEY';

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

## 🐛 Problemas Comuns

### ❌ "Nenhuma instância WhatsApp ativa"
**Solução:** Conecte o WhatsApp no painel admin

### ❌ "EVOLUTION_API_URL não configurada"
**Solução:** Configure a URL do Railway no Supabase (passo 1)

### ❌ "WhatsApp não está conectado"
**Solução:** Escaneie o QR code no painel admin

### ❌ Mensagens ficam "pending" na fila
**Solução:** 
1. Verifique se `whatsapp-process-queue` está sendo chamada
2. Verifique os logs no Supabase Dashboard → Functions → Logs
3. Teste manualmente (passo 4)

## 📊 Logs para Debug

**No Supabase Dashboard:**
1. Vá em **Functions** → **whatsapp-notify** → **Logs**
2. Procure por:
   - `[Queue] Iniciando processamento...`
   - `[Queue] Encontradas X mensagens pendentes`
   - `[Queue] Processando item...`
   - `[WhatsApp] Attempting to send message...`
   - `[WhatsApp] Message sent successfully`

## ✅ Próximos Passos

1. **Configure a URL do Railway** (se ainda não fez)
2. **Conecte o WhatsApp** no painel admin
3. **Crie um agendamento de teste**
4. **Verifique os logs** no Supabase
5. **Verifique a fila** no banco de dados

---

**Se ainda não funcionar, me envie:**
- Screenshot dos logs do Supabase
- Resultado da query SQL da fila
- URL do Railway que está configurada
