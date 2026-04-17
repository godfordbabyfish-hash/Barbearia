# 🔍 ENCONTRAR CONNECTION STRING - MÉTODO ALTERNATIVO

## 📍 SE NÃO ENCONTROU NA PÁGINA "CONNECTION"

### OPÇÃO 1: Via API Settings (Mais Fácil)

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/api
2. **Procure por:** "Database" ou "Connection string"
3. **OU procure por:** "Project URL" e "Database URL"

### OPÇÃO 2: Via SQL Editor

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new
2. **Execute este SQL:**
   ```sql
   SELECT current_database(), current_user, inet_server_addr(), inet_server_port();
   ```
3. Isso mostra informações do banco

### OPÇÃO 3: Construir Manualmente

**Formato padrão do Supabase:**
```
postgresql://postgres.wabefmgfsatlusevxyfo:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

**Onde encontrar a SENHA:**
1. Vá em: **Settings** → **Database** → **Settings**
2. Clique em **"Reset database password"**
3. Copie a senha gerada
4. Use essa senha na connection string

---

## ⚡ MÉTODO RÁPIDO: Resetar Senha e Construir

### PASSO 1: Resetar Senha do Banco

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database
2. **Clique em:** "Reset database password"
3. **Copie a senha** que aparecer

### PASSO 2: Construir Connection String

**Use este formato (substitua [SENHA]):**
```
postgresql://postgres.wabefmgfsatlusevxyfo:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

**OU tente estas variações de região:**
- `aws-0-sa-east-1` (São Paulo)
- `aws-0-us-east-1` (EUA Leste)
- `aws-0-eu-west-1` (Europa)

---

## 🎯 EXECUTAR AGORA

Depois de ter a senha, execute:

```powershell
.\configurar-com-supabase-agora.ps1
```

**Cole a connection string completa quando pedir.**

---

**Precisa de mais ajuda? Me avise!** 🚀
