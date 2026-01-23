# 🚀 PRÓXIMOS PASSOS: DEIXAR AGENDAMENTOS FUNCIONANDO

## 🎯 STATUS ATUAL

✅ **Neon PostgreSQL configurado**  
✅ **Evolution API deployada no Fly.io**  
⏳ **Aguardando API inicializar**  
❌ **Falta configurar variáveis no Supabase**  
❌ **Falta criar instância WhatsApp**  
❌ **Falta configurar números dos barbeiros**

---

## 📋 CHECKLIST COMPLETO

### ✅ PASSO 1: Verificar se Evolution API está funcionando

**Aguarde 2-3 minutos após a configuração do Neon e teste:**

```powershell
Invoke-WebRequest -Uri "https://evolution-api-barbearia.fly.dev" -TimeoutSec 20
```

**Ou acesse no navegador:**
https://evolution-api-barbearia.fly.dev

**✅ Resultado esperado:** API responde (não erro 502)

**❌ Se ainda der erro 502:**
- Verifique os logs: `fly logs --app evolution-api-barbearia`
- Aguarde mais 2-3 minutos
- Verifique se há erros de Prisma/database nos logs

---

### ⚡ PASSO 2: Configurar Variáveis no Supabase

**As Edge Functions precisam destas variáveis:**

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets

2. **Adicione estas variáveis:**

   ```
   EVOLUTION_API_URL=https://evolution-api-barbearia.fly.dev
   EVOLUTION_API_KEY=testdaapi2026
   EVOLUTION_INSTANCE_NAME=evolution-4
   ```

   **Ou execute:**
   ```powershell
   npx supabase secrets set EVOLUTION_API_URL=https://evolution-api-barbearia.fly.dev
   npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
   npx supabase secrets set EVOLUTION_INSTANCE_NAME=evolution-4
   ```

---

### ⚡ PASSO 3: Criar Instância WhatsApp

**A Evolution API precisa de uma instância WhatsApp ativa:**

1. **Acesse o painel admin do seu sistema:**
   - URL: Seu site Netlify (ex: `https://seu-site.netlify.app`)
   - Faça login como admin

2. **Vá em:** "WhatsApp" → "WhatsApp Manager"

3. **Crie uma nova instância:**
   - Nome: `evolution-4` (ou outro nome)
   - Aguarde o QR Code aparecer

4. **Escaneie o QR Code com seu WhatsApp:**
   - Abra WhatsApp no celular
   - Menu → Aparelhos conectados → Conectar um aparelho
   - Escaneie o QR Code

5. **Aguarde conectar** (pode levar 30-60 segundos)

**✅ Verificação:** Status deve mudar para "Conectado" ou "Online"

---

### ⚡ PASSO 4: Configurar Números dos Barbeiros (OPCIONAL)

**Para enviar notificações aos barbeiros:**

1. **No painel admin**, vá em: "Configurações" → "Barbeiros"

2. **Para cada barbeiro:**
   - Adicione o número de WhatsApp (formato: `5511999999999`)
   - Salve

**⚠️ Nota:** Se não configurar, apenas clientes receberão notificações.

---

### ⚡ PASSO 5: Testar Agendamento

**Agora teste criar um agendamento:**

1. **Acesse o site** (como cliente ou admin)

2. **Crie um agendamento:**
   - Escolha serviço
   - Escolha barbeiro
   - Escolha data/hora
   - Preencha dados do cliente (com telefone válido)

3. **Confirme o agendamento**

4. **Verifique:**
   - ✅ Agendamento aparece no sistema
   - ✅ Cliente recebe WhatsApp (se tiver número válido)
   - ✅ Barbeiro recebe WhatsApp (se configurado)

---

## 🔧 VERIFICAÇÕES FINAIS

### Verificar se tudo está funcionando:

1. **Evolution API:**
   ```powershell
   Invoke-WebRequest -Uri "https://evolution-api-barbearia.fly.dev" -TimeoutSec 10
   ```

2. **Edge Functions:**
   - Verifique se as variáveis estão configuradas no Supabase
   - Teste criar um agendamento

3. **Fila de WhatsApp:**
   - No painel admin, verifique se há mensagens na fila
   - Verifique se estão sendo processadas

---

## 🎯 ORDEM DE EXECUÇÃO

1. ✅ **Aguardar Evolution API inicializar** (2-3 minutos)
2. ⚡ **Configurar variáveis no Supabase** (PASSO 2)
3. ⚡ **Criar instância WhatsApp** (PASSO 3)
4. ⚡ **Testar agendamento** (PASSO 5)

---

## 🚨 SE ALGO NÃO FUNCIONAR

### Problema: API ainda retorna 502

**Solução:**
- Verifique logs: `fly logs --app evolution-api-barbearia`
- Procure por erros de Prisma/database
- Aguarde mais tempo (pode levar 3-5 minutos)

### Problema: Instância WhatsApp não conecta

**Solução:**
- Verifique se a Evolution API está funcionando
- Tente criar nova instância
- Verifique se o QR Code não expirou

### Problema: Mensagens não são enviadas

**Solução:**
- Verifique variáveis no Supabase
- Verifique se instância está conectada
- Verifique logs das Edge Functions no Supabase

---

**Status:** 🚀 **PRÓXIMOS PASSOS DEFINIDOS!**
