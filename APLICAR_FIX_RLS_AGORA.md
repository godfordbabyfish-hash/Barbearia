# ⚠️ CRÍTICO: Aplicar Correção RLS AGORA

## 🔴 Problema Identificado (via Logs)

Os logs mostraram:
- ✅ Signup funcionou (usuário criado)
- ❌ INSERT em `profiles` FALHOU: Erro 42501 (RLS bloqueando)
- ❌ INSERT em `user_roles` FALHOU: Erro 42501 (RLS bloqueando)

## ✅ Solução

Execute o script `supabase/fix_rls_final.sql` no Supabase **AGORA**!

### Passo a Passo:

1. **Abra o arquivo:** `supabase/fix_rls_final.sql`

2. **Acesse o SQL Editor do Supabase:**
   - https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql

3. **Copie TODO o conteúdo** do arquivo `fix_rls_final.sql`

4. **Cole no SQL Editor**

5. **Clique em "Run"**

6. **✅ Pronto!**

## 🔍 O Que Este Script Faz

1. ✅ Recria `handle_new_user` com `SET search_path = public, auth` (importante!)
2. ✅ Garante que o trigger existe e está correto
3. ✅ **CRIA políticas de INSERT** que faltavam:
   - `Users can insert own profile` - Permite INSERT em profiles
   - `Users can insert own role` - Permite INSERT em user_roles
4. ✅ Mantém outras políticas necessárias

## 🧪 Depois de Aplicar

1. Limpe o cache do navegador
2. Tente criar conta novamente
3. Deve funcionar! ✅

## 📊 Evidência dos Logs

Os logs confirmaram:
```json
{
  "location": "AuthContext.tsx:151",
  "message": "Profile upsert result",
  "data": {
    "hasError": true,
    "errorCode": "42501",
    "errorMessage": "new row violates row-level security policy (USING expression) for table \"profiles\"",
    "status": 401
  }
}
```

Isso confirma que faltam políticas de INSERT! O script corrige isso.

---

**⚠️ IMPORTANTE:** Execute o script ANTES de testar novamente!
