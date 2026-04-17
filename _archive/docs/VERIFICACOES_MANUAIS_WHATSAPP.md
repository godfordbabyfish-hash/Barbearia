# 🔍 Verificações Manuais - WhatsApp Notificações

## ⚠️ Problema Identificado
As mensagens do WhatsApp após agendamento não estão chegando no cliente e no barbeiro.

---

## ✅ VERIFICAÇÕES NECESSÁRIAS (FAZER AGORA)

### 1. Verificar Variáveis do Supabase (PRIORIDADE ALTA)

**Acesse:**
https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets

**Verifique se estas variáveis estão configuradas:**

| Variável | Valor Esperado | Status |
|----------|---------------|--------|
| `EVOLUTION_API_URL` | `https://evolution-api-barbearia.fly.dev` OU URL do Railway | ⬜ Verificar |
| `EVOLUTION_API_KEY` | `testdaapi2026` | ⬜ Verificar |
| `EVOLUTION_INSTANCE_NAME` | `evolution-4` | ⬜ Verificar |

**Se não estiverem configuradas ou estiverem incorretas:**

**Para Fly.io:**
```powershell
npx supabase secrets set EVOLUTION_API_URL=https://evolution-api-barbearia.fly.dev
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
npx supabase secrets set EVOLUTION_INSTANCE_NAME=evolution-4
```

**Para Railway (se estiver usando):**
```powershell
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-xxxx.up.railway.app
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
npx supabase secrets set EVOLUTION_INSTANCE_NAME=evolution-4
```

**⚠️ IMPORTANTE:** Substitua `https://whatsapp-bot-xxxx.up.railway.app` pela URL real do seu Railway!

---

### 2. Verificar Evolution API (PRIORIDADE ALTA)

**Opção A - Fly.io:**
1. Acesse: https://fly.io/dashboard
2. Procure pelo app `evolution-api-barbearia`
3. Verifique se está rodando (status "Running")
4. Veja os logs para verificar erros

**Opção B - Railway:**
1. Acesse: https://railway.app
2. Procure pelo projeto `whatsapp-bot-barbearia` ou similar
3. Verifique se o serviço está rodando
4. Veja a URL do serviço (ex: `https://whatsapp-bot-xxxx.up.railway.app`)
5. Veja os logs para verificar erros

**Teste se a API está respondendo:**
```powershell
# Se Fly.io
Invoke-WebRequest -Uri "https://evolution-api-barbearia.fly.dev" -TimeoutSec 10

# Se Railway (substitua pela sua URL)
Invoke-WebRequest -Uri "https://whatsapp-bot-xxxx.up.railway.app" -TimeoutSec 10
```

**✅ Resultado esperado:** Status 200 ou resposta da API
**❌ Se der erro:** API não está rodando ou URL incorreta

---

### 3. Verificar Instância WhatsApp Ativa

**No Supabase SQL Editor, execute:**
```sql
SELECT config_value 
FROM site_config 
WHERE config_key = 'whatsapp_active_instance';
```

**Interpretação:**
- Se retornar `null` ou vazio → ❌ Nenhuma instância configurada
- Se retornar um JSON → ✅ Instância configurada (verifique o `status`)

**Se não houver instância:**
1. Acesse: http://localhost:8080/admin (ou sua URL de produção)
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

| Status | Significado | Ação |
|--------|-------------|------|
| `pending` | Aguardando processamento | ❌ Fila não está sendo processada |
| `failed` | Falhou após 3 tentativas | ❌ Verifique `error_message` |
| `sent` | Enviada com sucesso | ✅ Funcionando! |

**Se houver mensagens `pending`:**
- O processamento da fila não está funcionando
- Verifique os logs do Supabase Functions

**Se houver mensagens `failed`:**
- Veja a coluna `error_message` para identificar o problema
- Problemas comuns:
  - `Evolution API não está respondendo` → API não está rodando
  - `Nenhuma instância WhatsApp ativa` → Instância não conectada
  - `EVOLUTION_API_URL não configurada` → Variável não configurada

---

### 5. Verificar Logs do Supabase Functions

**Acesse:**
https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions

**Verifique os logs de:**
1. `whatsapp-notify` - Função que envia mensagens
2. `whatsapp-process-queue` - Função que processa a fila

**Procure por:**

✅ **Logs de sucesso:**
- `[Queue] Iniciando processamento...`
- `[Queue] Encontradas X mensagens pendentes`
- `[WhatsApp] Attempting to send message...`
- `[WhatsApp] Message sent successfully`

