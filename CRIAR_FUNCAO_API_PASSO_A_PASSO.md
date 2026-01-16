# 🚀 Criar Função API - Passo a Passo

## 📍 Situação Atual

A função `api` ainda não existe no Supabase. Precisamos criá-la usando o código correto do arquivo local.

## ✅ PASSOS PARA CRIAR A FUNÇÃO

### Passo 1: Abrir o Editor

No dashboard do Supabase que você está vendo:

1. Clique no botão verde **"Deploy a new function"** (canto superior direito)
2. No dropdown, clique em **"Via Editor"** (primeira opção)
3. Uma nova página/editor será aberta

### Passo 2: Configurar o Nome da Função

No editor que abrir:

1. Procure por um campo **"Function name"** ou **"Name"**
2. Digite exatamente: **`api`** (minúsculo, sem espaços)

### Passo 3: Copiar o Código Completo

1. Abra o arquivo local no seu computador:
   - Caminho: `supabase/functions/api/index.ts`
   
2. Selecione TODO o conteúdo:
   - Pressione `Ctrl + A` (Windows) ou `Cmd + A` (Mac)
   
3. Copie:
   - Pressione `Ctrl + C` (Windows) ou `Cmd + C` (Mac)

### Passo 4: Colar no Editor do Supabase

1. No editor do Supabase, selecione TODO o código de exemplo (se houver)
2. Delete ou substitua pelo código copiado
3. Cole o código completo (`Ctrl + V` ou `Cmd + V`)

### Passo 5: Verificar se o Código Está Correto

Confirme que o código contém estas linhas importantes:

**No início (linha ~4-8):**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',  // ← Deve ter PUT
};
```

**Na função serve (linha ~690-695):**
```typescript
serve(async (req) => {
  // Handle CORS preflight - must return 200 or 204 with CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,  // ← DEVE ter status: 204
      headers: corsHeaders 
    });
  }
```

### Passo 6: Fazer Deploy

1. Role até o final da página
2. Clique no botão **"Deploy"** ou **"Deploy function"**
3. Aguarde alguns segundos - o deploy pode levar 10-30 segundos

### Passo 7: Configurar Variáveis de Ambiente

**IMPORTANTE:** Após o deploy, configure as variáveis de ambiente:

1. Na página da função `api`, procure por **"Settings"** ou **"Secrets"** ou **"Environment Variables"**
2. Adicione as seguintes variáveis:

   - **Nome:** `SUPABASE_URL`
     **Valor:** `https://wabefmgfsatlusevxyfo.supabase.co`

   - **Nome:** `SUPABASE_SERVICE_ROLE_KEY`
     **Valor:** (sua chave service_role - obtenha em Settings > API)

   - **Nome:** `SUPABASE_ANON_KEY` (opcional, mas recomendado)
     **Valor:** (sua chave anon/public - obtenha em Settings > API)

**Onde obter as chaves:**
- Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/api
- Copie:
  - **Project URL** → `SUPABASE_URL`
  - **anon public** → `SUPABASE_ANON_KEY`
  - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### Passo 8: Verificar que a Função Foi Criada

1. Volte para a lista de Edge Functions
2. Você deve ver a função **`api`** na lista
3. A URL deve ser: `https://wabefmgfsatlusevxyfo.supabase.co/functions/v1/api`

### Passo 9: Testar

1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Acesse o Painel Admin do seu app
3. Faça login como admin
4. Clique na aba **"Usuários"**
5. Deve carregar sem erros! ✅

## 🔍 Se Algo Der Errado

### A função não aparece na lista?
- Verifique se o nome está exatamente `api` (minúsculo)
- Aguarde alguns minutos - pode levar tempo para aparecer

### Erro de CORS ainda persiste?
- Verifique se copiou TODO o código (deve ter ~1280 linhas)
- Verifique se o OPTIONS tem `status: 204`
- Verifique se `PUT` está nos métodos permitidos

### Erro ao fazer deploy?
- Verifique se há erros de sintaxe no código
- Tente colar novamente o código completo

## 📝 Checklist Final

- [ ] Função criada com nome `api`
- [ ] Código completo copiado (1280 linhas)
- [ ] Deploy realizado com sucesso
- [ ] Variáveis de ambiente configuradas:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `SUPABASE_ANON_KEY` (opcional)
- [ ] Função aparece na lista de Edge Functions
- [ ] Aba "Usuários" carrega sem erros

---

**Depois de seguir esses passos, a aba "Usuários" deve funcionar perfeitamente!** 🎉
