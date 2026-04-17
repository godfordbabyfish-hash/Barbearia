# 🔧 Atualizar Supabase Manualmente - Railway Configurado

## ✅ Status do Railway

**Railway está funcionando perfeitamente!** ✅

- ✅ Bot rodando na porta 3000
- ✅ API Key configurada: `testdaapi2026`
- ✅ QR Code gerado e pronto para conexão
- ✅ URL: `https://whatsapp-bot-barbearia-production.up.railway.app`

---

## 📋 Atualizar Variáveis no Supabase (MANUAL)

Como o CLI não está funcionando, atualize manualmente no dashboard:

### PASSO 1: Acessar Supabase Secrets

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets

2. **Ou navegue:**
   - Dashboard Supabase
   - Seu projeto (`wabefmgfsatlusevxyfo`)
   - Settings (⚙️)
   - Edge Functions
   - Secrets

### PASSO 2: Atualizar/Criar Variáveis

**Atualize ou crie estas 3 variáveis:**

#### 1. EVOLUTION_API_URL
- **Name:** `EVOLUTION_API_URL`
- **Value:** `https://whatsapp-bot-barbearia-production.up.railway.app`
- **Ação:** Se já existir, clique em "Edit" e atualize. Se não existir, clique em "Add new secret"

#### 2. EVOLUTION_API_KEY
- **Name:** `EVOLUTION_API_KEY`
- **Value:** `testdaapi2026`
- **Ação:** Verifique se está correto, atualize se necessário

#### 3. EVOLUTION_INSTANCE_NAME
- **Name:** `EVOLUTION_INSTANCE_NAME`
- **Value:** `default`
- **Ação:** Verifique se está correto, atualize se necessário

---

## ✅ Verificação Final

Após atualizar, verifique se todas as 3 variáveis estão configuradas:

| Variável | Valor Esperado |
|----------|---------------|
| `EVOLUTION_API_URL` | `https://whatsapp-bot-barbearia-production.up.railway.app` |
| `EVOLUTION_API_KEY` | `testdaapi2026` |
| `EVOLUTION_INSTANCE_NAME` | `default` |

---

## 🧪 Testar Configuração

### Teste 1: Health Check do Railway

```powershell
Invoke-WebRequest -Uri "https://whatsapp-bot-barbearia-production.up.railway.app/health" -Method GET
```

**Deve retornar:** `{"status":"ok","connected":false}` ou similar

### Teste 2: Verificar Instâncias

```powershell
$headers = @{
    "apikey" = "testdaapi2026"
}
Invoke-WebRequest -Uri "https://whatsapp-bot-barbearia-production.up.railway.app/instance/fetchInstances" -Headers $headers -Method GET
```

**Deve retornar:** Lista de instâncias (provavelmente vazia ou com "default")

---

## 📱 Próximos Passos

Após atualizar as variáveis no Supabase:

1. **Aguarde 1-2 minutos** para as variáveis serem propagadas

2. **Acesse o painel admin:**
   - `http://localhost:8080/admin` (local)
   - Ou sua URL de produção

3. **Vá em "WhatsApp"** no menu lateral

4. **Clique em "Conectar WhatsApp"** ou "Gerar QR Code"

5. **Escaneie o QR code** com seu WhatsApp:
   - Abra WhatsApp no celular
   - Vá em: **Configurações → Aparelhos conectados → Conectar um aparelho**
   - Escaneie o QR code exibido no painel

6. **Aguarde conexão** (status mudará para "Conectado")

7. **Teste criando um agendamento** e verifique se a mensagem WhatsApp foi enviada

---

## 🔍 Troubleshooting

### ❌ Variáveis não aparecem no Supabase

**Solução:**
- Certifique-se de estar no projeto correto (`wabefmgfsatlusevxyfo`)
- Verifique se tem permissões de admin/owner
- Tente recarregar a página

### ❌ Health check não responde

**Verifique:**
- Se o Railway está rodando (veja logs no Railway dashboard)
- Se a URL está correta (sem barra final)
- Aguarde 1-2 minutos após deploy

### ❌ QR code não aparece no painel admin

**Verifique:**
- Se as variáveis no Supabase estão corretas
- Se o Railway está respondendo
- Veja os logs do Railway para erros
- Tente recarregar a página do painel admin

---

## ✅ Checklist Final

- [ ] **Variáveis atualizadas no Supabase** (3 variáveis)
- [ ] **Health check do Railway funcionando**
- [ ] **Painel admin acessível**
- [ ] **QR code gerado no painel admin**
- [ ] **WhatsApp conectado** (status "Conectado")
- [ ] **Teste de agendamento** (mensagem enviada)

---

**Status Atual:** ✅ **Railway funcionando, aguardando atualização do Supabase**

**Ação Imediata:** Atualize as 3 variáveis no dashboard do Supabase!
