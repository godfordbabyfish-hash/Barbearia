# 📱 Como Trocar a Conta WhatsApp - Guia Completo

Este guia explica como trocar a conta/número do WhatsApp que será usado para enviar notificações no sistema.

## 🎯 Visão Geral

O sistema usa uma **instância WhatsApp** conectada via Evolution API. Cada instância representa uma conta/número do WhatsApp. Para trocar de conta, você precisa:

1. **Configurar o nome da instância** (identificador único)
2. **Conectar a nova conta** via QR Code
3. **Ativar a nova instância** no sistema

---

## 📋 Passo a Passo

### **PASSO 1: Escolher um Nome para a Nova Instância**

O nome da instância é apenas um identificador. Você pode usar qualquer nome único, por exemplo:
- `default` (padrão)
- `barbearia-principal`
- `whatsapp-2026`
- `numero-novo`

**Importante:** Se você vai usar um número completamente novo, escolha um nome diferente da instância antiga.

---

### **PASSO 2: Atualizar a Configuração no Código (Opcional)**

Se você quer mudar o nome padrão usado quando não há configuração salva:

1. Abra o arquivo: `src/config/whatsapp.ts`
2. Altere o valor de `DEFAULT_INSTANCE_NAME`:

```typescript
export const DEFAULT_INSTANCE_NAME = 'seu-novo-nome-aqui';
```

3. Salve o arquivo e faça commit/push para o GitHub

**Nota:** Isso é opcional. Você pode configurar tudo pelo painel admin sem alterar o código.

---

### **PASSO 3: Atualizar Variável de Ambiente no Supabase (Opcional)**

Se você quer definir um fallback via variável de ambiente:

1. Acesse o **Supabase Dashboard**
2. Vá em **Project Settings** → **Edge Functions** → **Secrets**
3. Procure por `EVOLUTION_INSTANCE_NAME`
4. Se existir, edite para o novo nome
5. Se não existir, adicione:
   - **Name:** `EVOLUTION_INSTANCE_NAME`
   - **Value:** `seu-novo-nome-aqui`

**Nota:** Isso também é opcional. A configuração no banco de dados tem prioridade.

---

### **PASSO 4: Conectar a Nova Conta via QR Code**

1. Acesse o **Painel Admin** do sistema
2. Vá na seção **WhatsApp**
3. Você verá a lista de instâncias disponíveis

#### **Opção A: Usar Instância Existente (Reconectar)**

Se você quer reconectar a mesma instância com um número diferente:

1. Clique em **"Reconectar"** na instância desejada
2. Um QR Code aparecerá
3. Abra o WhatsApp no celular com o **novo número**
4. Vá em: **Configurações** → **Aparelhos conectados** → **Conectar um aparelho**
5. Escaneie o QR Code
6. Aguarde a conexão (status mudará para "Conectado")

#### **Opção B: Criar Nova Instância**

Se você quer criar uma instância completamente nova:

1. No painel WhatsApp, clique em **"Atualizar"** para ver as instâncias
2. Se não aparecer a instância desejada, ela será criada automaticamente quando você gerar o QR Code
3. Use o nome da instância que você escolheu no Passo 1
4. Clique em **"Conectar"** (ou "Gerar QR Code")
5. Escaneie o QR Code com o novo número
6. Aguarde a conexão

---

### **PASSO 5: Ativar a Nova Instância**

Após conectar com sucesso:

1. Na lista de instâncias, você verá a instância com status **"Conectado"**
2. Clique no botão **"Usar Esta"** (ou **"Ativar"**)
3. A instância será marcada como **"Ativa"**
4. O sistema agora usará esta instância para enviar mensagens

---

### **PASSO 6: (Opcional) Desconectar/Deletar Instância Antiga**

Se você não vai mais usar a instância antiga:

1. Na lista de instâncias, encontre a instância antiga
2. Se estiver conectada, clique em **"Desconectar"**
3. Clique no botão de **lixeira** para deletar
4. Confirme a exclusão

**Atenção:** Isso é opcional. Você pode manter múltiplas instâncias e alternar entre elas.

---

## 🔍 Verificação

Para verificar se tudo está funcionando:

1. **Verifique o status:**
   - A instância deve aparecer como **"Conectado"** (status: open)
   - A instância deve estar marcada como **"Ativa"**

2. **Teste o envio:**
   - Crie um agendamento de teste
   - Verifique se a notificação WhatsApp foi enviada
   - Confirme que a mensagem veio do número correto

3. **Verifique os logs:**
   - No Supabase, vá em **Edge Functions** → **Logs**
   - Procure por `whatsapp-notify` ou `whatsapp-manager`
   - Verifique se não há erros relacionados à instância

---

## 📝 Resumo das Prioridades

O sistema usa a seguinte ordem de prioridade para determinar qual instância usar:

1. **Banco de dados** (`site_config` → `whatsapp_active_instance`) - **MAIOR PRIORIDADE**
2. **Variável de ambiente** (`EVOLUTION_INSTANCE_NAME`)
3. **Valor padrão do código** (`DEFAULT_INSTANCE_NAME`)

**Recomendação:** Use sempre o painel admin para configurar a instância ativa. Isso salva no banco de dados e tem a maior prioridade.

---

## ⚠️ Problemas Comuns

### **Problema: QR Code não aparece**

**Solução:**
- Verifique se a Evolution API está online (Railway)
- Aguarde alguns segundos e tente novamente
- Clique em "Reconectar" para forçar desconexão e gerar novo QR

### **Problema: Instância não conecta**

**Solução:**
- Certifique-se de que está escaneando com o número correto
- Verifique se o WhatsApp no celular está atualizado
- Tente desconectar e gerar um novo QR Code

### **Problema: Mensagens não são enviadas**

**Solução:**
- Verifique se a instância está **"Conectada"** e **"Ativa"**
- Verifique os logs do Supabase para erros
- Confirme que `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` estão corretos

### **Problema: Instância antiga ainda está ativa**

**Solução:**
- Acesse o painel WhatsApp
- Clique em **"Usar Esta"** na nova instância
- Ou desconecte/delete a instância antiga

---

## 🔄 Alternar Entre Múltiplas Contas

Se você quer manter múltiplas contas e alternar entre elas:

1. Conecte todas as contas desejadas (cada uma com seu próprio nome de instância)
2. Quando quiser usar uma conta específica:
   - Acesse o painel WhatsApp
   - Clique em **"Usar Esta"** na instância desejada
3. A instância ativa será atualizada imediatamente

---

## 📞 Suporte

Se tiver problemas:

1. Verifique os logs do Supabase (Edge Functions)
2. Verifique os logs do Railway (Evolution API)
3. Confirme todas as variáveis de ambiente estão configuradas
4. Teste a Evolution API diretamente: `https://seu-bot.up.railway.app/health`

---

## ✅ Checklist Final

Antes de considerar a troca completa:

- [ ] Nova instância criada/conectada
- [ ] QR Code escaneado com sucesso
- [ ] Status mostra "Conectado"
- [ ] Instância marcada como "Ativa"
- [ ] Teste de envio realizado com sucesso
- [ ] Mensagem recebida do número correto
- [ ] (Opcional) Instância antiga desconectada/deletada

---

**Última atualização:** Janeiro 2026
