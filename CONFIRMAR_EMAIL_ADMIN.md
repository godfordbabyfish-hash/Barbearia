# ✅ Confirmar Email do Admin - Soluções

## 🔴 Problema Identificado

O login do admin falha com: **"Email not confirmed"**

Isso acontece porque o usuário admin foi criado antes de desabilitar a confirmação de email, ou a confirmação ainda está habilitada.

## ✅ SOLUÇÃO 1: Confirmar Email Manualmente no Supabase (Rápido)

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/auth/users

2. **Encontre o usuário admin:**
   - Procure por `admin@admin.com`
   - Clique no usuário

3. **Confirme o email:**
   - Procure por "Email Confirmed" ou "Confirm email"
   - Clique para confirmar manualmente
   - Ou marque como "Email Confirmed"

4. **Teste login novamente**

## ✅ SOLUÇÃO 2: Desabilitar Confirmação de Email (Recomendado)

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/auth/providers

2. **Vá na seção "User Signups"** (ou Authentication → Settings)

3. **Desmarque "Confirm email"**
   - Procure por "Confirm email" ou "Email confirmation required"
   - DESMARQUE a opção

4. **Clique em "Save changes"**

5. **Teste login novamente**

## ✅ SOLUÇÃO 3: Recriar Usuário Admin (Se necessário)

Se as soluções acima não funcionarem, você pode:

1. **Deletar o usuário admin antigo:**
   - Supabase → Authentication → Users
   - Encontre `admin@admin.com`
   - Delete o usuário

2. **Criar novo admin:**
   - Acesse: http://localhost:8080/admin-setup
   - Clique em "Criar Usuário Admin"
   - O usuário será criado sem necessidade de confirmação

## 🧪 Após Aplicar

1. Limpe cache do navegador
2. Tente fazer login com:
   - Email: `admin@admin.com`
   - Senha: `1823108`
3. Deve funcionar!

---

**Recomendação:** Use a SOLUÇÃO 2 (desabilitar confirmação) pois é mais simples e resolve para todos os usuários.
