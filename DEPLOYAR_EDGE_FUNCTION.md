# 🚀 Deployar Edge Function do Supabase

## 🔴 Problema Identificado

A aba "Usuários" não está carregando porque a Edge Function `api` não está implantada no Supabase. O erro "Failed to send a request to the Edge Function" indica que a função não está disponível.

## ✅ SOLUÇÃO: Deployar a Edge Function

### Opção 1: Via Supabase Dashboard (MAIS FÁCIL)

1. **Acesse o Dashboard:**
   - https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo

2. **Vá em Edge Functions:**
   - No menu lateral, clique em **"Edge Functions"** (ou **"Functions"**)

3. **Criar nova função:**
   - Clique em **"Create a new function"** ou **"+ New Function"**
   - Nome: `api`
   - Copie o conteúdo do arquivo `supabase/functions/api/index.ts`

4. **Colar o código:**
   - Cole todo o conteúdo do arquivo no editor
   - Clique em **"Deploy"** ou **"Save"**

### Opção 2: Via Supabase CLI (Recomendado para atualizações futuras)

**⚠️ IMPORTANTE:** No Windows, o Supabase CLI não pode ser instalado via `npm install -g`. Use uma das opções abaixo:

#### Método A: Via Scoop (Recomendado para Windows)

1. **Instalar Scoop (se não tiver):**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
   ```

2. **Instalar Supabase CLI:**
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

#### Método B: Via Chocolatey

1. **Instalar Chocolatey (se não tiver):**
   - Acesse: https://chocolatey.org/install

2. **Instalar Supabase CLI:**
   ```powershell
   choco install supabase
   ```

#### Método C: Via NPM (usando npx - não requer instalação global)

1. **Fazer login (sem instalar globalmente):**
   ```powershell
   npx supabase login
   ```

2. **Linkar ao projeto:**
   ```powershell
   npx supabase link --project-ref wabefmgfsatlusevxyfo
   ```

3. **Deployar a função:**
   ```powershell
   npx supabase functions deploy api
   ```

**Depois de instalar via Scoop ou Chocolatey:**

1. **Fazer login:**
   ```powershell
   supabase login
   ```

2. **Linkar ao projeto:**
   ```powershell
   supabase link --project-ref wabefmgfsatlusevxyfo
   ```

3. **Deployar a função:**
   ```powershell
   supabase functions deploy api
   ```

### Opção 3: Via NPM npx (Mais Simples - Não Requer Instalação)

1. **Fazer login:**
   ```powershell
   npx supabase login
   ```

2. **Linkar ao projeto:**
   ```powershell
   npx supabase link --project-ref wabefmgfsatlusevxyfo
   ```

3. **Deployar a função:**
   ```powershell
   npx supabase functions deploy api
   ```

### Opção 4: Copiar Código Manualmente (Mais Rápido - SEM CLI)

1. **Acesse:**
   - https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions

2. **Clique em "Create a new function"**

3. **Configure:**
   - **Name:** `api`
   - **Copy code from:** Arquivo local `supabase/functions/api/index.ts`

4. **Copie TODO o conteúdo do arquivo** `supabase/functions/api/index.ts`

5. **Cole no editor do Supabase**

6. **Clique em "Deploy"**

## ⚙️ Configurar Variáveis de Ambiente (IMPORTANTE)

Após criar a função, configure as variáveis de ambiente:

1. No dashboard da função, vá em **"Settings"** ou **"Environment Variables"**

2. Adicione as seguintes variáveis:
   - `SUPABASE_URL`: `https://wabefmgfsatlusevxyfo.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: (chave service_role do seu projeto)
   - `SUPABASE_ANON_KEY`: (chave anon/public do seu projeto)

3. **Como obter as chaves:**
   - Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/api
   - Copie:
     - **Project URL** → `SUPABASE_URL`
     - **anon public** → `SUPABASE_ANON_KEY`
     - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

## ✅ Após o Deploy

1. A função deve aparecer como **"Active"** ou **"Deployed"**
2. A aba "Usuários" deve funcionar corretamente
3. Teste criando um novo usuário

## 🔍 Verificar se Funcionou

1. Acesse o Painel Admin
2. Clique na aba "Usuários"
3. Deve carregar a lista de usuários sem erros

---

**Nota:** A Edge Function gerencia todas as operações administrativas (criar, atualizar, excluir usuários), então é essencial que esteja implantada.
