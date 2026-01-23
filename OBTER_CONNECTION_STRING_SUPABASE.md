# 🔗 ONDE PEGAR A CONNECTION STRING DO SUPABASE

## 📍 PASSO A PASSO VISUAL

### PASSO 1: Acesse o Dashboard
Você já está aqui: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo

### PASSO 2: Vá para Database → Connection

**No menu lateral esquerdo:**
1. Clique em **"Database"** (já está expandido)
2. **NÃO** clique em "Settings" (onde você está agora)
3. Clique em **"Connection"** ou **"Connection string"**

**OU:**

1. Vá em: **Settings** → **Database** → **Connection**

### PASSO 3: Copiar a Connection String

Na página de **Connection**, você verá várias opções:

**Procure por:**
- **"Connection string"** ou **"URI"**
- **"Connection pooling"** (recomendado para aplicações)
- **"Direct connection"** (para ferramentas)

**Formato esperado:**
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**OU (connection direta):**
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

---

## ⚡ LINK DIRETO

**Tente este link direto:**
https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database/connection

---

## 📋 O QUE PROCURAR

Na página de Connection, você verá:

1. **Connection pooling** (porta 6543) - **USE ESTE!**
2. **Direct connection** (porta 5432) - Alternativa
3. **Session mode** - Outra opção

**Copie a string que começa com `postgresql://`**

---

## ✅ DEPOIS DE COPIAR

Execute este comando (substitua `SUA_STRING`):

```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"
fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="SUA_STRING" --app evolution-api-barbearia
```

**Depois:**
```powershell
fly deploy --app evolution-api-barbearia
```

---

**Encontrou? Me avise e eu ajudo a configurar!** 🚀
