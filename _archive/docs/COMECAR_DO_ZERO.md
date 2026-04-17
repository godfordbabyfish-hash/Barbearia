# 🚀 COMEÇAR POSTGRESQL DO ZERO

## 🎯 OBJETIVO

Remover todos os PostgreSQL existentes e criar um novo do zero, limpo e configurado corretamente.

---

## ⚡ PASSO 1: REMOVER TODOS OS POSTGRESQL

**Execute o script:**
```powershell
.\remover-todos-postgres.ps1
```

**O script vai:**
1. Listar todos os apps PostgreSQL
2. Pedir confirmação para deletar
3. Deletar todos os PostgreSQL encontrados

**⚠️ Se algum não deletar via CLI, delete manualmente no dashboard:**
- Acesse: https://dashboard.fly.io
- Clique no app PostgreSQL
- Settings → Delete App

---

## ⚡ PASSO 2: CRIAR NOVO POSTGRESQL

**No dashboard Fly.io:**

1. **Acesse:** https://dashboard.fly.io
2. **Clique em:** "New" → "Postgres"
3. **IMPORTANTE:** Escolha **"Unmanaged Postgres"** (gratuito)
   - ❌ **NÃO escolha "Managed Postgres"** (pago - $38/mês)
4. **Configure:**
   - **App Name:** `evolution-db`
   - **Region:** `gru` (São Paulo - Brazil)
   - **VM Size:** `shared-cpu-1x`
   - **Volume Size:** `1 GB`
5. **Clique em:** "Create"
6. **Aguarde 2-3 minutos** para criar

---

## ⚡ PASSO 3: OBTER CONNECTION STRING

**Após criar:**

1. **Acesse:** https://dashboard.fly.io/apps/evolution-db
2. **Vá em:** "Connection" ou "Settings" → "Connection"
3. **Copie a connection string** completa

**Formato esperado:**
```
postgresql://postgres:senha@evolution-db.fly.dev:5432/evolution_db
```

---

## ⚡ PASSO 4: CONFIGURAR EVOLUTION API

**Execute o script:**
```powershell
.\configurar-novo-postgres.ps1
```

**O script vai:**
1. Pedir a connection string
2. Configurar a Evolution API
3. Reiniciar as máquinas

---

## ✅ RESULTADO ESPERADO

- ✅ Todos os PostgreSQL antigos removidos
- ✅ Novo PostgreSQL criado (gratuito)
- ✅ Evolution API configurada
- ✅ Tudo funcionando do zero!

---

## 🎯 ORDEM DE EXECUÇÃO

1. ✅ `.\remover-todos-postgres.ps1` (deletar antigos)
2. ✅ Criar novo PostgreSQL no dashboard
3. ✅ `.\configurar-novo-postgres.ps1` (configurar)

---

**Status:** 🚀 **PRONTO PARA COMEÇAR DO ZERO!**
