# 🔄 MIGRAR PARA POSTGRESQL DO FLY.IO

## 🎯 MOTIVO DA MIGRAÇÃO

**Lembrando:** Migramos do Railway porque:
1. ✅ **Railway era temporário** (usado quando o dashboard Fly.io não estava acessível)
2. ✅ **Fly.io tem PostgreSQL gratuito** (Unmanaged Postgres)
3. ✅ **Tudo em um lugar** (Evolution API + Database no mesmo provider)
4. ✅ **Melhor performance** (mesma rede)

---

## 📊 SITUAÇÃO ATUAL (do dashboard)

**PostgreSQL no Fly.io:**
- ✅ **`Postgres-IS7K`** - **ONLINE** (provavelmente o Unmanaged Postgres gratuito)
- ❌ **`Postgres`** - **CRASHED há 15 horas** (provavelmente o antigo Managed Postgres pago)

**Evolution API:**
- ❌ **`evolution-api`** - **CRASHED há 13 horas** (tentando usar Railway)

---

## ⚡ AÇÃO: MIGRAR PARA FLY.IO POSTGRES

### PASSO 1: Obter Connection String do PostgreSQL Online

**No dashboard Fly.io:**
1. Acesse: https://dashboard.fly.io
2. Clique no app **`Postgres-IS7K`** (ou `postgres-is7k`)
3. Vá em **"Connection"** ou **"Settings" → "Connection"**
4. **Copie a connection string** completa

**Formato esperado:**
```
postgresql://postgres:senha@postgres-is7k.fly.dev:5432/nome_db
```

---

### PASSO 2: Configurar Evolution API

**Depois de obter a connection string, execute:**

```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"

# COLE A CONNECTION STRING AQUI
fly secrets set `
    DATABASE_ENABLED=true `
    DATABASE_PROVIDER=postgresql `
    DATABASE_CONNECTION_URI="COLE_A_STRING_AQUI" `
    --app evolution-api-barbearia

# Reiniciar
fly machines restart --app evolution-api-barbearia
```

---

### PASSO 3: Deletar PostgreSQL Crashed (OPCIONAL)

**Se quiser limpar o PostgreSQL crashed:**

**Via Dashboard:**
1. Acesse: https://dashboard.fly.io
2. Clique no app **`Postgres`** (o que está crashed)
3. Vá em **"Settings" → "Delete App"**
4. Confirme a exclusão

**⚠️ ATENÇÃO:** Só delete se tiver certeza que não precisa mais dele!

---

## ✅ VANTAGENS

- ✅ **100% no Fly.io** (tudo em um lugar)
- ✅ **Gratuito** (Unmanaged Postgres)
- ✅ **Melhor performance** (mesma rede)
- ✅ **Mais simples** (menos providers)

---

## 🎯 PRÓXIMO PASSO

**Obtenha a connection string do `Postgres-IS7K` e configure a Evolution API!**

---

**Status:** 🔄 **AGUARDANDO CONNECTION STRING**
