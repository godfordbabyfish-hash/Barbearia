# 🔧 Troubleshooting - Página Não Abre

## ❓ Diagnóstico Rápido

### 1. Verificar se o Build Funcionou

1. Acesse o dashboard da Netlify
2. Clique no seu site
3. Vá em **"Deploys"**
4. Verifique se o último deploy tem um **✅** verde ou **❌** vermelho

**Se estiver vermelho:**
- Clique no deploy com erro
- Role até **"Build log"**
- Copie os erros e veja as soluções abaixo

---

## 🔍 Problemas Comuns e Soluções

### Problema 1: Erro "Failed to fetch" ou "Supabase URL not found"

**Causa:** Variáveis de ambiente não configuradas ou incorretas

**Solução:**
1. No Netlify, vá em **Site settings** → **Environment variables**
2. Verifique se tem essas 3 variáveis:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
3. **IMPORTANTE:** Os nomes devem começar com `VITE_` (maiúsculas)
4. Após adicionar/editar, faça um **"Trigger deploy"** → **"Clear cache and deploy site"**

**Valores corretos:**
```
VITE_SUPABASE_URL=https://wabefmgfsatlusevxyfo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc
VITE_SUPABASE_PROJECT_ID=wabefmgfsatlusevxyfo
```

---

### Problema 2: Página em Branco / Não Carrega

**Possíveis causas:**

#### A. Erro de JavaScript no Console

**Solução:**
1. Abra a página do site
2. Pressione **F12** (ou clique direito → Inspecionar)
3. Vá na aba **Console**
4. Veja se há erros em vermelho
5. Envie os erros que aparecem

**Erros comuns:**
- `Failed to fetch` → Problema com variáveis de ambiente
- `Cannot read property...` → Problema no código
- `CORS error` → Problema no Supabase (ver abaixo)

#### B. Migrations Não Aplicadas

**Sintomas:**
- Página carrega mas mostra erros
- Console mostra erros de tabelas não encontradas

**Solução:**
1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql
2. Abra o arquivo `supabase/all_migrations.sql`
3. Copie TODO o conteúdo
4. Cole no SQL Editor
5. Clique em **Run**
6. Aguarde a execução completar

#### C. Problema com AuthContext

**Solução:**
1. Verifique no console se há erros relacionados ao Supabase
2. Verifique se a URL está configurada no Supabase (ver abaixo)

---

### Problema 3: Erro 404 em Todas as Rotas

**Causa:** Arquivo `_redirects` não está sendo usado ou configurado incorretamente

**Solução:**
1. Verifique se o arquivo `public/_redirects` existe no repositório
2. Conteúdo deve ser: `/* /index.html 200`
3. Faça um novo deploy

---

### Problema 4: CORS Error no Console

**Causa:** URL não configurada no Supabase

**Solução:**
1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/auth/url-configuration
2. Em **"Site URL"**, adicione: `https://seu-site.netlify.app`
3. Em **"Redirect URLs"**, adicione:
   ```
   https://seu-site.netlify.app/*
   https://seu-site.netlify.app
   ```
4. Clique em **Save**

---

### Problema 5: Build Falha no Netlify

**Erros comuns:**

#### "npm: command not found"
**Solução:** No `netlify.toml`, adicione:
```toml
[build.environment]
  NODE_VERSION = "18"
```

#### "Module not found" ou erros de dependências
**Solução:**
1. Verifique se o `package.json` está correto
2. Tente fazer um **"Clear cache and deploy"**

---

## 🔄 Passo a Passo: Resetar e Reconfigurar

### 1. Verificar Build Settings no Netlify

1. Vá em **Site settings** → **Build & deploy**
2. Verifique:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** `18` (ou deixe em branco)

### 2. Verificar Variáveis de Ambiente

1. **Site settings** → **Environment variables**
2. Verifique se tem EXATAMENTE essas 3 variáveis (com nomes exatos):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
3. **IMPORTANTE:** Deletar variáveis antigas e recriar se necessário

### 3. Limpar Cache e Fazer Novo Deploy

1. No dashboard, vá em **Deploys**
2. Clique nos **3 pontos** ao lado de "Trigger deploy"
3. Selecione **"Clear cache and deploy site"**
4. Aguarde o build completar

### 4. Verificar Logs do Deploy

1. Clique no deploy mais recente
2. Vá até **"Build log"**
3. Procure por erros (linhas em vermelho)
4. Anote qualquer erro encontrado

---

## 🧪 Teste Local Antes do Deploy

Para testar se tudo funciona localmente:

```bash
# 1. Verificar se .env está correto
cat .env

# 2. Instalar dependências
npm install

# 3. Fazer build
npm run build

# 4. Testar build localmente
npm run preview
```

Se funcionar localmente mas não no Netlify, o problema é na configuração do Netlify.

---

## 📋 Checklist de Verificação

Marque cada item:

- [ ] Variáveis de ambiente configuradas no Netlify (3 variáveis)
- [ ] Nomes das variáveis começam com `VITE_` (maiúsculas)
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Migrations aplicadas no Supabase
- [ ] URL do Netlify adicionada no Supabase Auth
- [ ] Build passou sem erros no Netlify
- [ ] Console do navegador sem erros (F12)

---

## 🆘 Ainda Não Funciona?

**Envie estas informações:**

1. **URL do site Netlify**
2. **Screenshot do erro no console** (F12 → Console)
3. **Logs do build no Netlify** (se houver erros)
4. **Mensagem de erro exata** que aparece

Com essas informações, posso ajudar de forma mais específica!

---

## ✅ Teste Rápido de Funcionamento

Depois de corrigir, teste:

1. ✅ Página inicial carrega
2. ✅ Console sem erros (F12)
3. ✅ Botões/links funcionam
4. ✅ Pode fazer login/criar conta
5. ✅ Navegação entre páginas funciona
