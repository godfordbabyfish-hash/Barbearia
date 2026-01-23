# 🚀 Executar Migração para Baileys - AGORA

## ✅ Status Atual

- ✅ Código do bot criado e pronto
- ✅ Estrutura completa em `whatsapp-bot-railway/`
- ✅ API compatível com Evolution API

## 📋 Passos para Executar (15-20 minutos)

### PASSO 1: Deploy no Railway (5 minutos)

1. **Acesse:** https://railway.app
2. **Login** com GitHub
3. **Clique em:** "New Project"
4. **Selecione:** "Deploy from GitHub repo"
5. **Crie um repositório** (se ainda não tiver):
   - Vá no GitHub
   - Crie um novo repositório (ex: `whatsapp-bot-barbearia`)
   - Faça upload da pasta `whatsapp-bot-railway/` completa
   - Ou use Git para fazer push
6. **No Railway:** Selecione o repositório
7. **Railway detecta automaticamente** e inicia deploy
8. **Configure variável:**
   - Vá em "Variables" no Railway
   - Adicione: `API_KEY` = `testdaapi2026`
9. **Aguarde deploy completar** (2-3 minutos)
10. **Anote a URL gerada** (ex: `https://whatsapp-bot-xxxx.up.railway.app`)

### PASSO 2: Atualizar Supabase (1 minuto)

**Opção A: Via CLI (Recomendado)**
```powershell
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-xxxx.up.railway.app
```

**Opção B: Manualmente**
1. Acesse: Supabase Dashboard
2. Vá em: Settings > Edge Functions > Secrets
3. Atualize: `EVOLUTION_API_URL` = `<URL_DO_RAILWAY>`

### PASSO 3: Testar (2 minutos)

1. **Aguarde 1-2 minutos** após deploy
2. **Teste health check:**
   ```powershell
   curl https://whatsapp-bot-xxxx.up.railway.app/health
   ```
3. **Acesse frontend:** Admin > WhatsApp > WhatsApp Manager
4. **A instância "default" deve aparecer**
5. **Clique em "Conectar"** e escaneie QR code

### PASSO 4: Validar Funcionalidades

1. ✅ Criar um agendamento de teste
2. ✅ Verificar se notificação foi enviada
3. ✅ Testar lembrete (criar agendamento para 11 minutos no futuro)

## 🎯 Resultado Final

Após completar:
- ✅ Sistema 100% funcional
- ✅ Todas funcionalidades continuam (lembrete, agendamento, cancelamento)
- ✅ API mais confiável e rápida
- ✅ 100% gratuito

## ⚡ Script Rápido

Se preferir usar script guiado:
```powershell
.\migrar-baileys-automatico.ps1
```

## 📞 Próximos Passos

1. Deploy no Railway (5 min)
2. Atualizar Supabase (1 min)
3. Testar (2 min)
4. **PRONTO! Sistema funcionando!**

---

**Tempo total: 15-20 minutos para resolver tudo definitivamente!**
