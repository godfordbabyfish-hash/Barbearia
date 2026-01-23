# 🎯 SOLUÇÃO DEFINITIVA - Evolution API no Render

## 📋 PLANO DE AÇÃO HIERÁRQUICO

Se `node dist/server.js` não funcionar, siga esta ordem:

---

## ✅ OPÇÃO 1: Verificar estrutura do build (SE `dist/server.js` não existir)

### Passo 1: Verificar logs do build
1. No Render, vá em **Logs**
2. Procure por mensagens como:
   - `"Build success"`
   - `"dist/"`
   - `"Compiled"`
   - Qualquer referência a arquivos gerados

### Passo 2: Tentar comandos alternativos (na ordem)

**Tente estes Docker Commands um por um:**

1. `node dist/main.js`
2. `node dist/index.js`
3. `npm run start:prod`
4. `npm run build && node dist/server.js`
5. `npm run build && npm run start:prod`

---

## ✅ OPÇÃO 2: Usar imagem Docker oficial (RECOMENDADO SE OPÇÃO 1 FALHAR)

Esta é a solução mais confiável e testada.

### Passo 1: Deletar serviço atual
1. Render → Settings → Delete Web Service
2. Confirme a exclusão

### Passo 2: Criar novo serviço com Docker Image
1. Render → New + → Web Service
2. Selecione **"Docker"** (não "Public Git repository")
3. Em **"Docker Image"**, digite: `atendai/evolution-api:latest`
4. Clique em **"Apply"**

### Passo 3: Configurar serviço
- **Name**: `evolution-api`
- **Region**: Escolha a mais próxima
- **Instance Type**: `Free`
- **Docker Command**: **DEIXE VAZIO** (a imagem já tem o comando)

### Passo 4: Configurar variáveis de ambiente
Adicione estas 6 variáveis:

```
AUTHENTICATION_API_KEY=testdaapi2026
CORS_ORIGIN=*
DATABASE_ENABLED=false
DATABASE_PROVIDER=postgresql
REDIS_ENABLED=false
PORT=8080
```

### Passo 5: Criar e aguardar
1. Clique em **"Create Web Service"**
2. Aguarde status ficar **"Live"** (3-5 minutos)

**✅ VANTAGEM:** A imagem Docker oficial já tem tudo configurado e testado!

---

## ✅ OPÇÃO 3: Verificar Dockerfile do repositório (SE OPÇÃO 2 NÃO FOR POSSÍVEL)

### Passo 1: Verificar Dockerfile
1. Acesse: https://github.com/EvolutionAPI/evolution-api
2. Procure pelo arquivo `Dockerfile` na raiz
3. Verifique:
   - Qual é o `CMD` ou `ENTRYPOINT`?
   - Qual comando ele usa para iniciar?

### Passo 2: Usar o comando do Dockerfile
Use exatamente o comando que o Dockerfile especifica.

---

## ✅ OPÇÃO 4: Usar Build Command + Start Command (SE NADA FUNCIONAR)

### Passo 1: Configurar Build Command
No Render → Settings → Build & Deploy → Build Command:

```bash
npm install && npm run build
```

### Passo 2: Configurar Docker Command
No Render → Settings → Build & Deploy → Docker Command:

```bash
node dist/server.js
```

OU, se não funcionar:

```bash
npm run start:prod
```

---

## ✅ OPÇÃO 5: Usar Evolution API Lite (ÚLTIMA OPÇÃO)

Se todas as opções acima falharem, use a versão "lite" que é mais simples:

1. Render → New + → Web Service
2. Conecte: `https://github.com/EvolutionAPI/evolution-api-lite`
3. Configure as mesmas variáveis de ambiente
4. Use o comando padrão do repositório

---

## 🎯 RECOMENDAÇÃO FINAL

**SE `node dist/server.js` NÃO FUNCIONAR:**

1. ✅ **PRIMEIRO**: Tente OPÇÃO 2 (Docker Image oficial) - É a mais confiável
2. ✅ **SEGUNDO**: Verifique logs do build (OPÇÃO 1) para ver qual arquivo foi gerado
3. ✅ **TERCEIRO**: Use OPÇÃO 4 (Build Command + Start Command)

---

## 📝 CHECKLIST DE TROUBLESHOOTING

Antes de tentar outra opção, verifique:

- [ ] Logs do build mostram algum erro?
- [ ] O build foi concluído com sucesso?
- [ ] Qual arquivo foi gerado em `dist/`?
- [ ] As variáveis de ambiente estão corretas?
- [ ] O Pre-Deploy Command está vazio?

---

## 🚀 APÓS QUALQUER SOLUÇÃO FUNCIONAR

1. Teste: `https://evolution-api-bfri.onrender.com/health`
2. Execute: `.\testar-evolution-render.ps1`
3. Atualize no Supabase: `.\atualizar-evolution-url.ps1`
4. Teste criação de instância WhatsApp

---

**Me avise qual opção você quer tentar primeiro!** 🎯
