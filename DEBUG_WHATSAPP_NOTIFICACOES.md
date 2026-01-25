# 🔍 Debug: Notificações WhatsApp Não Enviadas

## 📋 Hipóteses Geradas

1. **Hipótese A**: `EVOLUTION_API_URL` não está configurada ou está incorreta (não aponta para Railway)
2. **Hipótese B**: `EVOLUTION_API_KEY` não está configurada ou está incorreta
3. **Hipótese C**: A instância WhatsApp não está conectada (status não é "connected")
4. **Hipótese D**: A fila não está sendo processada (whatsapp-process-queue não está sendo chamado após criar agendamento)
5. **Hipótese E**: A API do Railway está retornando erro (conexão não estabelecida, timeout, 502, etc.)

## 🔧 Instrumentação Adicionada

Logs de debug foram adicionados em:
- ✅ Verificação de variáveis de ambiente (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`)
- ✅ Verificação de status de conexão do WhatsApp
- ✅ Processamento da fila de notificações
- ✅ Chamadas à API do Railway
- ✅ Respostas da API do Railway

## 📤 Deploy Necessário

Antes de testar, você precisa fazer deploy das Edge Functions atualizadas:

```powershell
cd "c:\Users\thiag\Downloads\Barbearia"
npx supabase functions deploy whatsapp-notify
npx supabase functions deploy whatsapp-process-queue
```

## 🧪 Teste

Após fazer o deploy, siga estes passos:

1. **Crie um novo agendamento de teste** no sistema
2. **Aguarde alguns segundos** para o processamento
3. **Verifique os logs** no Supabase Dashboard:
   - Vá em: **Edge Functions** → **whatsapp-process-queue** → **Logs**
   - Vá em: **Edge Functions** → **whatsapp-notify** → **Logs**
4. **Verifique o arquivo de debug**: `c:\Users\thiag\Downloads\Barbearia\.cursor\debug.log`

## 📊 O Que Procurar nos Logs

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
- **Solução**: Verificar se o código está chamando a função após criar agendamento

### Se Hipótese E (Erro na API):
- Log mostrará erro na resposta da API (status code, mensagem de erro)
- **Solução**: Verificar se Railway está funcionando e se WhatsApp está conectado

## 🔍 Verificar Configurações

Execute este comando para verificar as variáveis:

```powershell
npx supabase secrets list
```

Deve mostrar:
- `EVOLUTION_API_URL` = `https://whatsapp-bot-barbearia-production.up.railway.app`
- `EVOLUTION_API_KEY` = `testdaapi2026` (ou o valor configurado)
- `EVOLUTION_INSTANCE_NAME` = `default` (ou o valor configurado)

## ✅ Próximos Passos

1. Faça o deploy das Edge Functions
2. Crie um agendamento de teste
3. Envie os logs do Supabase e o arquivo `debug.log`
4. Analisarei os logs para identificar a causa raiz
