# 🚀 Guia: Migrar de Evolution API para Baileys + Railway

## Por que migrar?

- ✅ **100% Gratuito** (Railway free tier é mais generoso)
- ✅ **Mais Simples** (sem Docker, sem PostgreSQL externo)
- ✅ **Mais Leve** (Baileys não usa Puppeteer/Chrome)
- ✅ **Deploy Mais Rápido** (5 minutos vs horas)
- ✅ **Menos Pontos de Falha** (menos serviços externos)

## Passo a Passo

### 1. Preparar Código do Bot

O código já está pronto em `whatsapp-bot-railway/`:
- ✅ API REST compatível com Evolution API
- ✅ Baileys configurado
- ✅ QR code automático
- ✅ Reconexão automática

### 2. Deploy no Railway

#### Opção A: Deploy via GitHub (Recomendado)

1. **Criar repositório no GitHub:**
   ```bash
   cd whatsapp-bot-railway
   git init
   git add .
   git commit -m "WhatsApp Bot com Baileys"
   git remote add origin https://github.com/SEU_USUARIO/whatsapp-bot-barbearia.git
   git push -u origin main
   ```

2. **Conectar no Railway:**
   - Acesse https://railway.app
   - Login com GitHub
   - "New Project" > "Deploy from GitHub repo"
   - Selecione o repositório
   - Railway detecta automaticamente e faz deploy

3. **Configurar Variáveis:**
   - No Railway, vá em "Variables"
   - Adicione: `API_KEY` = `testdaapi2026`
   - `PORT` é definido automaticamente pelo Railway

#### Opção B: Deploy via CLI

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Inicializar projeto
cd whatsapp-bot-railway
railway init

# Deploy
railway up
```

### 3. Obter URL do Railway

Após deploy, Railway gera uma URL como:
```
https://whatsapp-bot-xxxx.up.railway.app
```

**Anote esta URL!**

### 4. Atualizar Supabase

1. **Acesse Supabase Dashboard:**
   - Settings > Edge Functions > Secrets

2. **Atualizar `EVOLUTION_API_URL`:**
   ```bash
   npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-xxxx.up.railway.app
   ```

3. **Manter `EVOLUTION_API_KEY`:**
   ```bash
   npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
   ```

### 5. Testar Conexão

1. **Verificar Health:**
   ```bash
   curl https://whatsapp-bot-xxxx.up.railway.app/health
   ```

2. **Listar Instâncias:**
   ```bash
   curl -H "apikey: testdaapi2026" \
     https://whatsapp-bot-xxxx.up.railway.app/instance/fetchInstances
   ```

3. **Obter QR Code:**
   ```bash
   curl -H "apikey: testdaapi2026" \
     https://whatsapp-bot-xxxx.up.railway.app/instance/connect/default
   ```

### 6. Conectar WhatsApp

1. **No Frontend:**
   - Acesse: Admin > WhatsApp > WhatsApp Manager
   - A instância "default" deve aparecer
   - Clique em "Conectar"
   - Escaneie o QR code

2. **Ou via API:**
   - Chame `/instance/connect/default`
   - Use o QR code retornado

### 7. Testar Envio de Mensagem

```bash
curl -X POST \
  -H "apikey: testdaapi2026" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999999999",
    "text": "Teste de mensagem"
  }' \
  https://whatsapp-bot-xxxx.up.railway.app/message/sendText/default
```

## ✅ Checklist de Migração

- [ ] Código do bot criado em `whatsapp-bot-railway/`
- [ ] Deploy feito no Railway
- [ ] URL do Railway anotada
- [ ] `EVOLUTION_API_URL` atualizado no Supabase
- [ ] Health check funcionando
- [ ] QR code gerado com sucesso
- [ ] WhatsApp conectado
- [ ] Teste de envio de mensagem funcionando
- [ ] Frontend conectando corretamente

## 🔄 Rollback (se necessário)

Se precisar voltar para Evolution API:

1. Reverter `EVOLUTION_API_URL` no Supabase:
   ```bash
   npx supabase secrets set EVOLUTION_API_URL=https://evolution-api-barbearia.fly.dev
   ```

2. Evolution API continua funcionando (se estiver rodando)

## 📊 Comparação Final

| Aspecto | Evolution API | Baileys + Railway |
|---------|---------------|-------------------|
| **Custo** | Free tier limitado | 100% gratuito |
| **Complexidade** | Alta (Docker + PostgreSQL) | Baixa (Node.js puro) |
| **Deploy** | 30-60 min | 5 min |
| **Recursos** | ~200MB (com Puppeteer) | ~50MB |
| **Manutenção** | Média | Baixa |
| **Confiabilidade** | Depende de múltiplos serviços | Serviço único |

## 🎯 Conclusão

**Recomendação: MIGRAR para Baileys + Railway**

A migração é simples, rápida e resulta em uma solução mais confiável e fácil de manter.
