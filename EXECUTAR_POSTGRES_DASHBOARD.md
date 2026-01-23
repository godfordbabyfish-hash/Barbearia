# 🚀 CRIAR POSTGRESQL VIA DASHBOARD - RÁPIDO

## ⚡ EXECUTE AGORA

### PASSO 1: Criar PostgreSQL

1. **Acesse:** https://dashboard.fly.io
2. **Clique em:** "New" → "Postgres" (ou "Create Postgres")
3. **Configure:**
   - **App Name:** `evolution-db`
   - **Region:** `gru` (São Paulo)
   - **VM Size:** `shared-cpu-1x`
   - **Volume Size:** `1 GB`
4. **Clique em:** "Create"
5. **Aguarde 2-3 minutos**

---

### PASSO 2: Obter Connection String

1. **Acesse:** https://dashboard.fly.io/apps/evolution-db
2. **Vá em:** "Connection" ou "Settings" → "Connection"
3. **Copie a connection string** (formato: `postgresql://user:pass@host:port/db`)

**OU procure por:**
- "Connection string"
- "DATABASE_URL"
- "Postgres connection"

---

### PASSO 3: Configurar Evolution API

**Cole a connection string aqui e execute:**

```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"

# SUBSTITUA "SUA_CONNECTION_STRING" pela string real que você copiou
fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="SUA_CONNECTION_STRING" --app evolution-api-barbearia
```

**Exemplo:**
```powershell
fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="postgresql://postgres:abc123@evolution-db.fly.dev:5432/evolution_db" --app evolution-api-barbearia
```

---

### PASSO 4: Redeploy

```powershell
fly deploy --app evolution-api-barbearia
```

**Aguarde 2-3 minutos.**

---

### PASSO 5: Testar

```powershell
Start-Sleep -Seconds 60
Invoke-WebRequest -Uri "https://evolution-api-barbearia.fly.dev/health"
```

---

## ✅ PRONTO!

**Me avise quando terminar o PASSO 2 para eu ajudar a configurar!** 🚀
