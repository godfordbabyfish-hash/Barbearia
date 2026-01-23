# 🔑 Como Obter Tokens do Supabase para Acesso Completo

## 🎯 Tokens Necessários

Para acesso completo ao Supabase, você precisa de:

1. **Service Role Key** (acesso total, sem RLS)
2. **Anon Key** (acesso público, com RLS)
3. **Project API URL** (já temos: `https://wabefmgfsatlusevxyfo.supabase.co`)

---

## 📋 Onde Encontrar os Tokens

### PASSO 1: Acessar Settings do Projeto

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/api

2. **Ou navegue:**
   - Dashboard Supabase
   - Seu projeto (`wabefmgfsatlusevxyfo`)
   - Settings (⚙️)
   - API

### PASSO 2: Encontrar as Chaves

Na página de API Settings, você verá:

#### 1. Project URL
```
https://wabefmgfsatlusevxyfo.supabase.co
```
✅ **Já temos isso!**

#### 2. anon public key (Anon Key)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwNDE2MDAsImV4cCI6MjA1MDYxNzYwMH0.xxxxx
```
- **Uso:** Acesso público (frontend)
- **Permissões:** Respeita RLS (Row Level Security)
- **Onde usar:** Frontend React, variável `VITE_SUPABASE_PUBLISHABLE_KEY`

#### 3. service_role key (Service Role Key) ⚠️ SECRETO
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTA0MTYwMCwiZXhwIjoyMDUwNjE3NjAwfQ.xxxxx
```
- **Uso:** Acesso total (backend, funções)
- **Permissões:** Ignora RLS, acesso completo
- **⚠️ NUNCA exponha no frontend!**
- **Onde usar:** Edge Functions, scripts backend

---

## 🔐 Como Usar os Tokens

### Para MCP (Model Context Protocol)

Se você quer configurar MCP para acesso automático, você precisa:

1. **Service Role Key** (para operações administrativas)
2. **Project Reference** (já temos: `wabefmgfsatlusevxyfo`)

**Configuração MCP:**
```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=wabefmgfsatlusevxyfo",
      "apiKey": "SEU_SERVICE_ROLE_KEY_AQUI"
    }
  }
}
```

### Para CLI do Supabase

```powershell
# Fazer login (abre navegador)
npx supabase login

# Linkar projeto
npx supabase link --project-ref wabefmgfsatlusevxyfo
```

### Para Variáveis de Ambiente

**Frontend (.env):**
```env
VITE_SUPABASE_URL=https://wabefmgfsatlusevxyfo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SEU_ANON_KEY_AQUI
```

**Backend/Edge Functions (Secrets):**
```env
SUPABASE_URL=https://wabefmgfsatlusevxyfo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SEU_SERVICE_ROLE_KEY_AQUI
```

---

## ⚠️ Segurança Importante

### ✅ SEGURO (Pode expor)
- **Anon Key** - Pode ser usado no frontend
- **Project URL** - Pode ser público

### ❌ NUNCA EXPOR
- **Service Role Key** - Acesso total ao banco!
- **Database Password** - Acesso direto ao PostgreSQL
- **JWT Secret** - Pode gerar tokens falsos

---

## 📍 Links Diretos

### API Settings (onde estão os tokens)
https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/api

### Edge Functions Secrets (onde configurar variáveis)
https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets

### Database Settings (connection string)
https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database

---

## 🔧 Para Atualizar Variáveis do WhatsApp

**Se você quiser que eu atualize automaticamente via MCP:**

1. Obtenha o **Service Role Key** do link acima
2. Configure o MCP com o token
3. Eu poderei atualizar as variáveis automaticamente

**OU continue atualizando manualmente:**
- Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets
- Atualize as 3 variáveis do WhatsApp

---

## 📝 Tokens que Você Precisa Agora

Para configurar o WhatsApp, você **NÃO precisa** dos tokens agora. 

Você só precisa:
1. Acessar o dashboard do Supabase
2. Ir em Settings → Edge Functions → Secrets
3. Atualizar as 3 variáveis manualmente

**Os tokens são úteis para:**
- Configurar MCP (acesso automático)
- Usar CLI do Supabase
- Integrações programáticas

---

**Ação Imediata:** Acesse o link de API Settings para ver os tokens, mas para configurar WhatsApp agora, use o dashboard manual!
