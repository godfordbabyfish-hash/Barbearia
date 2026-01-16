# 🔧 Atualizar Edge Function - Corrigir CORS

## 🔴 Problema

A Edge Function foi criada, mas está usando código antigo que não trata corretamente o CORS preflight (OPTIONS). Isso causa o erro:
```
Access to fetch at '...' has been blocked by CORS policy: Response to preflight request doesn't pass access control check
```

## ✅ SOLUÇÃO: Atualizar o Código da Função

### Passo 1: Acessar a Função no Dashboard

1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions
2. Clique na função **`api`**
3. Clique em **"Edit"** ou **"Deploy new version"**

### Passo 2: Localizar e Corrigir a Parte do OPTIONS

Procure por esta seção no início do arquivo (depois dos imports):

**❌ CÓDIGO ANTIGO (ERRADO):**
```typescript
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
```

**✅ CÓDIGO CORRETO (SUBSTITUIR):**
```typescript
serve(async (req) => {
  // Handle CORS preflight - must return 200 or 204 with CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }
```

### Passo 3: Verificar os CORS Headers

Certifique-se de que `corsHeaders` inclui PUT nos métodos permitidos:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',  // ← Deve incluir PUT
};
```

### Passo 4: Copiar o Código Completo Atualizado

**IMPORTANTE:** Se preferir, copie TODO o conteúdo do arquivo `supabase/functions/api/index.ts` novamente (já contém todas as correções).

1. Abra o arquivo local: `supabase/functions/api/index.ts`
2. Selecione TODO o conteúdo (Ctrl+A)
3. Copie (Ctrl+C)
4. No dashboard do Supabase, substitua TODO o código antigo
5. Cole o código atualizado (Ctrl+V)

### Passo 5: Fazer Deploy

1. Clique em **"Deploy"** ou **"Save"**
2. Aguarde a confirmação de deploy bem-sucedido
3. A função deve aparecer como **"Active"**

### Passo 6: Testar

1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Acesse o Painel Admin
3. Clique na aba "Usuários"
4. Deve carregar sem erros de CORS

## 🔍 Verificação Rápida

O código correto deve ter:

1. ✅ `status: 204` na resposta OPTIONS
2. ✅ `PUT` nos métodos permitidos no `corsHeaders`
3. ✅ Todos os endpoints funcionando

## 📝 Linhas Específicas para Verificar

No código da função, verifique estas linhas:

**Linha ~4-8 (corsHeaders):**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
```

**Linha ~690-695 (OPTIONS handler):**
```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, { 
    status: 204,  // ← DEVE TER status: 204
    headers: corsHeaders 
  });
}
```

---

**Após atualizar, a aba "Usuários" deve funcionar corretamente!** 🎉
