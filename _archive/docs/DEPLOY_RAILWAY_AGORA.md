# 🚀 Deploy no Railway - AGORA (2 minutos)

## ✅ O Que Já Está Pronto

- ✅ Código do bot criado
- ✅ Repositório no GitHub: https://github.com/godfordbabyfish-hash/whatsapp-bot-barbearia
- ✅ Código enviado para GitHub
- ✅ Tudo pronto para deploy!

## 📋 Deploy no Railway (2 minutos)

### PASSO 1: Acessar Railway

1. **Acesse:** https://railway.app
2. **Clique em:** "Login" ou "Sign up"
3. **Escolha:** "Login with GitHub"
4. **Autorize** Railway acessar seus repositórios

### PASSO 2: Criar Novo Projeto

1. **Clique em:** "New Project" (botão verde no canto superior direito)
2. **Selecione:** "Deploy from GitHub repo"
3. **Autorize** Railway se necessário
4. **Selecione o repositório:** `whatsapp-bot-barbearia`
5. **Clique em:** "Deploy"

### PASSO 3: Configurar Variável

1. **Aguarde** o deploy iniciar (aparece "Building..." ou "Deploying...")
2. **Clique no serviço** (geralmente aparece como "web" ou "whatsapp-bot-barbearia")
3. **Vá em:** "Variables" (aba lateral)
4. **Clique em:** "New Variable"
5. **Adicione:**
   - **Name:** `API_KEY`
   - **Value:** `testdaapi2026`
6. **Salve** (Railway reinicia automaticamente)

### PASSO 4: Obter URL

1. **Ainda no serviço**, vá em **"Settings"** (aba lateral)
2. **Role até:** "Networking"
3. **Clique em:** "Generate Domain" (se ainda não tiver)
4. **Anote a URL gerada** (ex: `https://whatsapp-bot-xxxx.up.railway.app`)

### PASSO 5: Atualizar Supabase

**Execute este comando (substitua pela URL real):**

```powershell
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-xxxx.up.railway.app
```

**OU me informe a URL e eu atualizo para você!**

## ✅ Pronto!

Após isso:
- ✅ Sistema 100% funcional
- ✅ Todas funcionalidades continuam
- ✅ Sem mais erros 502!
- ✅ API mais confiável

## 🎯 Tempo Total

- **Deploy Railway:** 2-3 minutos
- **Configurar variável:** 30 segundos
- **Atualizar Supabase:** 30 segundos

**Total: ~3 minutos!**

---

**Quando tiver a URL do Railway, me informe para atualizar o Supabase automaticamente!**
