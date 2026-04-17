# ✅ Configuração Final - Railway WhatsApp Bot

## 🎯 Status Atual

### ✅ Railway - FUNCIONANDO
- **URL:** `https://whatsapp-bot-barbearia-production.up.railway.app`
- **Status:** Bot rodando e gerando QR code
- **API Key:** `testdaapi2026`
- **Porta:** 3000

### ⚠️ Supabase - PENDENTE
- **Ação necessária:** Atualizar 3 variáveis de ambiente manualmente

---

## 📋 Variáveis para Configurar no Supabase

**Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets

### 1. EVOLUTION_API_URL
```
Name: EVOLUTION_API_URL
Value: https://whatsapp-bot-barbearia-production.up.railway.app
```

### 2. EVOLUTION_API_KEY
```
Name: EVOLUTION_API_KEY
Value: testdaapi2026
```

### 3. EVOLUTION_INSTANCE_NAME
```
Name: EVOLUTION_INSTANCE_NAME
Value: default
```

---

## 🔧 Como Atualizar (Passo a Passo)

1. **Acesse o link acima** (ou navegue: Dashboard → Settings → Edge Functions → Secrets)

2. **Para cada variável:**
   - Se já existir: Clique em "Edit" (ícone de lápis) e atualize o valor
   - Se não existir: Clique em "Add new secret" e crie

3. **Salve cada alteração**

4. **Aguarde 1-2 minutos** para propagação

---

## ✅ Verificação

Após configurar, teste:

### Teste 1: Health Check Railway
```powershell
Invoke-WebRequest -Uri "https://whatsapp-bot-barbearia-production.up.railway.app/health"
```
**Esperado:** Status 200, resposta JSON com `{"status":"ok"}`

### Teste 2: Painel Admin
1. Acesse: `http://localhost:8080/admin` (ou sua URL de produção)
2. Vá em: **WhatsApp** (menu lateral)
3. Deve aparecer a instância "default"
4. Clique em **"Conectar WhatsApp"**
5. QR code deve aparecer

### Teste 3: Conectar WhatsApp
1. Abra WhatsApp no celular
2. Vá em: **Configurações → Aparelhos conectados → Conectar um aparelho**
3. Escaneie o QR code do painel admin
4. Aguarde status mudar para "Conectado"

### Teste 4: Enviar Mensagem
1. Crie um agendamento de teste no sistema
2. Verifique se a mensagem WhatsApp foi enviada
3. Verifique logs no Railway se necessário

---

## 📝 Notas Importantes

1. **MCP Supabase:** A configuração MCP que você forneceu pode ser útil no futuro, mas por enquanto use o dashboard manual

2. **Propagação:** Após atualizar variáveis, aguarde 1-2 minutos antes de testar

3. **Logs Railway:** Se algo não funcionar, verifique logs em:
   - Railway Dashboard → Seu serviço → Deployments → View Logs

4. **QR Code:** O QR code expira após alguns minutos. Se expirar, gere um novo no painel admin

---

## 🎯 Checklist Final

- [ ] **EVOLUTION_API_URL** configurado no Supabase
- [ ] **EVOLUTION_API_KEY** configurado no Supabase  
- [ ] **EVOLUTION_INSTANCE_NAME** configurado no Supabase
- [ ] **Health check Railway** funcionando
- [ ] **Painel admin** mostra instância WhatsApp
- [ ] **QR code** gerado com sucesso
- [ ] **WhatsApp conectado** (status "Conectado")
- [ ] **Teste de agendamento** enviou mensagem WhatsApp

---

## 🔗 Links Úteis

- **Supabase Secrets:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets
- **Railway Dashboard:** https://railway.app
- **Health Check:** https://whatsapp-bot-barbearia-production.up.railway.app/health

---

**Próxima Ação:** Atualize as 3 variáveis no Supabase e depois teste o painel admin!
