# Configurar Evolution API no Render (Correto)

## ⚠️ Problema Identificado
O Render está tentando rodar o repositório da **Barbearia** (frontend), mas precisamos da **Evolution API** (backend).

## Solução: Usar Template da Evolution API

### Passo 1: Deletar o serviço atual no Render
1. No dashboard do Render, vá no serviço `evolution-api-barbearia-jv58`
2. Clique em **Settings** → role até o final → **Delete Service**
3. Confirme a exclusão

### Passo 2: Criar novo serviço usando template da Evolution API

**Opção A: Deploy direto do repositório oficial (Recomendado)**

1. No Render, clique em **"New +"** → **"Web Service"**
2. Em vez de conectar seu GitHub, use o template:
   - Procure por: **"Evolution API"** ou
   - Use o repositório: `https://github.com/EvolutionAPI/evolution-api`
3. Configure:
   - **Name**: `evolution-api-barbearia`
   - **Region**: Escolha a mais próxima
   - **Branch**: `main` (ou `v2` se disponível)
   - **Root Directory**: Deixe vazio
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (ou verifique o package.json da Evolution API)

**Opção B: Fork do repositório Evolution API**

1. No GitHub, faça um fork do repositório: https://github.com/EvolutionAPI/evolution-api
2. No Render, conecte esse fork
3. Configure as mesmas opções acima

### Passo 3: Configurar Variáveis de Ambiente

No painel do serviço, vá em **"Environment"** e adicione:

```
API_KEY=testdaapi2026
CORS_ORIGIN=*
DATABASE_ENABLED=false
PORT=8080
```

**Importante:**
- `DATABASE_ENABLED=false` → Evita erros de Prisma/migrations
- `CORS_ORIGIN=*` → Permite requisições do seu frontend
- `API_KEY` → Use a mesma que você já configurou

### Passo 4: Verificar Start Command

Algumas versões da Evolution API usam comandos diferentes. Verifique no `package.json` do repositório:
- Pode ser: `npm start`
- Pode ser: `npm run start:prod`
- Pode ser: `node dist/index.js`

Se o deploy falhar, ajuste o **Start Command** nas configurações do Render.

### Passo 5: Aguardar Deploy

- Aguarde o status ficar **"Live"**
- Anote a URL gerada (ex: `https://evolution-api-barbearia.onrender.com`)

## Alternativa: Usar Docker Image da Evolution API

Se o deploy direto não funcionar, você pode usar a imagem Docker:

1. No Render, crie um **"Web Service"**
2. Em **"Docker"**, selecione **"Use an existing image"**
3. Use a imagem: `atendai/evolution-api:latest`
4. Configure as mesmas variáveis de ambiente
5. Deixe o **Start Command** vazio (Docker já tem o comando)

## Próximos Passos Após Deploy Bem-Sucedido

1. ✅ Testar a URL: `https://sua-url.onrender.com/health`
2. ✅ Executar: `.\testar-evolution-render.ps1`
3. ✅ Atualizar `EVOLUTION_API_URL` no Supabase
4. ✅ Testar criação de instância no painel Admin
