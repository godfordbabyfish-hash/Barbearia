# 🚀 Deploy Manual da Correção de Timeout

## ✅ Código Já Está Corrigido!

O código da Edge Function já foi atualizado com:
- ✅ Timeout aumentado de 20s para 40s no Step 4
- ✅ Logs detalhados adicionados
- ✅ Mensagem de erro melhorada

## 🔧 Fazer Deploy Manualmente

Como há um problema com o cache do npm, você pode fazer o deploy de duas formas:

### Opção 1: Via Supabase Dashboard (Mais Fácil)

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions/whatsapp-manager
2. **Vá na aba:** "Code"
3. **Abra o arquivo:** `supabase\functions\whatsapp-manager\index.ts` no seu editor
4. **Copie TODO o conteúdo** do arquivo
5. **Cole no editor** do Dashboard
6. **Clique em:** "Deploy" ou "Save"

### Opção 2: Via Terminal (Se o npm funcionar)

Tente executar diretamente no terminal (não via script):

```powershell
cd "C:\Users\thiag\Downloads\Barbearia"
npx supabase functions deploy whatsapp-manager
```

Se der erro de cache, tente:

```powershell
cd "C:\Users\thiag\Downloads\Barbearia"
npm install -g supabase
supabase functions deploy whatsapp-manager
```

## 📊 Verificar se o Deploy Funcionou

Após fazer o deploy:

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions/whatsapp-manager
2. **Vá na aba:** "Details"
3. **Verifique:** "Last updated at" deve mostrar a data/hora de hoje

## 🎯 Testar Após o Deploy

1. **Acesse o painel admin** → **WhatsApp**
2. **Clique em "Gerar Novo QR"** na instância "default"
3. **Aguarde até 40 segundos** (timeout aumentado)
4. **Verifique os logs do Supabase** para ver:
   - `[WhatsApp Manager] Step 4 URL: ...`
   - `[WhatsApp Manager] Step 4: Making fetch request...`
   - `[WhatsApp Manager] Step 4: Fetch completed in Xms, status: ...`

## ⚠️ Se Ainda Der Timeout

Se mesmo com 40s ainda der timeout:

1. **Reinicie o serviço no Railway:**
   - Acesse: https://railway.app/dashboard
   - Procure pelo projeto "whatsapp-bot-barbearia"
   - Clique em "Redeploy"
   - Aguarde 2-3 minutos
   - Tente gerar QR code novamente

2. **Teste a API manualmente:**
   ```powershell
   .\testar-evolution-api-agora.ps1
   ```

---

**Recomendo usar a Opção 1 (Dashboard) - é mais rápida e não depende do npm!** 🚀
