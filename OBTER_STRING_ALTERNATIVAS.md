# 🔍 OBTER CONNECTION STRING - MÉTODOS ALTERNATIVOS

## ❌ O LINK NÃO EXISTE

O caminho `/settings/database/connection` não existe no seu painel do Supabase.

---

## ✅ MÉTODO 1: Via API Settings

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/api

2. **Procure por:**
   - "Database URL"
   - "Connection string"
   - "Postgres connection"

3. **Copie a string completa**

---

## ✅ MÉTODO 2: Construir Manualmente (Formato Correto)

O Supabase usa um formato específico. Vamos tentar diferentes variações:

### Formato 1: Com project ref no usuário
```
postgresql://postgres.wabefmgfsatlusevxyfo:pFgNQxhpdCkmxED1@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

### Formato 2: Usuário simples
```
postgresql://postgres:pFgNQxhpdCkmxED1@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

### Formato 3: Sem pooler
```
postgresql://postgres:pFgNQxhpdCkmxED1@db.wabefmgfsatlusevxyfo.supabase.co:5432/postgres
```

---

## ✅ MÉTODO 3: Via SQL Editor (Descobrir Host)

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new

2. **Execute este SQL:**
   ```sql
   SELECT current_database(), current_user, inet_server_addr(), inet_server_port();
   ```

3. Isso mostra o host e porta reais

---

## 🎯 VAMOS TESTAR OS FORMATOS

Execute este script que testa todos os formatos:

```powershell
.\testar-formatos-connection.ps1
```

---

**Tente o MÉTODO 1 primeiro (API Settings)!** 🚀
