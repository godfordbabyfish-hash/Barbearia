# ✅ Verificar se a Edge Function foi Deployada

## 🔍 Como Verificar

### Método 1: Verificar Logs no Supabase

1. Acesse: **Supabase Dashboard** → **Edge Functions** → **whatsapp-manager** → **Logs**
2. Tente gerar QR code no painel admin
3. Procure por estes logs:

**Se a Edge Function ATUALIZADA foi deployada, você verá:**
```
[WhatsApp Manager] get-qrcode action called for instance: default
[WhatsApp Manager] Step 1: Disconnecting instance to clear auth state...
[WhatsApp Manager] Step 2: Deleting instance to force clean state...
[WhatsApp Manager] Step 3: Creating fresh instance...
[WhatsApp Manager] Step 4: Connecting to get QR code...
```

**Se a Edge Function ANTIGA ainda está ativa, você NÃO verá esses logs de "Step 1", "Step 2", etc.**

### Método 2: Verificar Console do Navegador

1. Abra o console do navegador (F12)
2. Tente gerar QR code
3. Procure por:

**Se funcionou:**
```
[WhatsApp Manager Frontend] Calling get-qrcode for: default
[WhatsApp Manager Frontend] get-qrcode response: { data: { success: true, qrcode: {...} } }
```

**Se deu timeout:**
```
[WhatsApp Manager Frontend] getQRCode error: { message: "Timeout ao gerar QR code..." }
```

## 🚀 Fazer Deploy Agora

Se você ainda não fez o deploy, execute:

```bash
npx supabase functions deploy whatsapp-manager
```

**Ou via Supabase Dashboard:**
1. Acesse: Supabase Dashboard > Edge Functions > whatsapp-manager
2. Clique em "Deploy" ou faça commit/push para o GitHub

## ⚠️ Importante

- O timeout do frontend foi aumentado para **90 segundos**
- A Edge Function otimizada leva **~8-12 segundos** (não deve dar timeout)
- Se ainda der timeout após o deploy, pode ser que a Evolution API esteja muito lenta

## 🔍 Diagnóstico

### Se der timeout mesmo após deploy:

1. **Verifique os logs da Edge Function:**
   - Supabase Dashboard → Edge Functions → whatsapp-manager → Logs
   - Veja em qual "Step" está travando

2. **Verifique se a Evolution API está respondendo:**
   - Railway Dashboard → Verifique se o bot está online
   - Teste: `https://whatsapp-bot-barbearia-production.up.railway.app/health`

3. **Verifique variáveis de ambiente:**
   - Supabase Dashboard → Edge Functions → whatsapp-manager → Settings
   - `EVOLUTION_API_URL` está correto?
   - `EVOLUTION_API_KEY` está correto?

## 📝 Nota

O timeout de 90 segundos é suficiente para:
- Disconnect (1.5s)
- Delete (1.5s)
- Create (1.5s)
- Connect + Get QR code (até 20s)
- **Total: ~25 segundos máximo**

Se ainda der timeout, pode ser problema de rede ou a Evolution API está muito lenta.
