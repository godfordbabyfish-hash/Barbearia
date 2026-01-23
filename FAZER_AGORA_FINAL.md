# ⚡ FAZER AGORA - CONFIGURAR DATABASE

## 🎯 PROBLEMA

O Evolution API precisa de PostgreSQL para funcionar. Sem banco, ele crasha.

---

## ✅ SOLUÇÃO: 2 OPÇÕES

### OPÇÃO 1: Usar Supabase PostgreSQL (MAIS RÁPIDO)

**Vantagem:** Já existe, só precisa da connection string.

#### Passo 1: Obter Connection String do Supabase

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database
2. **Vá em:** "Connection string" ou "Connection pooling"
3. **Copie** a connection string (formato: `postgresql://postgres.[PROJECT]:[PASSWORD]@...`)

#### Passo 2: Configurar

```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"

# SUBSTITUA "SUA_CONNECTION_STRING" pela string que você copiou
fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="SUA_CONNECTION_STRING" --app evolution-api-barbearia
```

#### Passo 3: Redeploy

```powershell
fly deploy --app evolution-api-barbearia
```

---

### OPÇÃO 2: Criar PostgreSQL no Fly.io (GRATUITO)

**Vantagem:** Dedicado, mais controle.

#### Passo 1: Criar PostgreSQL

1. **Acesse:** https://dashboard.fly.io
2. **Clique:** "New" → "Postgres"
3. **Configure:**
   - Nome: `evolution-db`
   - Region: `gru`
   - VM: `shared-cpu-1x`
   - Volume: `1 GB`
4. **Clique:** "Create"
5. **Aguarde:** 2-3 minutos

#### Passo 2: Obter Connection String

1. **Acesse:** https://dashboard.fly.io/apps/evolution-db
2. **Vá em:** "Connection" ou "Settings"
3. **Copie** a connection string

#### Passo 3: Configurar

```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"

fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="SUA_CONNECTION_STRING" --app evolution-api-barbearia
```

#### Passo 4: Redeploy

```powershell
fly deploy --app evolution-api-barbearia
```

---

## ✅ APÓS CONFIGURAR

```powershell
# Aguardar 1-2 minutos
Start-Sleep -Seconds 60

# Testar
Invoke-WebRequest -Uri "https://evolution-api-barbearia.fly.dev/health"

# Ver logs
fly logs --app evolution-api-barbearia
```

---

## 🎉 PRONTO!

**Escolha uma opção acima e execute!** 🚀

**Recomendação:** Use a **OPÇÃO 1** (Supabase) - é mais rápido!
