# 🚀 CONFIGURAR POSTGRESQL AGORA - PASSO A PASSO

## ⚠️ PROBLEMA

O Evolution API **precisa de PostgreSQL** para inicializar, mesmo que não use para dados.

---

## ✅ SOLUÇÃO: Criar PostgreSQL no Fly.io

### PASSO 1: Criar PostgreSQL

**No PowerShell:**
```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"
fly postgres create --name evolution-db --region gru --vm-size shared-cpu-1x --volume-size 1
```

**OU via Dashboard:**
1. Acesse: https://dashboard.fly.io
2. Clique em "New" → "Postgres"
3. Nome: `evolution-db`
4. Region: `gru` (São Paulo)
5. VM Size: `shared-cpu-1x`
6. Volume: `1 GB`
7. Clique em "Create"

**Aguarde 2-3 minutos para criar.**

---

### PASSO 2: Obter Connection String

**Opção A - Via Dashboard:**
1. Acesse: https://dashboard.fly.io/apps/evolution-db
2. Vá em "Connection" ou "Settings"
3. Copie a connection string (formato: `postgresql://user:pass@host:port/db`)

**Opção B - Via CLI:**
```powershell
fly postgres connect -a evolution-db
# Dentro do psql, execute: \conninfo
# OU
fly postgres db show -a evolution-db
```

---

### PASSO 3: Configurar Evolution API

**Substitua `SUA_CONNECTION_STRING` pela string real:**

```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"

fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="SUA_CONNECTION_STRING" --app evolution-api-barbearia
```

**Exemplo:**
```powershell
fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="postgresql://postgres:senha@evolution-db.fly.dev:5432/evolution_db" --app evolution-api-barbearia
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
# Aguardar 1-2 minutos
Start-Sleep -Seconds 60

# Testar
Invoke-WebRequest -Uri "https://evolution-api-barbearia.fly.dev/health"
```

---

## ✅ PRONTO!

Agora o Evolution API deve iniciar corretamente! 🎉

---

**Execute os passos acima e me avise quando terminar!** 🚀
