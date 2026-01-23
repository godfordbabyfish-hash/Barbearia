# Deploy Evolution API via Docker no Render

## Passo a Passo Detalhado

### 1. Deletar o Serviço Atual (se ainda existir)

1. No dashboard do Render: https://dashboard.render.com
2. Encontre o serviço `evolution-api-barbearia-jv58` (ou similar)
3. Clique no serviço → vá em **Settings** → role até o final
4. Clique em **Delete Service** e confirme

### 2. Criar Novo Web Service com Docker

1. No dashboard do Render, clique em **"New +"** → **"Web Service"**
2. Na seção **"Public Git repository"**, selecione **"Docker"**
3. Em **"Docker Image"**, digite: `atendai/evolution-api:latest`
4. Clique em **"Apply"**

### 3. Configurar o Serviço

Preencha os campos:

- **Name**: `evolution-api-barbearia` (ou nome de sua escolha)
- **Region**: Escolha a mais próxima (ex: `Oregon (US West)`)
- **Branch**: Deixe como está (não se aplica para Docker)
- **Root Directory**: Deixe vazio
- **Runtime**: `Docker` (já selecionado automaticamente)
- **Instance Type**: `Free` (ou `Starter` se quiser evitar sleep)
- **Start Command**: **DEIXE VAZIO** (a imagem Docker já tem o comando configurado)

### 4. Configurar Variáveis de Ambiente

Antes de fazer o deploy, configure as variáveis:

1. Role até a seção **"Environment Variables"**
2. Clique em **"Add Environment Variable"** e adicione **TODAS** estas variáveis:

```
AUTHENTICATION_API_KEY=testdaapi2026
CORS_ORIGIN=*
DATABASE_ENABLED=false
DATABASE_PROVIDER=postgresql
SKIP_DB_MIGRATION=true
REDIS_ENABLED=false
PORT=8080
```

**⚠️ VARIÁVEIS CRÍTICAS (adicione todas):**
- `AUTHENTICATION_API_KEY=testdaapi2026` → **CRÍTICO** - Chave de autenticação (use `AUTHENTICATION_API_KEY` em vez de `API_KEY`)
- `DATABASE_ENABLED=false` → **CRÍTICO** - Desabilita banco de dados completamente
- `DATABASE_PROVIDER=postgresql` → **NECESSÁRIO** - Devido a um bug, precisa ter um provider válido mesmo com DATABASE_ENABLED=false
- `SKIP_DB_MIGRATION=true` → **CRÍTICO** - Pula migrations do Prisma
- `REDIS_ENABLED=false` → **IMPORTANTE** - Desabilita Redis também
- `CORS_ORIGIN=*` → Permite requisições do seu frontend Netlify
- `PORT=8080` → Porta padrão

**⚠️ IMPORTANTE:** Adicione `DATABASE_PROVIDER=postgresql` mesmo com `DATABASE_ENABLED=false`. Isso é necessário devido a um bug conhecido na Evolution API que valida o provider antes de verificar se o banco está habilitado. O banco não será usado, mas a validação precisa passar.

### 5. Fazer o Deploy

1. Clique em **"Create Web Service"**
2. O Render vai:
   - Baixar a imagem Docker
   - Iniciar o container
   - Aguarde o status ficar **"Live"** (pode levar 2-5 minutos)

### 6. Verificar Deploy

1. Aguarde o status ficar **"Live"** (verde)
2. Anote a URL gerada (ex: `https://evolution-api-barbearia.onrender.com`)
3. Teste acessando: `https://sua-url.onrender.com/health` no navegador
   - Deve retornar um JSON com status

### 7. Testar com Script

Execute o script de teste:

```powershell
.\testar-evolution-render.ps1
```

- Digite a URL do Render
- Digite a API_KEY: `testdaapi2026`
- Verifique se ambos os testes passam

### 8. Atualizar no Supabase

Execute o script:

```powershell
.\atualizar-evolution-url.ps1
```

Ou manualmente:
1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions
2. Vá em **"Secrets"**
3. Encontre `EVOLUTION_API_URL`
4. Atualize com: `https://evolution-api-barbearia.onrender.com` (sua URL)
5. Salve

### 9. Testar no Sistema

1. Acesse seu site → Admin → WhatsApp → WhatsApp Manager
2. Tente criar uma nova instância
3. Verifique se o QR code aparece

## Troubleshooting

### Se o serviço não iniciar com erro "Database provider invalid"
**Solução definitiva:**
1. ✅ Confirme que `DATABASE_ENABLED=false` está configurado
2. ✅ **ADICIONE** `DATABASE_PROVIDER=postgresql` (necessário devido ao bug)
3. ✅ Adicione `SKIP_DB_MIGRATION=true`
4. ✅ Adicione `REDIS_ENABLED=false`
5. ✅ Use `AUTHENTICATION_API_KEY` em vez de `API_KEY`
6. ✅ Verifique se todas as 7 variáveis estão salvas corretamente
7. ✅ Se ainda falhar, delete o serviço e crie novamente do zero

### Se o serviço não iniciar (outros erros)
- Verifique os **Logs** no Render
- Confirme que todas as variáveis estão corretas
- Verifique se não há erros de porta

### Se der erro de CORS
- Confirme que `CORS_ORIGIN=*` está configurado
- Ou especifique: `CORS_ORIGIN=https://seu-site.netlify.app`

### Se o serviço ficar "Sleeping"
- Normal no plano free após 15 minutos sem tráfego
- A primeira requisição pode demorar ~30-60 segundos para "acordar"

## Próximos Passos

1. ✅ Testar criação de instância WhatsApp
2. ✅ Conectar número via QR code
3. ✅ Testar envio de mensagem
4. ✅ Verificar se notificações estão funcionando
