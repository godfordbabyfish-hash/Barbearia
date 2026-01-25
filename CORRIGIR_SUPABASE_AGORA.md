# 🔧 Corrigir Supabase - Atualizar URL do Railway

## ⚠️ Problema Identificado

O frontend está correto (`defaultInstanceName = 'default'`), mas o **Supabase Edge Function** ainda está tentando conectar à URL antiga do Evolution API.

---

## ✅ Solução: Atualizar Variáveis no Supabase

### PASSO 1: Acessar Dashboard do Supabase

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets

2. **Ou navegue manualmente:**
   - Dashboard Supabase → Seu projeto (`wabefmgfsatlusevxyfo`)
   - ⚙️ **Settings** → **Edge Functions** → **Secrets**

---

### PASSO 2: Atualizar/Criar 3 Variáveis

#### Variável 1: EVOLUTION_API_URL
- **Name:** `EVOLUTION_API_URL`
- **Value:** `https://whatsapp-bot-barbearia-production.up.railway.app`
- **Ação:** Se já existir, clique em **"Edit"** e atualize. Se não existir, clique em **"Add new secret"**

#### Variável 2: EVOLUTION_API_KEY
- **Name:** `EVOLUTION_API_KEY`
- **Value:** `testdaapi2026`
- **Ação:** Verifique se está correto, atualize se necessário

#### Variável 3: EVOLUTION_INSTANCE_NAME
- **Name:** `EVOLUTION_INSTANCE_NAME`
- **Value:** `default`
- **Ação:** Verifique se está correto, atualize se necessário

---

## ✅ Verificação

Após atualizar, todas as 3 variáveis devem estar configuradas:

| Variável | Valor Esperado |
|----------|---------------|
| `EVOLUTION_API_URL` | `https://whatsapp-bot-barbearia-production.up.railway.app` |
| `EVOLUTION_API_KEY` | `testdaapi2026` |
| `EVOLUTION_INSTANCE_NAME` | `default` |

---

## 🧪 Testar Após Atualizar

### 1. Teste do Railway (deve funcionar)
```powershell
Invoke-WebRequest -Uri "https://whatsapp-bot-barbearia-production.up.railway.app/health" -Method GET
```

**Deve retornar:** `{"status":"ok","connected":false}` ou similar

### 2. Limpar Cache do Navegador
- Pressione **Ctrl+Shift+R** (ou **Ctrl+F5**) para recarregar sem cache
- Ou abra em **aba anônima**

### 3. Testar no Frontend
1. Acesse o painel admin
2. Vá para a seção WhatsApp
3. Deve aparecer o QR Code para conectar

---

## ⚡ Alternativa: Via CLI (se funcionar)

Se o CLI do Supabase funcionar (sem problemas de proxy):

```powershell
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-barbearia-production.up.railway.app
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
npx supabase secrets set EVOLUTION_INSTANCE_NAME=default
```

---

**Depois de atualizar as variáveis, recarregue o frontend e teste novamente! 🚀**
