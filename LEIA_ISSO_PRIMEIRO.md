# ⚡ LEIA ISSO PRIMEIRO - AJUSTE FINAL

## 🎯 SITUAÇÃO ATUAL

- ✅ App criado no Fly.io
- ✅ Variáveis configuradas
- ❌ **FALTA:** Configurar PostgreSQL

**Problema:** Evolution API crasha sem banco de dados.

---

## ✅ SOLUÇÃO RÁPIDA (5 MINUTOS)

### PASSO 1: Obter Connection String do Supabase

**Você está em "Settings" → precisa ir para "Connection":**

1. **No menu lateral esquerdo**, clique em **"Connection"** (não "Settings")
   - Ou acesse diretamente: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database/connection

2. **Procure por:**
   - **"Connection string"** ou **"URI"**
   - **"Connection pooling"** (recomendado - porta 6543)
   - **"Direct connection"** (alternativa - porta 5432)

3. **Copie a string** que começa com `postgresql://`

**Formato esperado:**
```
postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

---

### PASSO 2: Configurar (Cole a string e execute)

```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"

# COLE A CONNECTION STRING AQUI (substitua SUA_STRING)
fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="SUA_STRING" --app evolution-api-barbearia
```

---

### PASSO 3: Redeploy

```powershell
fly deploy --app evolution-api-barbearia
```

**Aguarde 2-3 minutos.**

---

### PASSO 4: Testar

```powershell
Start-Sleep -Seconds 60
Invoke-WebRequest -Uri "https://evolution-api-barbearia.fly.dev/health"
```

---

## 🎉 PRONTO!

**Execute os 4 passos acima e me avise quando terminar!** 🚀

---

**Dúvidas?** Veja `FAZER_AGORA_FINAL.md` para mais detalhes.
