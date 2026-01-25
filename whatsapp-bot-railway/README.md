<<<<<<< HEAD
# WhatsApp Bot - Baileys + Railway

Bot WhatsApp usando Baileys para notificações da barbearia, deployado no Railway (100% gratuito).

## 🚀 Deploy no Railway

### Passo 1: Criar conta no Railway
1. Acesse https://railway.app
2. Faça login com GitHub
3. Clique em "New Project"
4. Selecione "Deploy from GitHub repo"

### Passo 2: Conectar repositório
1. Selecione seu repositório
2. Railway detectará automaticamente o `package.json`
3. Configure as variáveis de ambiente:
   - `API_KEY`: `testdaapi2026` (ou outra chave segura)
   - `PORT`: `3000` (Railway define automaticamente, mas pode definir)

### Passo 3: Deploy
1. Railway fará deploy automaticamente
2. Aguarde o build completar
3. Anote a URL gerada (ex: `https://whatsapp-bot-xxxx.up.railway.app`)

### Passo 4: Configurar Supabase
1. No Supabase, vá em Settings > Edge Functions > Secrets
2. Atualize `EVOLUTION_API_URL` para a URL do Railway
3. Mantenha `EVOLUTION_API_KEY` como está (ou atualize se mudou)

## 📋 Estrutura

```
whatsapp-bot-railway/
├── index.js          # Bot principal (Baileys + Express)
├── package.json      # Dependências
├── README.md         # Este arquivo
└── auth_info/        # Sessões WhatsApp (criado automaticamente)
    └── default/      # Sessão padrão
```

## 🔧 API Endpoints

Compatível com Evolution API (mesmos endpoints):

- `GET /health` - Status do bot
- `GET /instance/fetchInstances` - Listar instâncias
- `POST /instance/create` - Criar instância
- `GET /instance/connect/:instanceName` - Obter QR code
- `POST /message/sendText/:instanceName` - Enviar mensagem
- `DELETE /instance/logout/:instanceName` - Desconectar
- `DELETE /instance/delete/:instanceName` - Deletar instância

## 🔐 Autenticação

Todas as requisições requerem header:
```
apikey: testdaapi2026
```

## 📱 Primeira Conexão

1. Acesse: `GET /instance/connect/default`
2. Escaneie o QR code com WhatsApp
3. Aguarde conexão (status: `open`)

## ✅ Vantagens sobre Evolution API

- ✅ **100% Gratuito** (Railway free tier)
- ✅ **Mais Simples** (sem Docker, sem PostgreSQL)
- ✅ **Mais Leve** (Baileys não usa Puppeteer)
- ✅ **Deploy Rápido** (5 minutos)
- ✅ **Logs em Tempo Real** (Railway dashboard)
- ✅ **Compatível** (mesma API da Evolution)

## 🐛 Troubleshooting

### Bot não conecta
- Verifique se o QR code foi escaneado
- Aguarde alguns segundos após escanear
- Verifique logs no Railway

### Mensagens não enviam
- Verifique se `mainSocket.user` existe (bot conectado)
- Verifique formato do número (deve incluir código do país)
- Verifique logs para erros

### Sessão expira
- Baileys reconecta automaticamente
- Se não reconectar, delete `auth_info/default` e gere novo QR

## 📝 Notas

- A sessão é salva em `auth_info/default/`
- Railway persiste arquivos entre deploys
- Se precisar resetar, delete a pasta `auth_info` e faça redeploy
=======
# WhatsApp Bot - Baileys + Railway

Bot WhatsApp usando Baileys para notificações da barbearia, deployado no Railway (100% gratuito).

## 🚀 Deploy no Railway

### Passo 1: Criar conta no Railway
1. Acesse https://railway.app
2. Faça login com GitHub
3. Clique em "New Project"
4. Selecione "Deploy from GitHub repo"

### Passo 2: Conectar repositório
1. Selecione seu repositório
2. Railway detectará automaticamente o `package.json`
3. Configure as variáveis de ambiente:
   - `API_KEY`: `testdaapi2026` (ou outra chave segura)
   - `PORT`: `3000` (Railway define automaticamente, mas pode definir)

### Passo 3: Deploy
1. Railway fará deploy automaticamente
2. Aguarde o build completar
3. Anote a URL gerada (ex: `https://whatsapp-bot-xxxx.up.railway.app`)

### Passo 4: Configurar Supabase
1. No Supabase, vá em Settings > Edge Functions > Secrets
2. Atualize `EVOLUTION_API_URL` para a URL do Railway
3. Mantenha `EVOLUTION_API_KEY` como está (ou atualize se mudou)

## 📋 Estrutura

```
whatsapp-bot-railway/
├── index.js          # Bot principal (Baileys + Express)
├── package.json      # Dependências
├── README.md         # Este arquivo
└── auth_info/        # Sessões WhatsApp (criado automaticamente)
    └── default/      # Sessão padrão
```

## 🔧 API Endpoints

Compatível com Evolution API (mesmos endpoints):

- `GET /health` - Status do bot
- `GET /instance/fetchInstances` - Listar instâncias
- `POST /instance/create` - Criar instância
- `GET /instance/connect/:instanceName` - Obter QR code
- `POST /message/sendText/:instanceName` - Enviar mensagem
- `DELETE /instance/logout/:instanceName` - Desconectar
- `DELETE /instance/delete/:instanceName` - Deletar instância

## 🔐 Autenticação

Todas as requisições requerem header:
```
apikey: testdaapi2026
```

## 📱 Primeira Conexão

1. Acesse: `GET /instance/connect/default`
2. Escaneie o QR code com WhatsApp
3. Aguarde conexão (status: `open`)

## ✅ Vantagens sobre Evolution API

- ✅ **100% Gratuito** (Railway free tier)
- ✅ **Mais Simples** (sem Docker, sem PostgreSQL)
- ✅ **Mais Leve** (Baileys não usa Puppeteer)
- ✅ **Deploy Rápido** (5 minutos)
- ✅ **Logs em Tempo Real** (Railway dashboard)
- ✅ **Compatível** (mesma API da Evolution)

## 🐛 Troubleshooting

### Bot não conecta
- Verifique se o QR code foi escaneado
- Aguarde alguns segundos após escanear
- Verifique logs no Railway

### Mensagens não enviam
- Verifique se `mainSocket.user` existe (bot conectado)
- Verifique formato do número (deve incluir código do país)
- Verifique logs para erros

### Sessão expira
- Baileys reconecta automaticamente
- Se não reconectar, delete `auth_info/default` e gere novo QR

## 📝 Notas

- A sessão é salva em `auth_info/default/`
- Railway persiste arquivos entre deploys
- Se precisar resetar, delete a pasta `auth_info` e faça redeploy
>>>>>>> 6d587b87b13971962a4acbafd785c2a7ec076ba8