❌ **Logs de erro:**
- `[WhatsApp] Evolution API error`
- `Nenhuma instância WhatsApp ativa`
- `EVOLUTION_API_URL não configurada`
- `Evolution API não está respondendo (502 Bad Gateway)`

---

### 6. Verificar Números de Telefone

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

**Verifique:**
- ✅ Números estão no formato correto (55XXXXXXXXXXX)
- ✅ Clientes têm números válidos
- ✅ Barbeiros têm WhatsApp configurado (se aplicável)

---

### 7. Testar Processamento Manual da Fila

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

**Resultado esperado:**
```json
{
  "success": true,
  "result": {
    "processed": 1,
    "failed": 0
  }
}
```

**Se der erro:**
- Veja a mensagem de erro no console
- Verifique os logs do Supabase Functions

---

## 📋 Checklist Completo

Marque cada item conforme verificar:

- [ ] **Variáveis do Supabase configuradas:**
  - [ ] `EVOLUTION_API_URL` configurada e correta
  - [ ] `EVOLUTION_API_KEY` configurada
  - [ ] `EVOLUTION_INSTANCE_NAME` configurada

- [ ] **Evolution API funcionando:**
  - [ ] API está rodando (Fly.io ou Railway)
  - [ ] API responde a requisições
  - [ ] URL está correta nas variáveis do Supabase

- [ ] **Instância WhatsApp:**
  - [ ] Instância criada no painel admin
  - [ ] Instância está conectada (status "Conectado")
  - [ ] Instância está configurada como ativa no banco

- [ ] **Fila de notificações:**
  - [ ] Verificada no banco de dados
  - [ ] Mensagens não estão ficando "pending"
  - [ ] Se houver "failed", erro identificado

- [ ] **Logs do Supabase:**
  - [ ] Logs verificados
  - [ ] Sem erros críticos
  - [ ] Tentativas de envio aparecem nos logs

- [ ] **Números de telefone:**
  - [ ] Clientes têm números válidos
  - [ ] Barbeiros têm WhatsApp configurado
  - [ ] Números estão no formato correto

---

## 🎯 Problemas Mais Comuns e Soluções

### Problema 1: Evolution API não está respondendo

**Sintomas:**
- Erro 502 Bad Gateway
- Timeout nas requisições
- Logs mostram "Evolution API não está respondendo"

**Soluções:**
1. Verifique se a API está rodando (Fly.io ou Railway)
2. Se não estiver, inicie a API
3. Aguarde 2-3 minutos para inicialização
4. Verifique se a URL está correta nas variáveis do Supabase

---

### Problema 2: Variáveis do Supabase incorretas

**Sintomas:**
- Logs mostram "EVOLUTION_API_URL não configurada"
- Erro 403 Forbidden
- API key inválida

**Soluções:**
1. Acesse o dashboard do Supabase
2. Verifique as variáveis em Settings > Functions > Secrets
3. Configure as variáveis corretas:
   - `EVOLUTION_API_URL` = URL da sua API
   - `EVOLUTION_API_KEY` = `testdaapi2026`
   - `EVOLUTION_INSTANCE_NAME` = `evolution-4`

---

### Problema 3: Instância WhatsApp não conectada

**Sintomas:**
- Logs mostram "Nenhuma instância WhatsApp ativa"
- Status da instância é "connecting" ou "close"

**Soluções:**
1. Acesse o painel admin
2. Vá em WhatsApp > WhatsApp Manager
3. Verifique o status da instância
4. Se não estiver conectada, escaneie o QR code novamente
5. Aguarde status "Conectado"

---

### Problema 4: Fila não está sendo processada

**Sintomas:**
- Mensagens ficam com status "pending"
- Nenhuma tentativa de envio aparece nos logs

**Soluções:**
1. Verifique se `whatsapp-process-queue` está sendo chamada
2. Teste o processamento manual (ver item 7)
3. Verifique os logs do Supabase Functions
4. Verifique se há erros nas Edge Functions

---

## 📞 Informações do Projeto

- **Supabase Project ID:** `wabefmgfsatlusevxyfo`
- **Supabase URL:** `https://wabefmgfsatlusevxyfo.supabase.co`
- **Dashboard:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo
- **Evolution API (Fly.io):** `https://evolution-api-barbearia.fly.dev`
- **Evolution API (Railway):** Verificar no Railway dashboard

---

## 🚀 Após Corrigir

1. **Crie um agendamento de teste**
2. **Verifique a fila** - Veja se a mensagem foi adicionada
3. **Verifique os logs** - Veja se houve tentativa de envio
4. **Verifique o WhatsApp** - Veja se a mensagem chegou

---

**Execute todas as verificações acima e anote os resultados para identificar o problema!**
