# 🔧 Desabilitar Verificação de JWT na Edge Function

## 🔴 Problema

A função `api` está retornando **401 (Unauthorized)** porque está configurada para verificar JWT obrigatoriamente. Isso acontece quando a função é criada manualmente no dashboard, pois a configuração `verify_jwt = false` do `config.toml` não é aplicada automaticamente.

## ✅ SOLUÇÃO: Desabilitar Verificação de JWT no Dashboard

### Passo 1: Acessar a Função

1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions
2. Clique na função **`api`**

### Passo 2: Desabilitar Verificação de JWT

1. Procure por uma seção **"Settings"** ou **"Configuration"** ou **"Security"**
2. Procure por uma opção como:
   - **"Verify JWT"** 
   - **"Require JWT verification"**
   - **"JWT Verification"**
   - **"Authentication"**
3. **Desabilite** essa opção (deve estar como "Enabled" ou "On")
4. Salve as alterações

### Passo 3: Alternativa - Verificar nas Configurações da Função

Se não encontrar a opção acima, tente:

1. Na página da função `api`, procure por um botão **"Settings"** ou **"⚙️"** (ícone de engrenagem)
2. Procure por configurações de segurança ou autenticação
3. Desabilite a verificação de JWT

### Passo 4: Verificar se Funcionou

1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Recarregue a página (Ctrl+F5)
3. Acesse o Painel Admin → aba "Usuários"
4. Deve carregar sem erro 401

## 🔍 Se Não Encontrar a Opção

Se não encontrar a opção para desabilitar JWT no dashboard, você pode:

### Opção A: Fazer Deploy via CLI (Aplica `verify_jwt = false`)

1. Use o comando:
   ```powershell
   npx supabase functions deploy api --no-verify-jwt
   ```

   Ou se tiver o CLI instalado:
   ```powershell
   supabase functions deploy api --no-verify-jwt
   ```

### Opção B: Verificar Logs da Função

1. No dashboard, vá em **"Logs"** da função `api`
2. Veja se há mensagens sobre autenticação
3. Os logs que adicionamos devem aparecer lá

---

**Após desabilitar a verificação de JWT, a aba "Usuários" deve funcionar!** 🎉
