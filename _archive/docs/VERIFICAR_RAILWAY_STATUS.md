# ✅ Verificar Status do Railway - Checklist Rápido

## 📋 O Que Verificar Agora

### 1. ✅ Variáveis Configuradas (JÁ ESTÁ OK!)

Vejo que você já tem:
- ✅ `API_KEY`: `testdaapi2026` ✓
- ✅ `PORT`: `3000` ✓

**Status:** ✅ **Configurado corretamente!**

---

### 2. ⚠️ Deploy Pendente

**Vejo que há 1 mudança pendente!**

**Ação necessária:**
1. No Railway, clique no botão **"Deploy"** ou **"Apply 1 change"**
2. Aguarde o deploy completar (1-2 minutos)
3. Verifique se o status mudou para "Active" ou "Running"

---

### 3. 🔍 Obter URL do Railway

**Após o deploy completar:**

1. No Railway, clique no serviço `whatsapp-bot-barbearia`
2. Vá em **"Settings"** (aba lateral)
3. Role até **"Networking"**
4. Veja a URL gerada (ex: `https://whatsapp-bot-xxxx.up.railway.app`)
5. **Anote essa URL!** Você vai precisar dela.

**OU** se já tiver uma URL configurada:
- Vá em **"Settings"** > **"Networking"**
- A URL estará lá

---

### 4. 🔗 Atualizar Supabase com a URL do Railway

**Depois de obter a URL do Railway, execute:**

```powershell
.\atualizar-railway-url.ps1 -RailwayUrl "https://whatsapp-bot-xxxx.up.railway.app"
```

*(Substitua pela URL real do seu Railway)*

**OU manualmente:**

```powershell
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-xxxx.up.railway.app
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
npx supabase secrets set EVOLUTION_INSTANCE_NAME=default
```

---

### 5. ✅ Testar se Railway Está Funcionando

**Após o deploy completar e obter a URL:**

```powershell
# Teste 1: Health Check
Invoke-WebRequest -Uri "https://whatsapp-bot-xxxx.up.railway.app/health" -Method GET

# Deve retornar algo como: {"status":"ok","connected":false}
```

**Se retornar erro:**
- Aguarde mais 1-2 minutos (Railway pode estar inicializando)
- Verifique os logs no Railway (clique no serviço > "Deployments" > "View Logs")

---

## 🎯 Checklist Final

- [ ] **Deploy aplicado** (clique em "Deploy" no Railway)
- [ ] **URL do Railway obtida** (Settings > Networking)
- [ ] **Supabase atualizado** (executar script ou comando manual)
- [ ] **Health check funcionando** (teste com Invoke-WebRequest)
- [ ] **Conectar WhatsApp** (painel admin > WhatsApp > Conectar)

---

## 📱 Próximos Passos Após Tudo Configurado

1. **Acesse o painel admin:** `http://localhost:8080/admin`
2. **Vá em "WhatsApp"** no menu lateral
3. **Clique em "Conectar WhatsApp"**
4. **Escaneie o QR code** com seu celular
5. **Aguarde conexão** (status mudará para "Conectado")
6. **Teste criando um agendamento** e verifique se a mensagem WhatsApp foi enviada

---

## 🔍 Troubleshooting

### ❌ Deploy não completa

**Verifique:**
- Logs no Railway (clique no serviço > "Deployments" > "View Logs")
- Se há erros de build
- Se `package.json` está correto

### ❌ Health check não responde

**Aguarde:**
- Railway pode levar 1-2 minutos para inicializar completamente
- Verifique logs para ver se há erros

### ❌ URL não aparece

**Solução:**
- Vá em Settings > Networking
- Clique em "Generate Domain" se não houver URL

---

**Status Atual:** ⚠️ **Aguardando deploy da mudança pendente**

**Ação Imediata:** Clique em **"Deploy"** no Railway para aplicar a mudança!
