# 🚀 MIGRAR PARA POSTGRESQL GRATUITO - URGENTE

## ⚠️ SITUAÇÃO

O Managed Postgres custa **$38/mês**. Precisamos migrar para **Unmanaged Postgres** (gratuito).

---

## ✅ PASSO 1: Deletar Managed Postgres (Pago)

1. **Acesse:** https://dashboard.fly.io/managed_postgres/9g6y30w4dd9rv5ml
2. **Clique em:** "Settings" → "Destroy Cluster" ou "Delete"
3. **Confirme a exclusão**

**OU via CLI:**
```powershell
fly mpg destroy 9g6y30w4dd9rv5ml
```

---

## ✅ PASSO 2: Criar PostgreSQL Gratuito (Unmanaged)

### Via Dashboard (RECOMENDADO):

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

## ✅ PASSO 3: Obter Connection String

**Após criar:**

1. **Acesse:** https://dashboard.fly.io/apps/evolution-db-free
2. **Vá em:** "Connection" ou "Settings" → "Connection"
3. **Copie a connection string** completa

**Formato esperado:**
```
postgresql://postgres:senha@evolution-db-free.fly.dev:5432/evolution_db_free
```

---

## ✅ PASSO 4: Configurar Evolution API

**Depois de obter a connection string, execute:**

```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"

# COLE A CONNECTION STRING AQUI
fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="COLE_A_STRING_AQUI" --app evolution-api-barbearia

# Redeploy
fly deploy --app evolution-api-barbearia
```

---

## ✅ VANTAGENS DO UNMANAGED

- ✅ **100% GRATUITO** (usa free tier do Fly.io)
- ✅ **Mesma funcionalidade** para nosso caso
- ⚠️ **Sem suporte** (mas não precisamos para uso simples)

---

## ⚡ EXECUTE AGORA

**Siga os 4 passos acima e me avise quando tiver a connection string!** 🚀
