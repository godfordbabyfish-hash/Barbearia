# 🔧 Solução para Erro 404 em Secrets do Supabase

## ❌ Problema Identificado

A URL `https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets` retornou **404 Not Found**.

Isso pode acontecer porque:
1. Edge Functions não está habilitado no projeto
2. O caminho mudou na interface do Supabase
3. Você não tem permissões para acessar essa seção

---

## ✅ Solução: Usar CLI do Supabase

**A forma mais confiável é usar o CLI do Supabase via terminal:**

### PASSO 1: Fazer Login

```powershell
npx supabase login
```

Isso abrirá o navegador para você autenticar. Depois de autenticar, volte ao terminal.

### PASSO 2: Linkar Projeto

```powershell
npx supabase link --project-ref wabefmgfsatlusevxyfo
```

Você precisará de um **Access Token**. Se pedir:
- Vá em: https://supabase.com/dashboard/account/tokens
- Crie um novo token
- Cole no terminal

### PASSO 3: Configurar as Variáveis

```powershell
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-barbearia-production.up.railway.app
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
npx supabase secrets set EVOLUTION_INSTANCE_NAME=default
```

### PASSO 4: Verificar

```powershell
npx supabase secrets list
```

Deve mostrar as 3 variáveis configuradas.

---

## 🔍 Alternativa: Encontrar Secrets no Dashboard

### Tentar estas URLs (em ordem):

1. **Edge Functions:**
   https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions
   - Procure por botão "Secrets" ou "Environment Variables"

2. **Settings Geral:**
   https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings
   - Procure por "Edge Functions" no menu lateral
   - Ou "Environment Variables"

3. **Dashboard Principal:**
   https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo
   - Navegue pelo menu lateral procurando "Functions" ou "Secrets"

---

## 🔧 Habilitar Edge Functions (Se Necessário)

Se Edge Functions não estiver habilitado:

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions

2. **Se aparecer botão "Enable Edge Functions":**
   - Clique nele
   - Aguarde a ativação (1-2 minutos)
   - Depois tente acessar Secrets novamente

---

## 📋 Variáveis que Precisam Ser Configuradas

| Variável | Valor |
|----------|-------|
| `EVOLUTION_API_URL` | `https://whatsapp-bot-barbearia-production.up.railway.app` |
| `EVOLUTION_API_KEY` | `testdaapi2026` |
| `EVOLUTION_INSTANCE_NAME` | `default` |

---

## 🎯 Recomendação Final

**Use o CLI do Supabase** - é mais confiável e funciona mesmo se a interface web mudar.

**Execute o script que criei:**
```powershell
.\atualizar-supabase-via-cli.ps1
```

Ou execute os comandos manualmente (veja PASSO 1-4 acima).

---

## ✅ Após Configurar

1. **Aguarde 1-2 minutos** para propagação
2. **Teste no painel admin:**
   - Acesse: `http://localhost:8080/admin`
   - Vá em: WhatsApp
   - Conecte o WhatsApp

---

**Status:** ⚠️ Página 404 - Use CLI do Supabase para configurar!
