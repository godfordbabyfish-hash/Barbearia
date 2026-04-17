# 🔧 CORRIGIR DOCKER COMMAND - Pular Migrations

## ⚠️ PROBLEMA
O serviço está usando o repositório GitHub e o Dockerfile está executando migrations automaticamente. Precisamos sobrescrever o comando Docker para pular as migrations.

## ✅ SOLUÇÃO: Modificar Docker Command

### Passo 1: Acessar Settings
1. No Render, vá no serviço `evolution-api`
2. Clique em **Settings**
3. Role até a seção **"Build & Deploy"**
4. Encontre **"Docker Command"**

### Passo 2: Adicionar Docker Command

**Clique em "Edit" ao lado de "Docker Command"**

**Adicione este comando:**

```bash
npm start
```

**OU, se não funcionar, tente:**

```bash
node dist/server.js
```

**OU, para garantir que o build foi feito:**

```bash
npm run build && npm start
```

### Passo 3: Verificar Pre-Deploy Command

No campo **"Pre-Deploy Command"**, certifique-se de que está **VAZIO** ou apenas:

```bash
npm install
```

**NÃO inclua** `npm run db:deploy` ou qualquer comando de migration aqui.

### Passo 4: Remover SKIP_DB_MIGRATION

Como `SKIP_DB_MIGRATION` não é uma variável oficial:

1. Vá em **Environment Variables** (na seção "Environment")
2. Delete `SKIP_DB_MIGRATION` (se existir)

### Passo 5: Salvar e Redeploy

1. Clique em **"Save Changes"** (se houver)
2. O Render vai fazer redeploy automaticamente
3. Aguarde o status ficar **"Live"**

## 🎯 Comandos Alternativos (se o primeiro não funcionar)

Tente estes Docker Commands na ordem:

1. **Primeira tentativa:**
   ```bash
   npm start
   ```

2. **Segunda tentativa:**
   ```bash
   node dist/server.js
   ```

3. **Terceira tentativa:**
   ```bash
   npm run build && npm start
   ```

4. **Quarta tentativa:**
   ```bash
   npm run start:prod
   ```

## 📝 Variáveis Finais (6 no total)

Mantenha estas variáveis em **Environment Variables**:

- ✅ `AUTHENTICATION_API_KEY=testdaapi2026`
- ✅ `CORS_ORIGIN=*`
- ✅ `DATABASE_ENABLED=false`
- ✅ `DATABASE_PROVIDER=postgresql`
- ✅ `REDIS_ENABLED=false`
- ✅ `PORT=8080`
- ❌ **Remova** `SKIP_DB_MIGRATION` (não é oficial)

## 🔍 Onde encontrar no Render

1. **Settings** → **Build & Deploy** → **Docker Command** ← AQUI
2. **Settings** → **Build & Deploy** → **Pre-Deploy Command** ← Verificar se está vazio
3. **Settings** → **Environment** → **Environment Variables** ← Verificar variáveis

## 🚀 Após o Deploy

Quando o status ficar **"Live"**:
1. Teste: `https://sua-url.onrender.com/health`
2. Execute: `.\testar-evolution-render.ps1`
3. Atualize no Supabase: `.\atualizar-evolution-url.ps1`
