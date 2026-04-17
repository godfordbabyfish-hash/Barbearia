# 🚀 Configurar WhatsApp Bot Railway - Guia Completo

## 📋 O Que Precisa Ser Feito

O sistema já está **100% compatível** com o bot Railway! O código atual funciona tanto com Evolution API quanto com o bot Baileys do Railway, pois ambos usam os mesmos endpoints.

## ✅ Checklist de Configuração

### 1. Deploy do Bot no Railway (SE AINDA NÃO FEZ)

**Repositório:** https://github.com/godfordbabyfish-hash/whatsapp-bot-barbearia

**Passos:**
1. Acesse https://railway.app
2. Faça login com GitHub
3. Clique em "New Project"
4. Selecione "Deploy from GitHub repo"
5. Escolha o repositório `whatsapp-bot-barbearia`
6. Railway detectará automaticamente o `package.json`

**Variáveis de Ambiente no Railway:**
- `API_KEY`: `testdaapi2026` (ou outra chave segura)
- `PORT`: `3000` (Railway define automaticamente)

**Aguarde o deploy completar e anote a URL gerada:**
- Exemplo: `https://whatsapp-bot-xxxx.up.railway.app`

---

### 2. Verificar/Atualizar Variáveis no Supabase

**Acesse:**
https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets

**Verifique se estas variáveis estão configuradas:**

| Variável | Valor Esperado | Status |
|----------|---------------|--------|
| `EVOLUTION_API_URL` | URL do Railway (ex: `https://whatsapp-bot-xxxx.up.railway.app`) | ⬜ Verificar |
| `EVOLUTION_API_KEY` | `testdaapi2026` | ⬜ Verificar |
| `EVOLUTION_INSTANCE_NAME` | `default` (ou o nome da instância configurada) | ⬜ Verificar |

**Se precisar atualizar, execute:**

```powershell
# Substitua pela URL real do seu Railway
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-xxxx.up.railway.app
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
npx supabase secrets set EVOLUTION_INSTANCE_NAME=default
```

**OU use o script automatizado:**

```powershell
.\atualizar-supabase-url.ps1
```

*(Edite o script para usar a URL do Railway)*

---

### 3. Conectar WhatsApp no Painel Admin

1. Acesse o painel admin: `http://localhost:8080/admin` (ou sua URL de produção)
2. Vá em **"WhatsApp"** no menu lateral
3. Clique em **"Conectar WhatsApp"** ou **"Gerar QR Code"**
4. Escaneie o QR code com seu WhatsApp:
   - Abra WhatsApp no celular
   - Vá em: **Configurações → Aparelhos conectados → Conectar um aparelho**
   - Escaneie o QR code
5. Aguarde a conexão (status mudará para "Conectado")

---

### 4. Verificar se Está Funcionando

**Teste 1: Verificar API do Railway**
```powershell
# Teste se a API está respondendo
Invoke-WebRequest -Uri "https://whatsapp-bot-xxxx.up.railway.app/health" -Method GET
```

**Teste 2: Verificar Instâncias**
```powershell
# Listar instâncias (substitua pela URL real)
$headers = @{
    "apikey" = "testdaapi2026"
}
Invoke-WebRequest -Uri "https://whatsapp-bot-xxxx.up.railway.app/instance/fetchInstances" -Headers $headers -Method GET
```

**Teste 3: Criar um Agendamento de Teste**
1. No sistema, crie um agendamento
2. Verifique se a mensagem WhatsApp foi enviada
3. Verifique os logs no Railway para ver se houve erros

---

### 5. Verificar Fila de Notificações (Se Mensagens Não Chegarem)

**No Supabase Dashboard:**
1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/editor
2. Vá em **SQL Editor**
3. Execute:

```sql
SELECT 
  id,
  appointment_id,
  client_phone,
  client_name,
  message_action,
  status,
  attempts,
  error_message,
  created_at
FROM whatsapp_notifications_queue
ORDER BY created_at DESC
LIMIT 10;
```

**Verifique:**
- ✅ Se há mensagens com `status = 'sent'` → Está funcionando!
- ⚠️ Se há mensagens com `status = 'pending'` → A fila não está sendo processada
- ❌ Se há mensagens com `status = 'failed'` → Verifique `error_message`

**Processar Fila Manualmente (se necessário):**
```powershell
# No console do navegador (F12) ou via curl
$supabaseUrl = "https://wabefmgfsatlusevxyfo.supabase.co"
$supabaseKey = "SUA_SERVICE_ROLE_KEY"

Invoke-WebRequest -Uri "$supabaseUrl/functions/v1/whatsapp-process-queue" `
  -Method POST `
  -Headers @{
    "Content-Type" = "application/json"
    "apikey" = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
  }
```

---

## 🔍 Troubleshooting

### ❌ Bot não conecta no Railway

**Verifique:**
1. Se o deploy foi concluído com sucesso
2. Se a URL está acessível (teste no navegador)
3. Se as variáveis de ambiente estão configuradas
4. Veja os logs no Railway dashboard

### ❌ Mensagens não enviam

**Verifique:**
1. Se o WhatsApp está conectado (status "open" no painel admin)
2. Se a URL do Railway está correta no Supabase
3. Se a API key está correta
4. Veja os logs do Railway para erros
5. Verifique a fila de notificações no Supabase

### ❌ Erro 502 Bad Gateway

**Causas possíveis:**
- Railway está offline ou com problemas
- URL incorreta no Supabase
- API key incorreta

**Solução:**
1. Verifique se o Railway está rodando
2. Verifique a URL no Supabase
3. Teste a API diretamente

### ❌ Sessão WhatsApp expira

**Solução:**
- O bot Railway (Baileys) reconecta automaticamente
- Se não reconectar, delete a instância e crie uma nova
- No painel admin, clique em "Desconectar" e depois "Conectar" novamente

---

## 📝 Notas Importantes

1. **Compatibilidade:** O sistema atual já está preparado para Railway! Não precisa mudar código.

2. **Instância Padrão:** O bot Railway usa `default` como nome de instância padrão. Se mudar, atualize `EVOLUTION_INSTANCE_NAME`.

3. **Formato de Telefone:** O sistema já formata automaticamente (adiciona código do país 55 para Brasil).

4. **Fila de Processamento:** O sistema usa uma fila (`whatsapp_notifications_queue`) para garantir que todas as mensagens sejam enviadas, mesmo se houver falhas temporárias.

5. **Logs:** Sempre verifique os logs no Railway para diagnosticar problemas.

---

## ✅ Próximos Passos

1. ✅ Fazer deploy do bot no Railway (se ainda não fez)
2. ✅ Atualizar `EVOLUTION_API_URL` no Supabase
3. ✅ Conectar WhatsApp no painel admin
4. ✅ Testar criando um agendamento
5. ✅ Verificar se a mensagem chegou

---

## 🔗 Links Úteis

- **Railway Dashboard:** https://railway.app
- **Supabase Secrets:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets
- **Repositório Bot:** https://github.com/godfordbabyfish-hash/whatsapp-bot-barbearia
- **SQL Editor Supabase:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new

---

**Última atualização:** 2026-01-24
