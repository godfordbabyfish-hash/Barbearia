# 📱 Resumo: Configuração WhatsApp Organizada

## ✅ O que foi feito

1. **Arquivo de configuração centralizado criado:**
   - `src/config/whatsapp.ts` - Centraliza todas as configurações do WhatsApp

2. **Componente atualizado:**
   - `src/components/admin/WhatsAppManager.tsx` - Agora usa a configuração centralizada

3. **Guia completo criado:**
   - `COMO_TROCAR_CONTA_WHATSAPP.md` - Passo a passo detalhado

## 🎯 Como Trocar a Conta WhatsApp (Resumo Rápido)

### Método Simples (Recomendado):

1. **Acesse o Painel Admin** → Seção **WhatsApp**
2. **Clique em "Reconectar"** na instância desejada (ou crie uma nova)
3. **Escaneie o QR Code** com o novo número do WhatsApp
4. **Clique em "Usar Esta"** para ativar a instância
5. **Pronto!** O sistema agora usa a nova conta

### Método Avançado (Se quiser mudar o nome padrão):

1. Edite `src/config/whatsapp.ts`:
   ```typescript
   export const DEFAULT_INSTANCE_NAME = 'seu-novo-nome';
   ```

2. (Opcional) Atualize `EVOLUTION_INSTANCE_NAME` no Supabase

3. Siga os passos do método simples acima

## 📍 Onde está configurado

- **Configuração principal:** `src/config/whatsapp.ts`
- **Componente frontend:** `src/components/admin/WhatsAppManager.tsx`
- **Funções backend:** `supabase/functions/whatsapp-*`
- **Banco de dados:** Tabela `site_config` (chave: `whatsapp_active_instance`)

## 🔑 Prioridade das Configurações

1. **Banco de dados** (configurado no painel admin) ← **USE ESTE**
2. Variável de ambiente (`EVOLUTION_INSTANCE_NAME`)
3. Valor padrão do código (`DEFAULT_INSTANCE_NAME`)

## 📖 Documentação Completa

Para instruções detalhadas, consulte: **`COMO_TROCAR_CONTA_WHATSAPP.md`**

---

**Status:** ✅ Tudo organizado e pronto para uso!
