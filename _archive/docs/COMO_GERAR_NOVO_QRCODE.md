# Como Gerar um Novo QR Code para Trocar o Número do WhatsApp

Este guia explica como gerar um novo QR code para conectar um número diferente do WhatsApp.

## 🎯 Passo a Passo

### 1. Acessar o Painel de WhatsApp

1. Acesse o painel administrativo
2. No menu lateral, clique em **"WhatsApp"**
3. Você verá a lista de instâncias disponíveis

### 2. Gerar Novo QR Code

Você tem **duas opções**:

#### Opção A: Botão "Conectar" ou "Gerar Novo QR" (Recomendado)

1. Localize a instância que você quer usar (ex: "default")
2. Clique no botão **"Conectar"** (se desconectada) ou **"Gerar Novo QR"** (se conectada)
3. O sistema irá:
   - ✅ Desconectar a instância atual (se estiver conectada)
   - ✅ Deletar e recriar a instância (para garantir QR code totalmente novo)
   - ✅ Gerar um novo QR code
4. Aguarde alguns segundos - o QR code aparecerá na tela

#### Opção B: Botão "Atualizar QR Code" (Quando já há QR code exibido)

1. Se já houver um QR code sendo exibido na tela
2. Clique no botão **"Gerar Novo QR Code"** dentro do card do QR code
3. Um novo QR code será gerado

### 3. Escanear o QR Code

1. Abra o **WhatsApp** no celular com o número que você quer usar
2. Vá em: **Configurações → Aparelhos conectados → Conectar um aparelho**
3. Escaneie o QR code que aparece na tela
4. Aguarde alguns segundos - o sistema detectará automaticamente quando você conectar

### 4. Ativar a Instância

Após conectar com sucesso:

1. O status mudará para **"Conectado"** (verde)
2. Clique no botão **"Usar Esta"** ao lado da instância
3. Isso marca a instância como ativa para envio de mensagens

## ⚠️ Importante

- **Sempre desconecte antes de gerar novo QR code**: O sistema faz isso automaticamente
- **Cada QR code expira em ~20 segundos**: Se não escanear a tempo, clique em "Gerar Novo QR Code"
- **Um número por vez**: Cada instância conecta apenas um número do WhatsApp
- **Para trocar número**: Gere um novo QR code e escaneie com o novo número

## 🔄 Processo Automático

O sistema agora faz automaticamente:

1. **Desconecta** a instância atual
2. **Deleta** a instância antiga (limpa completamente)
3. **Recria** uma nova instância (garante QR code novo)
4. **Gera** o QR code
5. **Monitora** a conexão (atualiza automaticamente quando você escanear)

## ❓ Problemas Comuns

### QR Code não aparece
- Aguarde alguns segundos (o processo leva ~10-15 segundos)
- Verifique se a Evolution API está funcionando
- Clique em "Atualizar" no topo da tela

### QR Code expira muito rápido
- Clique em "Gerar Novo QR Code" dentro do card do QR code
- Ou clique novamente em "Conectar"/"Gerar Novo QR"

### Instância não conecta após escanear
- Aguarde até 10 segundos (o sistema verifica a cada 3 segundos)
- Verifique se escaneou o QR code correto
- Tente gerar um novo QR code

### Erro ao gerar QR code
- Verifique se a Evolution API está online no Railway
- Verifique as variáveis de ambiente (EVOLUTION_API_URL e EVOLUTION_API_KEY)
- Tente novamente após alguns segundos

## 📝 Notas

- O processo de gerar novo QR code leva aproximadamente **10-15 segundos**
- Você verá mensagens de progresso durante o processo
- O QR code é atualizado automaticamente se expirar
- O sistema detecta automaticamente quando você conecta

## ✅ Checklist

- [ ] Acessei o painel de WhatsApp
- [ ] Cliquei em "Conectar" ou "Gerar Novo QR"
- [ ] Aguardei o QR code aparecer
- [ ] Escaneei com o WhatsApp no celular
- [ ] Aguardei a conexão ser detectada
- [ ] Cliquei em "Usar Esta" para ativar
