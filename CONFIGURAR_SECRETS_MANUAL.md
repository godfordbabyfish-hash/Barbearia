# ✅ Configurar Secrets do Supabase - Manual

## 🎯 Status: Supabase Conectado!

Você já está logado no Supabase CLI! Agora só precisa configurar as variáveis.

---

## 📋 Comandos para Executar

**Execute estes comandos no seu terminal PowerShell (um por vez):**

### 1. Linkar Projeto (se ainda não linkou)

```powershell
npx supabase link --project-ref wabefmgfsatlusevxyfo
```

**OU se o `npx` não funcionar:**

```powershell
supabase link --project-ref wabefmgfsatlusevxyfo
```

### 2. Configurar Variáveis

```powershell
# Variável 1: URL do Railway
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-barbearia-production.up.railway.app

# Variável 2: API Key
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026

# Variável 3: Nome da Instância
npx supabase secrets set EVOLUTION_INSTANCE_NAME=default
```

**OU se o `npx` não funcionar, use `supabase` diretamente:**

```powershell
supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-barbearia-production.up.railway.app
supabase secrets set EVOLUTION_API_KEY=testdaapi2026
supabase secrets set EVOLUTION_INSTANCE_NAME=default
```

### 3. Verificar se Configurou

```powershell
npx supabase secrets list
```

**OU:**

```powershell
supabase secrets list
```

Deve mostrar as 3 variáveis configuradas.

---

## ⚠️ Se Der Erro de Proxy

Se aparecer erro de proxy (`127.0.0.1:9`), tente:

### Opção 1: Desabilitar Proxy Temporariamente

```powershell
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
$env:http_proxy = ""
$env:https_proxy = ""

# Depois execute os comandos novamente
supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-barbearia-production.up.railway.app
```

### Opção 2: Usar Dashboard (Alternativa)

Se o CLI continuar com problemas de proxy:

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions
2. **Procure por:** "Secrets" ou "Environment Variables"
3. **Configure manualmente** as 3 variáveis

---

## ✅ Após Configurar

1. **Aguarde 1-2 minutos** para propagação

2. **Teste no painel admin:**
   - Acesse: `http://localhost:8080/admin`
   - Vá em: **WhatsApp**
   - Clique em: **"Conectar WhatsApp"**
   - Escaneie o QR code

3. **Teste criando um agendamento** e verifique se a mensagem WhatsApp foi enviada

---

## 📋 Variáveis que Devem Ser Configuradas

| Variável | Valor |
|----------|-------|
| `EVOLUTION_API_URL` | `https://whatsapp-bot-barbearia-production.up.railway.app` |
| `EVOLUTION_API_KEY` | `testdaapi2026` |
| `EVOLUTION_INSTANCE_NAME` | `default` |

---

**Status:** ✅ Logado no Supabase - Execute os comandos acima no seu terminal!
