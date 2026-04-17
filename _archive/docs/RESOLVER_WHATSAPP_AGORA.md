# 🔧 Resolver Problema WhatsApp - Plano de Ação

## 🎯 Problema Principal

**WhatsApp não está conectado** - `connected: false` no health check
- Mensagens não chegam porque o bot não está conectado
- Código CORS já está pronto (aguardando push)
- Bot precisa escanear QR Code para conectar

## ✅ O Que Já Está Pronto

1. ✅ Código CORS adicionado no `index.js`
2. ✅ Logs de debug instrumentados
3. ✅ Lógica de reconexão automática
4. ✅ Health check endpoint funcionando

## 📋 Plano de Ação (Execute nesta ordem)

### PASSO 1: Fazer Push do Código CORS

**Você vai fazer manualmente:**
1. Use GitHub Desktop ou faça push via terminal
2. Aguarde 2-3 minutos para Railway fazer deploy
3. Verifique se o deploy foi bem-sucedido

**Como verificar deploy:**
```powershell
# Teste o health check
Invoke-WebRequest -Uri "https://whatsapp-bot-barbearia-production.up.railway.app/health" -UseBasicParsing
```

### PASSO 2: Conectar WhatsApp

**Após o deploy do CORS, execute:**

**Opção A: Usar HTML (Recomendado)**
1. Abra: `whatsapp-bot-railway\conectar-whatsapp-railway.html`
2. Preencha:
   - URL: `https://whatsapp-bot-barbearia-production.up.railway.app`
   - API Key: `testdaapi2026`
   - Instância: `default`
3. Clique em "Gerar QR Code"
4. **Escaneie o QR Code** com WhatsApp
5. Aguarde até aparecer "Conectado"

**Opção B: Usar PowerShell**
```powershell
cd "c:\Users\thiag\Downloads\Barbearia\whatsapp-bot-railway"
.\obter-qrcode-agora.ps1
```

**Opção C: Acessar Diretamente**
```
https://whatsapp-bot-barbearia-production.up.railway.app/instance/connect/default
```
(Use ModHeader para adicionar header `apikey: testdaapi2026`)

### PASSO 3: Verificar Conexão

**Teste 1: Health Check**
```powershell
Invoke-WebRequest -Uri "https://whatsapp-bot-barbearia-production.up.railway.app/health" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Deve mostrar:** `{"status":"ok", "connected":true}`

**Teste 2: Listar Instâncias**
```powershell
$headers = @{"apikey" = "testdaapi2026"}
Invoke-WebRequest -Uri "https://whatsapp-bot-barbearia-production.up.railway.app/instance/fetchInstances" -Headers $headers -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Deve mostrar:** Status `"open"` ou `"connected"`

### PASSO 4: Testar Envio de Mensagem

```powershell
.\testar-whatsapp-completo.ps1
```

**Deve mostrar:** "SUCESSO! Mensagem enviada!"

### PASSO 5: Testar Fluxo Completo

1. **Criar agendamento** no sistema
2. **Verificar** se mensagem foi enviada
3. **Verificar fila** no Supabase:
   ```sql
   SELECT * FROM whatsapp_notifications_queue ORDER BY created_at DESC LIMIT 10;
   ```

## 🔍 Se Ainda Não Funcionar

### Verificar Logs do Railway

1. Acesse: https://railway.app
2. Vá para o serviço `whatsapp-bot-barbearia`
3. Veja os logs em tempo real
4. Procure por:
   - `[Baileys] Conectado com sucesso!`
   - `[Baileys] QR Code gerado!`
   - Erros de conexão

### Verificar Logs do Supabase

1. Acesse: https://supabase.com
2. Vá para Edge Functions → `whatsapp-notify`
3. Veja os logs de execução
4. Procure por erros de API

### Verificar Fila de Notificações

```sql
-- Ver mensagens pendentes
SELECT * FROM whatsapp_notifications_queue 
WHERE status = 'pending' 
ORDER BY created_at DESC;

-- Ver mensagens falhadas
SELECT * FROM whatsapp_notifications_queue 
WHERE status = 'failed' 
ORDER BY created_at DESC;
```

## 📝 Checklist Final

- [ ] Push do código CORS feito
- [ ] Deploy no Railway completado (2-3 min)
- [ ] QR Code gerado e exibido
- [ ] WhatsApp escaneado com sucesso
- [ ] Health check mostra `connected: true`
- [ ] Teste de envio funciona
- [ ] Agendamento cria notificação
- [ ] Mensagem chega no WhatsApp

## 🚨 Problemas Comuns

### "CORS error" no HTML
- **Solução:** Aguarde o deploy do CORS completar (2-3 min)
- **Verificar:** Railway logs mostram servidor reiniciado

### "QR Code não aparece"
- **Solução:** Verifique se API Key está correta
- **Verificar:** Logs do Railway mostram QR sendo gerado

### "connected: false" mesmo após escanear
- **Solução:** Aguarde alguns segundos, o status pode demorar a atualizar
- **Verificar:** Logs do Railway mostram "Conectado com sucesso!"

### "Mensagem não chega"
- **Solução:** Verifique se WhatsApp está realmente conectado (`connected: true`)
- **Verificar:** Fila no Supabase tem itens pendentes?

---

**Comece pelo PASSO 1 (fazer push) e me informe quando estiver pronto para o PASSO 2!**
