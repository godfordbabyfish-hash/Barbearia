# Configuração do Supabase

## Passo a Passo para Vincular o Projeto ao Supabase

### 1. Obter as Credenciais do Supabase

1. Acesse o dashboard do seu projeto: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo
2. Vá em **Settings** (⚙️) → **API**
3. Você verá as seguintes informações:
   - **Project URL**: `https://wabefmgfsatlusevxyfo.supabase.co`
   - **anon/public key**: Uma chave JWT longa (começa com `eyJ...`)

### 2. Atualizar o Arquivo .env

Crie ou atualize o arquivo `.env` na raiz do projeto com:

```env
VITE_SUPABASE_URL=https://wabefmgfsatlusevxyfo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_anon_public_key_aqui
VITE_SUPABASE_PROJECT_ID=wabefmgfsatlusevxyfo
```

**⚠️ IMPORTANTE**: Substitua `sua_anon_public_key_aqui` pela chave **anon/public** que você copiou do dashboard.

### 3. Aplicar as Migrations

As migrations do banco de dados precisam ser aplicadas no novo projeto. Você pode fazer isso:

**Opção A - Via Supabase Dashboard (SQL Editor - RECOMENDADO):**
1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql
2. Abra o arquivo `supabase/all_migrations.sql` (consolidado com todas as migrations em ordem)
3. Copie todo o conteúdo do arquivo
4. Cole no SQL Editor do Supabase
5. Clique em **Run** para executar todas as migrations de uma vez

**Opção B - Via Supabase CLI (se instalado):**
```bash
supabase link --project-ref wabefmgfsatlusevxyfo
supabase db push
```

**⚠️ IMPORTANTE**: Certifique-se de que o banco de dados está vazio antes de aplicar as migrations. Se já houver tabelas, pode ser necessário limpá-las primeiro.

### 4. Verificar a Configuração

Após atualizar o `.env`, reinicie o servidor de desenvolvimento:

```bash
npm run dev
```

O projeto deve conectar ao novo banco de dados Supabase.

### 5. Configuração já Atualizada

- ✅ `supabase/config.toml` - Atualizado com o novo `project_id: wabefmgfsatlusevxyfo`
- ✅ `.env` - Atualizado com as credenciais do novo projeto Supabase
- ✅ `supabase/all_migrations.sql` - Arquivo consolidado criado com todas as migrations em ordem

### Próximos Passos

1. ✅ Atualizar `.env` com as credenciais corretas
2. ⏳ Aplicar as migrations no novo projeto (próximo passo)
3. ⏳ Testar a conexão executando o projeto
