# 🚀 CRIAR POSTGRESQL VIA DASHBOARD - RÁPIDO

## ⚡ EXECUTE AGORA (2 MINUTOS)

O CLI precisa de interação, então vamos criar via Dashboard:

---

### PASSO 1: Criar PostgreSQL

1. **Acesse:** https://dashboard.fly.io
2. **Clique em:** "New" → "Postgres" (ou "Create Postgres")
3. **Configure:**
   - **App Name:** `evolution-db`
   - **Region:** `gru` (São Paulo - Brazil)
   - **VM Size:** `shared-cpu-1x`
   - **Volume Size:** `1 GB`
4. **Clique em:** "Create"
5. **Aguarde 2-3 minutos** para criar

---

### PASSO 2: Obter Connection String

**Após criar:**

1. **Acesse:** https://dashboard.fly.io/apps/evolution-db
2. **Vá em:** "Connection" ou "Settings" → "Connection"
3. **Copie a connection string** completa

**Formato esperado:**
```
postgresql://postgres:senha@evolution-db.fly.dev:5432/evolution_db
```

---

### PASSO 3: Configurar (Execute quando tiver a string)

```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"

# COLE A CONNECTION STRING AQUI
fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="COLE_A_STRING_AQUI" --app evolution-api-barbearia

# Redeploy
fly deploy --app evolution-api-barbearia
```

---

## ✅ PRONTO!

**Siga os 3 passos acima e me avise quando tiver a connection string!** 🚀
