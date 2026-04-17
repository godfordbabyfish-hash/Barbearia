# Como Conectar ao QR Code do WhatsApp

## Situação Atual

A tela mostra que a **Evolution API ainda está inicializando** e retornando erros 502 Bad Gateway. Por isso, **não há instâncias disponíveis** e, consequentemente, **não é possível gerar um QR code no momento**.

## Processo Normal de Conexão (Quando API Estiver Funcionando)

### Passo 1: Verificar se a Evolution API Está Funcionando
- A Evolution API precisa estar online e respondendo
- Você pode verificar no dashboard do Railway
- O sistema tentará criar uma instância automaticamente quando a API estiver pronta

### Passo 2: Aguardar Criação Automática da Instância
- Quando a API estiver funcionando, o sistema criará automaticamente uma instância chamada `evolution-4`
- Você verá a instância aparecer na lista "Instâncias Disponíveis"

### Passo 3: Gerar o QR Code
Quando a instância aparecer, você terá duas opções:

**Opção A: Botão "Conectar" (Recomendado)**
1. Clique no botão **"Conectar"** ao lado da instância
2. O sistema irá:
   - Desconectar a instância (se já estiver conectada)
   - Criar a instância (se não existir)
   - Gerar um novo QR code
3. O QR code aparecerá em um card na tela

**Opção B: Botão "Reconectar"**
- Se a instância já estiver conectada, aparecerá o botão **"Reconectar"**
- Funciona da mesma forma que "Conectar"

### Passo 4: Escanear o QR Code com WhatsApp
1. Abra o **WhatsApp** no seu celular
2. Vá em: **Configurações → Aparelhos conectados → Conectar um aparelho**
3. Escaneie o QR code que aparece na tela
4. Aguarde alguns segundos - o sistema detectará automaticamente quando você conectar

### Passo 5: Ativar a Instância
Após conectar:
1. Clique no botão **"Usar Esta"** ao lado da instância conectada
2. Isso marca a instância como ativa para envio de mensagens

## O Que Fazer Agora (API Não Está Funcionando)

### 1. Verificar Status da Evolution API no Railway
- Acesse o dashboard do Railway
- Verifique se o serviço está **Online**
- Veja os logs para entender por que está retornando 502

### 2. Verificar Variáveis de Ambiente no Supabase
Certifique-se de que as seguintes variáveis estão configuradas corretamente:
- `EVOLUTION_API_URL` - URL completa da API (ex: `https://whatsapp-bot-barbearia-production.up.railway.app`)
- `EVOLUTION_API_KEY` - Chave de API da Evolution API
- `EVOLUTION_INSTANCE_NAME` - Nome da instância (opcional, padrão: `evolution-4`)

### 3. Aguardar ou Forçar Nova Tentativa
- **Aguardar**: O sistema entrará em cooldown de 5 minutos após múltiplos erros. Após esse tempo, tentará novamente automaticamente
- **Forçar**: Clique no botão **"Atualizar"** para resetar o cooldown e tentar novamente imediatamente

### 4. Verificar Logs da Edge Function
- Acesse o Supabase Dashboard
- Vá em Edge Functions → `whatsapp-manager`
- Veja os logs para entender os erros específicos

## Troubleshooting

### Erro: "Evolution API não está respondendo (502 Bad Gateway)"
**Causa**: A Evolution API no Railway não está online ou não está respondendo

**Solução**:
1. Verifique o status no Railway
2. Veja os logs do Railway para entender o problema
3. Tente reiniciar o serviço no Railway se necessário
4. Aguarde alguns minutos - APIs podem levar tempo para inicializar

### Erro: "Acesso negado (403 Forbidden)"
**Causa**: API Key incorreta ou URL incorreta

**Solução**:
1. Verifique `EVOLUTION_API_KEY` no Supabase
2. Verifique `EVOLUTION_API_URL` no Supabase
3. Certifique-se de que a URL não tem barra no final (`/`)

### Erro: "Instância não encontrada (404)"
**Causa**: A instância não foi criada ainda

**Solução**:
1. O sistema criará automaticamente quando a API estiver funcionando
2. Ou clique em "Atualizar" para forçar nova tentativa

### QR Code Não Aparece
**Causa**: Instância pode já estar conectada ou API não está respondendo

**Solução**:
1. Verifique se a instância está com status "Desconectado"
2. Se estiver "Conectado", clique em "Reconectar" para gerar novo QR code
3. Se a API não está respondendo, aguarde até que esteja funcionando

## Fluxo Visual Esperado

```
1. [API Funcionando] → 2. [Instância Criada] → 3. [Botão "Conectar" Disponível]
                                                          ↓
4. [QR Code Aparece] → 5. [Escanear com WhatsApp] → 6. [Status: "Conectado"]
                                                          ↓
7. [Botão "Usar Esta"] → 8. [Instância Ativa] → 9. [Pronto para Enviar Mensagens]
```

## Status Atual vs. Esperado

**Status Atual**:
- ❌ Evolution API: 502 Bad Gateway (não está respondendo)
- ❌ Instâncias: Nenhuma disponível
- ❌ QR Code: Não pode ser gerado

**Status Esperado (Quando Funcionar)**:
- ✅ Evolution API: Online e respondendo
- ✅ Instâncias: `evolution-4` criada automaticamente
- ✅ QR Code: Disponível ao clicar em "Conectar"

## Próximos Passos Imediatos

1. **Verificar Railway**: Confirme que a Evolution API está online
2. **Aguardar Cooldown**: Se acabou de ter muitos erros, aguarde 5 minutos
3. **Clicar em "Atualizar"**: Para forçar nova tentativa após verificar Railway
4. **Monitorar Logs**: Veja os logs do Railway e Supabase para entender o problema

## Quando a API Estiver Funcionando

Assim que a Evolution API estiver respondendo:
1. A instância será criada automaticamente
2. Você verá a instância na lista
3. Clique em "Conectar" para gerar o QR code
4. Escaneie com seu WhatsApp
5. Pronto! O WhatsApp estará conectado
