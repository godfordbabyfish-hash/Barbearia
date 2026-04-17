# ✅ SOLUÇÃO FINAL: Criar PostgreSQL no Fly.io

## 🎯 DECISÃO

Após tentar vários formatos de connection string do Supabase, todos falharam com "Tenant or user not found".

**Solução:** Criar um PostgreSQL dedicado no Fly.io (gratuito e mais simples).

---

## 🚀 EXECUTAR AGORA

### PASSO 1: Criar PostgreSQL no Fly.io

**Via Dashboard (RECOMENDADO):**

1. **Acesse:** https://dashboard.fly.io
2. **Clique em:** "New" → "Postgres"
3. **Configure:**
   - **App Name:** `evolution-db`
   - **Region:** `gru` (São Paulo)
   - **VM Size:** `shared-cpu-1x`
   - **Volume Size:** `1 GB`
4. **Clique em:** "Create"
5. **Aguarde 2-3 minutos**

---

### PASSO 2: Obter Connection String

**Após criar, acesse:**
https://dashboard.fly.io/apps/evolution-db

**Vá em:** "Connection" ou "Settings" → "Connection"

**Copie a connection string** (formato: `postgresql://postgres:senha@evolution-db.fly.dev:5432/evolution_db`)

---

### PASSO 3: Configurar Evolution API

```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"

# Substitua SUA_CONNECTION_STRING pela string real
fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="SUA_CONNECTION_STRING" --app evolution-api-barbearia
```

---

### PASSO 4: Redeploy

```powershell
fly deploy --app evolution-api-barbearia
```

---

## ✅ VANTAGENS

- ✅ **Gratuito** no Fly.io
- ✅ **Mais simples** - connection string direta
- ✅ **Sem problemas de autenticacao**
- ✅ **Dedicado** - não compartilha com Supabase

---

**Siga o PASSO 1 e me avise quando tiver a connection string!** 🚀
