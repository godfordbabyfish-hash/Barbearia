# 🔑 Tokens do Supabase - Configurados

## ✅ Tokens Recebidos

Você forneceu os seguintes tokens do Supabase:

### 1. Publishable Key (Frontend)
```
sb_publishable_AomI2XKHMlPw_8R-0YOtDg_MsIa1e0C
```
- **Uso:** Frontend React
- **Variável:** `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Segurança:** ✅ Pode ser público

### 2. Secret Keys
```
sb_secret_eHnNFSwOqKlFojquCOmzPg_kuRPh47p
```
- **Uso:** Backend/API
- **Segurança:** ⚠️ Mantenha secreto

### 3. Service Role Key (JWT) ⚠️ MUITO SECRETO
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUwODMyNiwiZXhwIjoyMDg0MDg0MzI2fQ.LhxPhe6CYdGyRqfibPQpRmitqIHSRlf1YTLU3daDnTg
```
- **Uso:** Acesso total ao banco (Edge Functions, scripts)
- **Variável:** `SUPABASE_SERVICE_ROLE_KEY`
- **Segurança:** ❌ NUNCA exponha no frontend!

### 4. Anon Public Key (JWT)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc
```
- **Uso:** Frontend (alternativa ao publishable key)
- **Variável:** `VITE_SUPABASE_PUBLISHABLE_KEY` (pode usar este também)
- **Segurança:** ✅ Pode ser público

### 5. Legacy JWT Secret
```
JPSIjG3CAeRbFlhqg95L63CrBTCuBN018fKBMR8x8I3i29cRR92LHmsfT56kzScqg3TDfvQ3jgbOH4+fWHdBjA==
```
- **Uso:** Para gerar tokens JWT customizados
- **Segurança:** ❌ Mantenha secreto

### 6. Standby Key
```
2df6ed01-5305-4837-b927-5b02ff805f72
```
- **Uso:** Backup/recuperação
- **Segurança:** ❌ Mantenha secreto

---

## 🔧 Como Usar para Atualizar Variáveis do WhatsApp

### Opção 1: Via Dashboard (Recomendado - Mais Seguro)

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets

2. **Configure:**
   - `EVOLUTION_API_URL` = `https://whatsapp-bot-barbearia-production.up.railway.app`
   - `EVOLUTION_API_KEY` = `testdaapi2026`
   - `EVOLUTION_INSTANCE_NAME` = `default`

### Opção 2: Via CLI do Supabase

```powershell
# Fazer login (abre navegador)
npx supabase login

# Linkar projeto
npx supabase link --project-ref wabefmgfsatlusevxyfo

# Atualizar variáveis
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-barbearia-production.up.railway.app
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
npx supabase secrets set EVOLUTION_INSTANCE_NAME=default
```

### Opção 3: Via Script PowerShell

Execute:
```powershell
.\atualizar-supabase-com-tokens.ps1
```

---

## ⚠️ Segurança - IMPORTANTE!

### ❌ NUNCA faça:
- Commitar tokens no Git
- Expor Service Role Key no frontend
- Compartilhar tokens publicamente
- Deixar tokens em arquivos .env no repositório

### ✅ FAÇA:
- Use variáveis de ambiente
- Adicione `.env` ao `.gitignore`
- Use Service Role Key apenas em Edge Functions
- Use Anon/Publishable Key no frontend

---

## 📝 Próximos Passos

1. **Atualize as variáveis do WhatsApp** (use uma das opções acima)

2. **Aguarde 1-2 minutos** para propagação

3. **Teste no painel admin:**
   - Acesse: `http://localhost:8080/admin`
   - Vá em: WhatsApp
   - Conecte o WhatsApp

---

## 🔗 Links Úteis

- **Supabase Secrets:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets
- **API Settings:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/api
- **Railway:** https://whatsapp-bot-barbearia-production.up.railway.app

---

**Status:** ✅ Tokens recebidos, pronto para configurar!
