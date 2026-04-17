# 🚀 CRIAR POSTGRESQL GRATUITO DIRETO

## ✅ O Managed Postgres já foi deletado ou não existe

Vamos criar o **Unmanaged Postgres** (gratuito) diretamente:

---

## ⚡ PASSO 1: Criar Unmanaged Postgres

### Via Dashboard:

1. **Acesse:** https://dashboard.fly.io
2. **Clique em:** "New" → "Postgres"
3. **IMPORTANTE:** Escolha **"Unmanaged Postgres"** (não "Managed Postgres")
4. **Configure:**
   - **App Name:** `evolution-db-free`
   - **Region:** `gru` (São Paulo)
   - **VM Size:** `shared-cpu-1x`
   - **Volume Size:** `1 GB`
5. **Clique em:** "Create"
6. **Aguarde 2-3 minutos**

---

## ⚡ PASSO 2: Obter Connection String

**Após criar:**

1. **Acesse:** https://dashboard.fly.io/apps/evolution-db-free
2. **Vá em:** "Connection" ou "Settings" → "Connection"
3. **Copie a connection string** completa

**Formato esperado:**
```
postgresql://postgres:senha@evolution-db-free.fly.dev:5432/evolution_db_free
```

---

## ⚡ PASSO 3: Configurar Evolution API

**Depois de obter a connection string, execute:**

```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"

# COLE A CONNECTION STRING AQUI
fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="COLE_A_STRING_AQUI" --app evolution-api-barbearia

# Redeploy
fly deploy --app evolution-api-barbearia
```

---

## ✅ VANTAGENS

- ✅ **100% GRATUITO** (usa free tier do Fly.io)
- ✅ **Mesma funcionalidade** para nosso caso
- ✅ **Sem custos mensais**

---

**Siga os 3 passos acima e me avise quando tiver a connection string!** 🚀
