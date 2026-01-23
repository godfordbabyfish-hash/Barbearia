# 🔧 CORRIGIR CONNECTION STRING - ERRO "Tenant or user not found"

## ❌ PROBLEMA

O erro `FATAL: Tenant or user not found` indica que o formato da connection string está incorreto.

---

## ✅ SOLUÇÃO: Obter Connection String Correta

### OPÇÃO 1: Via Dashboard Supabase (RECOMENDADO)

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database/connection

2. **Procure por uma destas seções:**
   - **"Connection string"** (URI)
   - **"Connection pooling"** 
   - **"Direct connection"**

3. **Copie a string COMPLETA** que aparece lá (não construa manualmente)

4. **IMPORTANTE:** A string deve ter este formato:
   ```
   postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres
   ```
   
   **OU:**
   ```
   postgresql://postgres.[PROJECT]:[PASSWORD]@[HOST]:[PORT]/postgres
   ```

---

### OPÇÃO 2: Via API Settings

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/api

2. **Procure por:** "Database URL" ou "Connection string"

3. **Copie a string completa**

---

### OPÇÃO 3: Verificar Região

O Supabase pode estar em outra região. Tente estas variações:

**Substitua `sa-east-1` por:**
- `us-east-1` (EUA Leste)
- `eu-west-1` (Europa)  
- `ap-southeast-1` (Ásia)

**Formato:**
```
postgresql://postgres.wabefmgfsatlusevxyfo:pFgNQxhpdCkmxED1@aws-0-[REGIAO].pooler.supabase.com:5432/postgres
```

---

## 🎯 EXECUTAR AGORA

**Depois de obter a connection string correta:**

```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"
fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="STRING_CORRETA_AQUI" --app evolution-api-barbearia
fly deploy --app evolution-api-barbearia
```

---

**Obtenha a connection string do dashboard e me avise!** 🚀
