# 🔍 Como Encontrar Secrets no Supabase - Guia Alternativo

## ❌ Problema: Página 404

A URL `/settings/functions/secrets` retornou 404. Vamos encontrar o caminho correto!

---

## 🔍 Caminhos Alternativos para Secrets

### Opção 1: Via Edge Functions (Se Habilitado)

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions

2. **Procure por:**
   - Botão "Secrets" ou "Environment Variables"
   - Menu lateral com "Settings" ou "Configuration"
   - Aba "Secrets" ou "Environment"

### Opção 2: Via Settings Geral

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings

2. **Procure por:**
   - "Edge Functions" no menu lateral
   - "Environment Variables"
   - "Secrets"

### Opção 3: Via API Settings

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/api

2. **Role até o final da página** - pode haver uma seção de "Edge Functions Secrets"

### Opção 4: Navegação Manual

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo

2. **No menu lateral esquerdo, procure:**
   - ⚙️ **Settings** → **Edge Functions** → **Secrets**
   - Ou: **Edge Functions** → **Settings** → **Secrets**
   - Ou: **Functions** → **Secrets**

---

## 🔧 Alternativa: Usar CLI do Supabase

Se não encontrar a página no dashboard, use o CLI:

### PASSO 1: Instalar/Verificar Supabase CLI

```powershell
# Verificar se está instalado
npx supabase --version

# Se não estiver, instalar globalmente (opcional)
npm install -g supabase
```

### PASSO 2: Fazer Login

```powershell
npx supabase login
```

Isso abrirá o navegador para autenticação.

### PASSO 3: Linkar Projeto

```powershell
npx supabase link --project-ref wabefmgfsatlusevxyfo
```

### PASSO 4: Configurar Secrets

```powershell
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-barbearia-production.up.railway.app
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
npx supabase secrets set EVOLUTION_INSTANCE_NAME=default
```

### PASSO 5: Verificar

```powershell
npx supabase secrets list
```

---

## 🔍 Verificar se Edge Functions Está Habilitado

Se você não encontrar a opção de Secrets, pode ser que Edge Functions não esteja habilitado:

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions

2. **Se aparecer mensagem para habilitar:**
   - Clique em "Enable Edge Functions"
   - Aguarde a ativação
   - Depois tente acessar Secrets novamente

---

## 📋 URLs para Tentar (em ordem)

1. https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions
2. https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions
3. https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings
4. https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo

**Em cada página, procure por:**
- "Secrets"
- "Environment Variables"
- "Edge Functions Settings"
- Menu lateral com opções de configuração

---

## 🎯 Solução Rápida: Usar CLI

**A forma mais confiável é usar o CLI:**

```powershell
# 1. Login
npx supabase login

# 2. Linkar
npx supabase link --project-ref wabefmgfsatlusevxyfo

# 3. Configurar
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-barbearia-production.up.railway.app
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
npx supabase secrets set EVOLUTION_INSTANCE_NAME=default

# 4. Verificar
npx supabase secrets list
```

---

## 🔗 Links Úteis

- **Dashboard Principal:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo
- **Edge Functions:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions
- **Settings:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings
- **API Settings:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/api

---

**Recomendação:** Use o CLI do Supabase - é mais confiável e direto!
