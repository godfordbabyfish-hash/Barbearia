# 🔧 Corrigir Erros 401 (Unauthorized) - Guia Completo

## ❌ Erros Identificados

```
Failed to load resource: the server responded with a status of 401 ()
- /rest/v1/profiles?on_conflict=id
- /rest/v1/user_roles?on_conflict=user_id%2Crole
- /auth/v1/token?grant_type=password (400)
```

## 🎯 Causa do Problema

Os erros 401 indicam que as **políticas RLS (Row Level Security)** estão bloqueando:
1. Criação de perfil durante o signup
2. Criação de role durante o signup
3. Operações de autenticação

## ✅ Solução: Aplicar Correções de RLS

### Passo 1: Aplicar Script de Correção

1. **Abra o arquivo:** `supabase/fix_rls_policies.sql`

2. **Acesse o SQL Editor do Supabase:**
   - https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql

3. **Copie TODO o conteúdo do arquivo `fix_rls_policies.sql`**

4. **Cole no SQL Editor**

5. **Clique em "Run"**

6. **✅ Aguarde concluir**

---

## 🔍 O Que Este Script Faz

1. ✅ **Corrige a função `handle_new_user`** - Garante que ela pode inserir profiles e roles durante signup
2. ✅ **Adiciona política para INSERT em profiles** - Permite que usuários criem seu próprio perfil
3. ✅ **Adiciona política para INSERT em user_roles** - Permite criação de roles durante signup
4. ✅ **Corrige políticas de visualização** - Garante que usuários possam ver seus próprios dados
5. ✅ **Garante que o trigger funcione** - Recria o trigger de signup se necessário

---

## ⚠️ IMPORTANTE: Configurar URL no Supabase

Além do script SQL, você PRECISA configurar a URL do seu site no Supabase:

### Passo 2: Configurar URL de Autenticação

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/auth/url-configuration

2. **Em "Site URL"**, adicione:
   ```
   https://seu-site.netlify.app
   ```
   (Substitua `seu-site.netlify.app` pela URL real do seu site Netlify)

3. **Em "Redirect URLs"**, adicione:
   ```
   https://seu-site.netlify.app/*
   https://seu-site.netlify.app
   http://localhost:8080/*
   http://localhost:8080
   ```

4. **Clique em "Save"**

**⚠️ CRÍTICO:** Sem isso, a autenticação não funcionará!

---

## 🧪 Testar Após Aplicar Correções

1. **Limpe o cache do navegador:**
   - Ctrl+Shift+Delete
   - Ou abra em aba anônima (Ctrl+Shift+N)

2. **Acesse o site**

3. **Tente criar uma conta:**
   - Preencha o formulário
   - Clique em "Criar conta"

4. **Verifique o console (F12):**
   - Não deve ter mais erros 401
   - Se ainda tiver, me envie os erros

---

## 📋 Checklist Final

Após seguir os passos:

- [ ] Script `fix_rls_policies.sql` aplicado no Supabase
- [ ] URL do site configurada em Supabase Auth
- [ ] Redirect URLs configuradas
- [ ] Teste de criação de conta funcionando
- [ ] Console sem erros 401

---

## 🆘 Ainda com Erros 401?

Se após aplicar tudo ainda tiver erros:

1. **Verifique se o usuário está autenticado:**
   - Após criar conta, verifique se o token está sendo salvo
   - Console → Application → Local Storage → verifique se há dados do Supabase

2. **Verifique as políticas RLS:**
   - No Supabase → Table Editor → Selecione uma tabela
   - Vá em "Policies" e verifique se as políticas estão aplicadas

3. **Me envie:**
   - Erro exato do console
   - URL do seu site Netlify
   - Confirmação de que a URL está configurada no Supabase

---

## ✅ Resumo Rápido

1. ✅ Aplicar `fix_rls_policies.sql` no Supabase
2. ✅ Configurar URL do site no Supabase Auth
3. ✅ Testar criação de conta
4. ✅ Verificar console sem erros

Depois disso, tudo deve funcionar! 🎉
