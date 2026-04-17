# 🔧 Corrigir Erro 404 na Edge Function API

## ❌ Problema Identificado

**Erro:** `POST https://wabefmgfsatlusevxyfo.supabase.co/functions/v1/api 404 (Not Found)`

Isso indica que:
1. A Edge Function `api` não está deployada no Supabase
2. OU a rota não está configurada corretamente

---

## ✅ Solução Aplicada

**Código corrigido:**
- Edge Function agora aceita `POST` além de `PUT` para a rota `/admin/users/:id/role`
- Isso resolve o problema quando chamado via `supabase.functions.invoke()`

---

## 🚀 Deploy da Edge Function

### Opção 1: Via Supabase CLI (Recomendado)

```powershell
# 1. Fazer login (se ainda não fez)
npx supabase login

# 2. Linkar projeto (se ainda não linkou)
npx supabase link --project-ref wabefmgfsatlusevxyfo

# 3. Fazer deploy da função api
npx supabase functions deploy api
```

### Opção 2: Via Dashboard do Supabase

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions
2. **Procure por:** função `api`
3. **Se não existir:**
   - Clique em "Create a new function"
   - Nome: `api`
   - Cole o conteúdo de `supabase/functions/api/index.ts`
   - Deploy

---

## ✅ Verificar se Funcionou

Após fazer deploy:

1. **Teste no painel admin:**
   - Acesse: `http://localhost:8080/admin`
   - Vá em: Usuários
   - Edite um usuário
   - Remova o tempo de experiência
   - Salve

2. **Se ainda der erro 404:**
   - Verifique se a função foi deployada:
     - Dashboard → Functions → `api` deve aparecer
   - Verifique logs:
     - Dashboard → Logs → Edge Functions → `api`

---

## 🔍 Verificar Logs

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/logs/edge-functions
2. **Filtre por:** `api`
3. **Veja se há erros** ou se a requisição está chegando

---

## 📋 Checklist

- [ ] Edge Function `api` está deployada?
- [ ] Código atualizado aceita POST? ✅ (já corrigido)
- [ ] Testou remover experiência novamente?
- [ ] Verificou logs se ainda der erro?

---

## 💡 Nota

O código já foi corrigido para aceitar `POST`. Agora só precisa fazer deploy da função atualizada.

---

**Status:** ✅ Código corrigido - Faça deploy da função `api`
