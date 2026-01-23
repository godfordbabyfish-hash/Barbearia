# 🚀 Deploy no Railway - Passo a Passo Detalhado

## ✅ Pré-requisitos

- ✅ Código do bot criado em `whatsapp-bot-railway/`
- ✅ Conta no GitHub
- ✅ Conta no Railway (criar em https://railway.app)

## 📋 Passo a Passo Completo

### PASSO 1: Criar Repositório no GitHub (2 minutos)

1. **Acesse:** https://github.com
2. **Clique em:** "New repository" (ou "+" > "New repository")
3. **Nome:** `whatsapp-bot-barbearia` (ou qualquer nome)
4. **Visibilidade:** Private (recomendado) ou Public
5. **NÃO marque:** "Add a README file"
6. **Clique em:** "Create repository"

### PASSO 2: Fazer Upload do Código (3 minutos)

**Opção A: Via Git (Recomendado)**

```powershell
cd c:\Users\thiag\Downloads\Barbearia\whatsapp-bot-railway
git init
git add .
git commit -m "WhatsApp Bot com Baileys"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/whatsapp-bot-barbearia.git
git push -u origin main
```

**Opção B: Via Interface Web do GitHub**

1. No repositório criado, clique em "uploading an existing file"
2. Arraste a pasta `whatsapp-bot-railway/` completa
3. Ou faça upload arquivo por arquivo:
   - `index.js`
   - `package.json`
   - `railway.json`
   - `README.md`
   - `.gitignore`
4. Clique em "Commit changes"

### PASSO 3: Deploy no Railway (5 minutos)

1. **Acesse:** https://railway.app
2. **Login** com GitHub (autorize Railway acessar seus repositórios)
3. **Clique em:** "New Project"
4. **Selecione:** "Deploy from GitHub repo"
5. **Selecione o repositório:** `whatsapp-bot-barbearia` (ou o nome que você usou)
6. **Railway detecta automaticamente** e inicia deploy
7. **Aguarde** o build completar (2-3 minutos)

### PASSO 4: Configurar Variáveis (1 minuto)

1. **No Railway**, clique no projeto
2. **Clique no serviço** (geralmente aparece como "web" ou nome do repositório)
3. **Vá em:** "Variables" (ou "Settings" > "Variables")
4. **Clique em:** "New Variable"
5. **Adicione:**
   - **Name:** `API_KEY`
   - **Value:** `testdaapi2026`
6. **Salve** (Railway reinicia automaticamente)

### PASSO 5: Obter URL (1 minuto)

1. **No Railway**, ainda no serviço
2. **Vá em:** "Settings" > "Networking"
3. **Clique em:** "Generate Domain" (se ainda não tiver)
4. **Anote a URL gerada** (ex: `https://whatsapp-bot-xxxx.up.railway.app`)

### PASSO 6: Atualizar Supabase (1 minuto)

**Via CLI:**
```powershell
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-xxxx.up.railway.app
```

**Ou Manualmente:**
1. Acesse: Supabase Dashboard
2. Vá em: Settings > Edge Functions > Secrets
3. Encontre: `EVOLUTION_API_URL`
4. Atualize para: `<URL_DO_RAILWAY>`
5. Salve

### PASSO 7: Testar (2 minutos)

1. **Aguarde 1-2 minutos** após deploy
2. **Teste health check:**
   ```powershell
   curl https://whatsapp-bot-xxxx.up.railway.app/health
   ```
   Deve retornar: `{"status":"ok","connected":false}`

3. **Acesse frontend:** Admin > WhatsApp > WhatsApp Manager
4. **A instância "default" deve aparecer**
5. **Clique em "Conectar"** e escaneie QR code com WhatsApp

## ✅ Validação Final

Após completar todos os passos:

- ✅ Health check responde
- ✅ Instância "default" aparece no frontend
- ✅ QR code é gerado
- ✅ WhatsApp conecta
- ✅ Teste criar agendamento e verificar notificação

## 🎯 Tempo Total

- **GitHub:** 5 minutos
- **Railway:** 5 minutos
- **Supabase:** 1 minuto
- **Teste:** 2 minutos

**Total: ~15 minutos**

## 🐛 Troubleshooting

### Railway não detecta o projeto
- Verifique se `package.json` está na raiz do repositório
- Verifique se o repositório está público ou Railway tem acesso

### Deploy falha
- Verifique logs no Railway (clique no serviço > "Deployments" > "View Logs")
- Verifique se `package.json` está correto
- Verifique se `API_KEY` está configurada

### Health check não responde
- Aguarde mais 1-2 minutos (Railway pode estar inicializando)
- Verifique logs no Railway
- Verifique se a variável `API_KEY` está configurada

### Frontend não mostra instância
- Verifique se `EVOLUTION_API_URL` foi atualizado no Supabase
- Aguarde 1-2 minutos após atualizar
- Recarregue a página do frontend

---

**Pronto! Siga os passos acima e o sistema estará 100% funcional!**
