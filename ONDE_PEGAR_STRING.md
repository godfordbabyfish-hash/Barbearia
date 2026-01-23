# 🔗 ONDE PEGAR A CONNECTION STRING - GUIA RÁPIDO

## 📍 VOCÊ ESTÁ EM "SETTINGS" - PRECISA IR PARA "CONNECTION"

### PASSO 1: Navegar para Connection

**No menu lateral esquerdo do Supabase:**

1. Você está em: **Database** → **Settings** (onde está agora)
2. **Clique em:** **"Connection"** (logo abaixo de "Settings")
   - Ou acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database/connection

---

### PASSO 2: Encontrar a Connection String

Na página **"Connection"**, você verá várias seções:

**Procure por uma destas opções:**

1. **"Connection pooling"** ⭐ **USE ESTE!**
   - Porta: **6543**
   - Formato: `postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

2. **"Direct connection"** (alternativa)
   - Porta: **5432**
   - Formato: `postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`

3. **"Session mode"** (outra opção)

---

### PASSO 3: Copiar

**Copie a string completa** que começa com `postgresql://`

**Exemplo visual:**
```
┌─────────────────────────────────────────────────────────────┐
│ Connection pooling                                          │
│                                                             │
│ postgresql://postgres.wabefmgfsatlusevxyfo:SUA_SENHA@...   │
│                                                             │
│ [📋 Copy]                                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ LINK DIRETO

**Clique aqui para ir direto:**
https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database/connection

---

## ✅ DEPOIS DE COPIAR

**Execute este script:**
```powershell
.\configurar-com-supabase-agora.ps1
```

**OU manualmente:**
```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"
fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="COLE_A_STRING_AQUI" --app evolution-api-barbearia
fly deploy --app evolution-api-barbearia
```

---

**Encontrou? Cole a string e me avise!** 🚀
