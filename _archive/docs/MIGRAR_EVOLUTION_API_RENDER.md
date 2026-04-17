# Migração da Evolution API para Render

## Objetivo
Migrar a Evolution API do Railway para o Render (free tier) para resolver problemas de banco de dados e garantir funcionamento estável.

## Passo a Passo

### 1. Criar Conta no Render (se não tiver)
- Acesse: https://render.com
- Faça login ou crie uma conta (pode usar GitHub)

### 2. Criar Novo Web Service no Render

1. No dashboard do Render, clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório GitHub (ou use o template da Evolution API)
3. Configure:
   - **Name**: `evolution-api-barbearia` (ou nome de sua escolha)
   - **Region**: Escolha a mais próxima (ex: `Oregon (US West)`)
   - **Branch**: `main` (ou a branch que tem o código)
   - **Root Directory**: Deixe vazio (ou `/` se necessário)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (ou o comando que a Evolution API usa)

### 3. Configurar Variáveis de Ambiente

No painel do serviço criado, vá em **"Environment"** e adicione:

```
API_KEY=testdaapi2026
CORS_ORIGIN=*
DATABASE_ENABLED=false
PORT=8080
```

**Importante:**
- `DATABASE_ENABLED=false` → Desabilita banco de dados e migrations (evita o erro do Prisma)
- `CORS_ORIGIN=*` → Permite requisições de qualquer origem (ou especifique seu domínio Netlify)
- `API_KEY` → Use a mesma key que você já estava usando

### 4. Aguardar Deploy Inicial

- O Render vai fazer o build e deploy automaticamente
- Aguarde o status ficar **"Live"** (pode levar 2-5 minutos)
- Anote a URL gerada (ex: `https://evolution-api-barbearia.onrender.com`)

### 5. Atualizar Variáveis no Supabase

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Vá em **Project Settings** → **Edge Functions** → **Secrets**
3. Atualize a variável:
   - `EVOLUTION_API_URL` = `https://evolution-api-barbearia.onrender.com` (sua URL do Render)

### 6. Testar Conexão

1. Acesse o painel Admin do seu sistema
2. Vá em **WhatsApp** → **WhatsApp Manager**
3. Tente criar uma nova instância
4. Verifique se o QR code aparece

## Troubleshooting

### Se o serviço ficar "Sleeping" (dormindo)
- O Render free tier "dorme" após 15 minutos sem tráfego
- A primeira requisição pode demorar ~30-60 segundos para "acordar"
- Isso é normal no plano free

### Se der erro de CORS
- Verifique se `CORS_ORIGIN=*` está configurado
- Ou especifique seu domínio: `CORS_ORIGIN=https://seu-site.netlify.app`

### Se não conseguir criar instância
- Verifique os logs do Render (aba "Logs")
- Confirme que `DATABASE_ENABLED=false` está configurado
- Teste a URL diretamente: `https://sua-url.onrender.com/health`

## Próximos Passos Após Migração

1. ✅ Testar criação de instância WhatsApp
2. ✅ Conectar número via QR code
3. ✅ Testar envio de mensagem
4. ✅ Verificar se notificações estão funcionando
