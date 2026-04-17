# 🔧 CORRIGIR START COMMAND - Pular Migrations

## ⚠️ PROBLEMA
O erro mudou! Agora está tentando executar migrations mesmo com `DATABASE_ENABLED=false`. O script `runWithProvider.js` sempre executa migrations, independente das variáveis.

## ✅ SOLUÇÃO: Modificar Start Command

### Passo 1: Acessar Settings
1. No Render, vá no serviço `evolution-api`
2. Clique em **Settings**
3. Role até **"Start Command"**

### Passo 2: Modificar Start Command

**Substitua o comando atual por:**

```bash
npm start
```

**OU, se ainda tentar executar migrations, use:**

```bash
npm run start:prod
```

**OU, para forçar sem migrations:**

```bash
node dist/server.js
```

### Passo 3: Remover SKIP_DB_MIGRATION

Como `SKIP_DB_MIGRATION` não é uma variável oficial, você pode removê-la:

1. Vá em **Environment Variables**
2. Delete `SKIP_DB_MIGRATION` (se existir)

### Passo 4: Verificar Build Command

No **Settings** → **Build Command**, certifique-se de que está:

```bash
npm install
```

**NÃO inclua** `npm run db:deploy` no Build Command.

### Passo 5: Salvar e Redeploy

1. Clique em **"Save Changes"**
2. O Render vai fazer redeploy automaticamente
3. Aguarde o status ficar **"Live"**

## 🎯 Comandos Alternativos (se o primeiro não funcionar)

Tente estes Start Commands na ordem:

1. **Primeira tentativa:**
   ```bash
   npm start
   ```

2. **Segunda tentativa:**
   ```bash
   npm run start:prod
   ```

3. **Terceira tentativa:**
   ```bash
   node dist/server.js
   ```

4. **Quarta tentativa (forçar sem migrations):**
   ```bash
   npm run build && node dist/server.js
   ```

## 📝 Variáveis Finais (6 no total)

Mantenha estas variáveis:

- ✅ `AUTHENTICATION_API_KEY=testdaapi2026`
- ✅ `CORS_ORIGIN=*`
- ✅ `DATABASE_ENABLED=false`
- ✅ `DATABASE_PROVIDER=postgresql`
- ✅ `REDIS_ENABLED=false`
- ✅ `PORT=8080`
- ❌ **Remova** `SKIP_DB_MIGRATION` (não é oficial)

## 🚀 Após o Deploy

Quando o status ficar **"Live"**:
1. Teste: `https://sua-url.onrender.com/health`
2. Execute: `.\testar-evolution-render.ps1`
3. Atualize no Supabase: `.\atualizar-evolution-url.ps1`
