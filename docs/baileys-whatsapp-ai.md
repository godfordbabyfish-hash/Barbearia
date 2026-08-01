# Encaminhamento de mensagens do Baileys para a Atendente IA

O servidor local precisa encaminhar somente mensagens privadas recebidas para a Edge Function. A IA continua desativada até o admin habilitá-la no painel.

## Variável de ambiente

Adicione no `.env` da máquina do Baileys:

```env
WHATSAPP_WEBHOOK_URL=https://wabefmgfsatlusevxyfo.supabase.co/functions/v1/whatsapp-webhook
```

A autenticação utiliza a mesma variável `API_KEY` que já protege `/message/sendText`. Não copie a chave para o código-fonte.

## Alteração no `index.js`

Próximo das constantes `PORT` e `API_KEY`, adicione:

```js
const WHATSAPP_WEBHOOK_URL = process.env.WHATSAPP_WEBHOOK_URL || '';
```

Troque o listener atual de `messages.upsert` por este:

```js
socket.ev.on('messages.upsert', (event) => {
  const msg = event?.messages?.[0];
  if (!msg) return;

  const remoteJid = msg.key?.remoteJid || '';
  const isStatus = remoteJid === 'status@broadcast';
  const isGroup = remoteJid.endsWith('@g.us');
  const isBroadcast = msg.broadcast === true;
  const fromMe = msg.key?.fromMe === true;

  if (isStatus || isGroup || isBroadcast || fromMe) return;

  const content = msg.message || {};
  const text =
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    '';

  console.log('Mensagem recebida de', msg.pushName || remoteJid, '-', remoteJid, '::', text.slice(0, 120) || '[conteúdo não textual]');

  if (!WHATSAPP_WEBHOOK_URL || !text.trim()) return;

  void fetch(WHATSAPP_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: API_KEY,
    },
    body: JSON.stringify({
      event: 'messages.upsert',
      instance: sessionId,
      data: msg,
    }),
  })
    .then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('[AI-WEBHOOK] Falha:', response.status, result?.error || result);
        return;
      }
      console.log('[AI-WEBHOOK] Processado:', result);
    })
    .catch((error) => console.error('[AI-WEBHOOK] Supabase indisponível:', error.message));
});
```

Depois da alteração, reinicie o processo do Baileys. Mensagens enviadas pelo próprio número, grupos, status e mídias sem legenda são ignorados para impedir loops e respostas indevidas.
