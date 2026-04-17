# 🔍 Debug: Mensagens WhatsApp Não Chegam

## 📋 Situação Atual

- ✅ Servidor Railway está online (`/health` responde)
- ⚠️ Health check mostra: `connected: false`
- ⚠️ Painel admin mostra: "Conectado" (status: 'open')
- ❌ **Mensagens não chegam**

## 🔬 Hipóteses Geradas

1. **Hipótese A**: `EVOLUTION_API_URL` não configurada ou incorreta
2. **Hipótese B**: `EVOLUTION_API_KEY` não configurada ou incorreta  
3. **Hipótese C**: WhatsApp não está realmente conectado (health check correto, painel desatualizado)
4. **Hipótese D**: Fila não está sendo processada após criar agendamento
5. **Hipótese E**: API do Railway rejeita envio (WhatsApp não conectado, erro na API)

## 🔧 Instrumentação Adicionada

Logs de debug foram adicionados em:
- ✅ Verificação de variáveis de ambiente
- ✅ Verificação de status de conexão (health check)
- ✅ Processamento da fila de notificações
- ✅ Chamadas à API do Railway
- ✅ Respostas da API do Railway
- ✅ Criação de agendamento (frontend)
- ✅ Disparo do process-queue (frontend)

## 📤 Deploy Necessário

Antes de testar, faça deploy das Edge Functions atualizadas:

```powershell
cd "c:\Users\thiag\Downloads\Barbearia"
npx supabase functions deploy whatsapp-notify
npx supabase functions deploy whatsapp-process-queue
```

**E também atualize o frontend** (se estiver usando Netlify/Vercel, faça push para GitHub)

## 🧪 Teste Completo

### Passo 1: Verificar Status Real

Execute o script de teste completo:

```powershell
cd "c:\Users\thiag\Downloads\Barbearia"
.\testar-whatsapp-completo.ps1
```

Este script vai:
- Verificar health check
- Listar instâncias e seus status
- Tentar enviar mensagem de teste

**Me envie a saída completa deste script!**

### Passo 2: Verificar Fila de Notificações

No Supabase Dashboard:
1. Vá em **SQL Editor**
2. Execute o arquivo: `verificar-fila-whatsapp.sql`
3. Verifique:
   - Quantas mensagens estão `pending`
   - Quantas mensagens estão `failed`
   - Quais são os erros (`error_message`)

**Me envie os resultados!**

### Passo 3: Criar Agendamento de Teste

1. **Crie um novo agendamento** no sistema
2. **Aguarde 10-15 segundos**
3. **Verifique os logs:**
   - Supabase Dashboard → Edge Functions → **whatsapp-process-queue** → Logs
   - Supabase Dashboard → Edge Functions → **whatsapp-notify** → Logs
   - Arquivo: `c:\Users\thiag\Downloads\Barbearia\.cursor\debug.log`

**Me envie os logs encontrados!**

## 🔍 O Que Procurar nos Logs

### Se Hipótese A (URL incorreta):
- Log mostrará: `evolutionApiUrl: NOT_SET` ou URL incorreta
- **Solução**: Configurar `EVOLUTION_API_URL` no Supabase

### Se Hipótese B (API Key incorreta):
- Log mostrará: `hasApiKey: false`
- **Solução**: Configurar `EVOLUTION_API_KEY` no Supabase

### Se Hipótese C (WhatsApp não conectado):
- Log mostrará: `connected: false` no health check
- **Solução**: Conectar WhatsApp escaneando QR Code

### Se Hipótese D (Fila não processada):
- Log não mostrará chamada ao `whatsapp-process-queue`
- **Solução**: Verificar se código está chamando a função após criar agendamento

### Se Hipótese E (Erro na API):
- Log mostrará erro na resposta da API (status code, mensagem de erro)
- **Solução**: Verificar se Railway está funcionando e se WhatsApp está conectado

## 📊 Verificações Rápidas

### 1. Verificar Variáveis no Supabase

```powershell
npx supabase secrets list
```

Deve mostrar:
- `EVOLUTION_API_URL` = `https://whatsapp-bot-barbearia-production.up.railway.app`
- `EVOLUTION_API_KEY` = `testdaapi2026` (ou valor configurado)
- `EVOLUTION_INSTANCE_NAME` = `default` (ou valor configurado)

### 2. Verificar Status Real do WhatsApp

Acesse no navegador (com ModHeader configurado):
```
https://whatsapp-bot-barbearia-production.up.railway.app/health
```

**Se mostrar `connected: false`:**
- O WhatsApp **NÃO está conectado**
- Conecte escaneando o QR Code

### 3. Verificar Fila no Banco

Execute no Supabase SQL Editor:
```sql
SELECT status, COUNT(*) as total 
FROM whatsapp_notifications_queue 
GROUP BY status;
```

**Se houver muitas `pending`:**
- A fila não está sendo processada
- Verifique logs do `whatsapp-process-queue`

**Se houver muitas `failed`:**
- Verifique `error_message` para ver o erro
- Pode ser WhatsApp não conectado ou API key incorreta

## ✅ Próximos Passos

1. **Execute o teste completo** (`testar-whatsapp-completo.ps1`)
2. **Verifique a fila** (SQL)
3. **Crie um agendamento de teste**
4. **Envie os logs** para análise

Com os logs, poderei identificar exatamente onde está o problema!
