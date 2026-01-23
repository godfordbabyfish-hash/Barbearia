# 🎯 ONDE CLICAR EXATO - GUIA VISUAL

## 📍 VOCÊ ESTÁ AQUI AGORA

Você está em: **Database → Settings** (página de configurações)

**Nesta página você vê:**
- Database password
- Connection pooling configuration (apenas configurações, não a string!)
- SSL Configuration

**❌ A connection string NÃO está aqui!**

---

## ✅ ONDE ESTÁ A CONNECTION STRING

### PASSO 1: No Menu Lateral Esquerdo

**Olhe para o menu lateral esquerdo** (onde está "Database" expandido)

**Você verá:**
```
DATABASE MANAGEMENT
  ├─ Connection  ← **CLIQUE AQUI!**
  └─ Settings    ← (você está aqui agora)
```

### PASSO 2: Clique em "Connection"

**Clique em "Connection"** (não "Settings")

---

## 📋 O QUE VOCÊ VAI VER

Na página **"Connection"**, você verá:

1. **"Connection string"** ou **"URI"**
   - Uma string que começa com `postgresql://`
   - Botão "Copy" ao lado

2. **"Connection pooling"**
   - String para pooling (porta 6543)

3. **"Direct connection"**
   - String direta (porta 5432)

---

## ⚡ LINK DIRETO

**Ou acesse diretamente:**
https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database/connection

---

## ✅ DEPOIS DE COPIAR

Execute:

```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"
fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="COLE_A_STRING_AQUI" --app evolution-api-barbearia
fly deploy --app evolution-api-barbearia
```

---

**Clique em "Connection" no menu lateral e copie a string!** 🚀
