# 🔍 Diagnosticar Timeout ao Gerar QR Code

## 📊 Situação Atual

Pelos logs do console:
- ✅ Frontend está chamando: `[WhatsApp Manager Frontend] Calling get-qrcode for: default`
- ✅ Edge Function está respondendo: `[WhatsApp Manager Frontend] get-qrcode response: {data: {…}, error: {…}}`
- ❌ **Timeout após 90 segundos**

## 🔍 Verificações Necessárias

### 1. Verificar Logs do Supabase para `get-qrcode`

**Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions/whatsapp-manager/logs

**Procure por logs que contenham:**
- `action: 'get-qrcode'`
- `Step 1: Disconnecting instance...`
- `Step 2: Deleting instance...`
- `Step 3: Creating fresh instance...`
- `Step 4: Connecting to get QR code...`

**Se você NÃO ver esses logs:**
- A requisição não está chegando na Edge Function
- Pode ser problema de autenticação ou roteamento

**Se você VER esses logs mas parar em algum Step:**
- A Evolution API pode estar demorando muito para responder
- O Step que parou indica onde está o problema

---

### 2. Verificar se a Evolution API está Respondendo

**Teste no PowerShell:**

```powershell
# Teste 1: Health check básico
$url = "https://whatsapp-bot-barbearia-production.up.railway.app"
Invoke-WebRequest -Uri $url -TimeoutSec 10
```

**Se responder:** API está online ✅

**Se não responder ou der timeout:** API pode estar offline ou muito lenta ❌

---

### 3. Verificar Variáveis de Ambiente no Supabase

**Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets

**Verifique se existem:**
- `EVOLUTION_API_URL` = `https://whatsapp-bot-barbearia-production.up.railway.app`
- `EVOLUTION_API_KEY` = `testdaapi2026`

**Se não existirem ou estiverem incorretas:**
1. Clique em "Add new secret"
2. Adicione cada variável
3. Faça deploy novamente da Edge Function

---

## 🔧 Soluções Possíveis

### Solução 1: Evolution API está Lenta

**Se a Evolution API está respondendo mas muito lenta:**

A Edge Function pode estar esperando mais que 90 segundos. Podemos aumentar o timeout do frontend, mas o ideal é que a Evolution API responda mais rápido.

**Teste manual:**
```powershell
$headers = @{
    "apikey" = "testdaapi2026"
}
$url = "https://whatsapp-bot-barbearia-production.up.railway.app/instance/fetchInstances"
Measure-Command { Invoke-WebRequest -Uri $url -Headers $headers -TimeoutSec 30 }
```

Se demorar mais que 30 segundos, a API está muito lenta.

---

### Solução 2: Evolution API está Offline

**Se a Evolution API não está respondendo:**

1. **Verifique o Railway Dashboard:**
   - Acesse: https://railway.app/dashboard
   - Procure pelo projeto "whatsapp-bot-barbearia"
   - Verifique se o serviço está rodando

2. **Reinicie o serviço no Railway:**
   - Railway Dashboard → Seu projeto → Deployments
   - Clique em "Redeploy" ou reinicie o serviço

---

### Solução 3: Timeout do Frontend Muito Curto

**Se a Evolution API está respondendo mas demora ~60-80 segundos:**

Podemos aumentar o timeout do frontend para 120 segundos, mas isso não é ideal. O problema real é a lentidão da Evolution API.

---

## 📝 Próximos Passos

1. **Verifique os logs do Supabase** para ver se a requisição `get-qrcode` está chegando
2. **Teste a Evolution API** para ver se está respondendo
3. **Verifique as variáveis de ambiente** no Supabase
4. **Me envie:**
   - Os logs do Supabase que mostram `get-qrcode` (se houver)
   - O resultado do teste da Evolution API
   - Se as variáveis de ambiente estão configuradas

Com essas informações, posso identificar exatamente onde está o problema!
