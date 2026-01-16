# 🔧 Corrigir Role do Admin

## 🔴 Problema

O usuário admin consegue fazer login, mas não tem acesso às funcionalidades administrativas porque não tem a role "admin" atribuída na tabela `user_roles`.

## ✅ SOLUÇÃO: Aplicar Script SQL

### Passo 1: Acessar SQL Editor no Supabase

1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql
2. Clique em "New query"

### Passo 2: Copiar e Executar o Script

1. Abra o arquivo: `supabase/fix_admin_role.sql`
2. **Copie TODO o conteúdo** do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"** ou pressione `Ctrl+Enter`

### O que o script faz:

1. ✅ Verifica se o usuário `admin@admin.com` existe
2. ✅ Verifica se o usuário tem role na tabela `user_roles`
3. ✅ **Remove roles antigas** (se houver)
4. ✅ **Adiciona role "admin"** ao usuário
5. ✅ Mostra resultado final

### Passo 3: Confirmar Email (se necessário)

Se o script mostrar que `email_confirmed_at` é NULL, execute também:

```sql
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'admin@admin.com';
```

### Passo 4: Testar Login

1. **Limpe o cache do navegador** (Ctrl+Shift+Del)
2. Faça logout (se estiver logado)
3. Tente fazer login novamente:
   - Email: `admin@admin.com`
   - Senha: `1823108`
4. Deve redirecionar para `/admin` e ter acesso total!

## 📊 Verificar se Funcionou

Após executar o script, os logs mostrarão:
- ✅ `FetchUserRole result` com `roles: ["admin"]`
- ✅ `FetchUserRole - final role determined` com `finalRole: "admin"`
- ✅ `AdminDashboard - access allowed` (sem redirecionamento)

## ⚠️ Se Ainda Não Funcionar

1. Verifique os logs no console (F12)
2. Os logs mostrarão exatamente qual role está sendo retornada
3. Compartilhe os logs para análise
