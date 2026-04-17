# 🚀 Deploy da Correção de Timeout

## 🔍 Problema Identificado

Pelos logs do Supabase:
- ✅ Step 1 (Disconnect) - OK
- ✅ Step 2 (Delete) - OK
- ✅ Step 3 (Create) - OK
- ❌ **Step 4 (Connect to get QR code) - TIMEOUT após 20 segundos**

A Evolution API não está respondendo à requisição `GET /instance/connect/default?qrcode=true` dentro de 20 segundos.

## ✅ Correção Aplicada

1. **Timeout aumentado:** De 20s para 40s no Step 4
2. **Logs melhorados:** Adicionados logs detalhados para diagnóstico
3. **Mensagem de erro melhorada:** Mais específica sobre o problema

## 🚀 Fazer Deploy Agora

Execute:

```powershell
cd "C:\Users\thiag\Downloads\Barbearia"
npx supabase functions deploy whatsapp-manager
```

## 📊 Após o Deploy

Quando tentar gerar QR code novamente, você verá nos logs:
- `[WhatsApp Manager] Step 4 URL: ...`
- `[WhatsApp Manager] Step 4: Making fetch request...`
- `[WhatsApp Manager] Step 4: Fetch completed in Xms, status: ...`

Isso vai ajudar a identificar se:
- A Evolution API está respondendo mas muito lenta (>40s)
- A Evolution API não está respondendo (timeout após 40s)
- Há algum erro na requisição

## ⚠️ Se Ainda Der Timeout

Se mesmo com 40s ainda der timeout, o problema é que a Evolution API está muito lenta ou não está respondendo. Nesse caso:

1. **Verifique o Railway Dashboard:**
   - Acesse: https://railway.app/dashboard
   - Verifique se o serviço está rodando
   - Veja os logs do Railway

2. **Reinicie o serviço no Railway:**
   - Railway Dashboard → Seu projeto → Deployments
   - Clique em "Redeploy" ou reinicie o serviço

3. **Teste a API manualmente:**
   ```powershell
   .\testar-evolution-api-agora.ps1
   ```

---

**Execute o deploy e tente gerar QR code novamente!** 🚀
