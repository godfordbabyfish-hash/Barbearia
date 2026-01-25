# 🧪 Testar Atualização de Senha - Debug Completo

## ⚠️ Problema Atual

Senha alterada para `182310` mas login ainda não funciona com "Invalid login credentials".

---

## ✅ Correções Aplicadas

### 1. Método Duplo de Atualização

**Arquivo:** `supabase/functions/api/index.ts`

- ✅ Tenta primeiro `updateUserById` (método padrão)
- ✅ Se falhar, usa API REST diretamente como fallback
- ✅ Logs detalhados em cada etapa
- ✅ Verificação pós-atualização

### 2. Logs Melhorados

- Loga o email do usuário antes e depois
- Verifica se email está confirmado
- Mostra erros detalhados se houver

---

## 🚀 Passos para Testar

### 1. Fazer Deploy da Correção

```powershell
cd "C:\Users\thiag\Downloads\Barbearia"
npx supabase functions deploy api --project-ref wabefmgfsatlusevxyfo
```

**OU via Dashboard:**
- https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions
- Selecione `api` → Deploy

---

### 2. Verificar Logs ANTES de Alterar Senha

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions/api/logs
2. **Deixe os logs abertos** para ver o que acontece

---

### 3. Alterar Senha Novamente

1. **Painel Admin** → Usuários
2. **Selecione:** `thiagopinheeir@gmail.com`
3. **Clique em:** Alterar senha (ícone de chave)
4. **Digite:** `182310` (ou outra senha de teste)
5. **Salve**

---

### 4. Verificar Logs IMEDIATAMENTE

Após salvar, verifique os logs:

**Procure por:**
- `✅ Senha atualizada com sucesso` → **SUCESSO**
- `❌ Erro ao atualizar senha` → **ERRO** (compartilhe o erro)
- `Tentando método alternativo` → Método padrão falhou, usando fallback
- `Verificação: Usuário ... existe e está ativo` → Confirmação

**Compartilhe os logs completos** se houver erro!

---

### 5. Testar Login

1. **Faça logout completo** (Ctrl+Shift+Delete para limpar cache também)
2. **Aguarde 5 segundos**
3. **Tente fazer login:**
   - Email: `thiagopinheeir@gmail.com`
   - Senha: `182310`
4. **Se não funcionar:** Compartilhe a mensagem de erro exata

---

## 🔍 Verificações Adicionais

### Verificar no Supabase Dashboard

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/auth/users
2. **Procure por:** `thiagopinheeir@gmail.com`
3. **Verifique:**
   - ✅ Email está confirmado? (deve ter data em "Email Confirmed")
   - ✅ Usuário está ativo?
   - ✅ Última atualização foi agora?

---

### Verificar Configurações de Auth

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/auth/settings
2. **Verifique:**
   - "Secure password change" → **DESABILITAR temporariamente**
   - "Email confirmation" → Verificar configuração

---

## 📋 Checklist de Debug

- [ ] Deploy realizado
- [ ] Logs abertos antes de alterar senha
- [ ] Senha alterada (sem erros no frontend)
- [ ] Logs mostram sucesso ou erro específico
- [ ] Email confirmado no dashboard
- [ ] Logout completo realizado
- [ ] Cache limpo
- [ ] Login testado com nova senha
- [ ] Erro compartilhado (se ainda não funcionar)

---

## 🆘 Se Ainda Não Funcionar

**Compartilhe:**

1. **Logs completos** da Edge Function (copie tudo)
2. **Screenshot** da tela de login com erro
3. **Mensagem de erro exata** do frontend
4. **Status do usuário** no Supabase Dashboard (email confirmado, etc.)

---

## 💡 Solução Alternativa (Se Nada Funcionar)

Se mesmo assim não funcionar, podemos:

1. **Deletar e recriar o usuário** (último recurso)
2. **Usar reset de senha via email** (método recomendado pelo Supabase)
3. **Verificar se há problema com o projeto Supabase** (versão, configurações)

---

**Faça o deploy e teste seguindo os passos acima! 🚀**
