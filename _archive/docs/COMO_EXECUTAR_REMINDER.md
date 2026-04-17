# 🚀 Como Configurar o Lembrete de 10 Minutos - EXECUTAR AGORA

## ✅ O que já está pronto:

1. ✅ Edge Function `whatsapp-reminder` criada e deployada
2. ✅ Código TypeScript corrigido e funcionando
3. ✅ Arquivo SQL pronto para executar

## 📋 Passo a Passo Rápido:

### 1. Abra o arquivo `EXECUTAR_AGORA_REMINDER.sql`

### 2. Substitua a SERVICE_ROLE_KEY

Na linha 28 do arquivo, você verá:
```sql
service_role_key TEXT := 'YOUR_SERVICE_ROLE_KEY'; -- ⚠️ SUBSTITUA AQUI!
```

**Substitua `YOUR_SERVICE_ROLE_KEY` pela sua chave real.**

**Onde encontrar:**
- Supabase Dashboard > Settings > API > **service_role key** (não é a anon key!)

### 3. Execute no Supabase SQL Editor

1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new
2. Cole todo o conteúdo do arquivo `EXECUTAR_AGORA_REMINDER.sql`
3. Clique em **"Run"** ou pressione `Ctrl + Enter`

### 4. Verificar se funcionou

Execute este SQL para verificar:
```sql
SELECT * FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute';
```

Você deve ver 1 linha retornada com os detalhes do cron job.

## 🎯 O que o SQL faz:

1. ✅ Habilita as extensões `pg_cron` e `pg_net`
2. ✅ Adiciona a coluna `reminder_sent` na tabela `appointments`
3. ✅ Cria índice para consultas rápidas
4. ✅ Cria a função `invoke_whatsapp_reminder()` que chama a Edge Function
5. ✅ Remove qualquer cron job existente (para evitar duplicatas)
6. ✅ Cria o cron job que executa **a cada minuto**
7. ✅ Verifica se foi criado com sucesso

## ⚡ Como funciona:

- **A cada minuto**, o cron job executa a função
- A função chama a Edge Function `whatsapp-reminder`
- A Edge Function verifica agendamentos que estão **10 minutos antes** do horário
- Envia mensagem WhatsApp para o cliente com lembrete + link do Google Maps
- Marca `reminder_sent = true` para não enviar novamente

## 🐛 Se der erro:

1. **Erro de sintaxe**: Verifique se substituiu `YOUR_SERVICE_ROLE_KEY` corretamente
2. **Erro de permissão**: Certifique-se de estar logado como admin no Supabase
3. **Cron job não aparece**: Execute novamente o SQL completo

## 📝 Arquivos criados:

- `EXECUTAR_AGORA_REMINDER.sql` - SQL completo para executar
- `CONFIGURAR_CRON_JOB_SIMPLES.sql` - Versão alternativa
- `executar-reminder-setup.ps1` - Script PowerShell (opcional)

**Use o arquivo `EXECUTAR_AGORA_REMINDER.sql` - é o mais simples!**
