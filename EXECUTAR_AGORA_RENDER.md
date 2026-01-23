# ⚡ EXECUTAR AGORA - Configurar Render (Passo a Passo Rápido)

## 🎯 O QUE FAZER (5 minutos)

### ✅ PASSO 1: Modificar Docker Command

1. Acesse: https://dashboard.render.com
2. Clique no serviço **`evolution-api`**
3. Clique em **"Settings"** (no menu lateral esquerdo)
4. Role até a seção **"Build & Deploy"**
5. Encontre **"Docker Command"** (deve estar vazio ou com algum comando)
6. Clique em **"Edit"** ao lado de "Docker Command"
7. **Cole este comando:**
   ```
   npm start
   ```
8. Clique em **"Save"** ou **"Update"**

### ✅ PASSO 2: Verificar Pre-Deploy Command

1. Ainda na seção **"Build & Deploy"**
2. Encontre **"Pre-Deploy Command"**
3. **DEVE ESTAR VAZIO** ou apenas `npm install`
4. Se tiver `npm run db:deploy` ou qualquer coisa relacionada a migrations, **DELETE**
5. Deixe vazio ou coloque apenas: `npm install`
6. Salve

### ✅ PASSO 3: Verificar Environment Variables

1. Ainda em **"Settings"**
2. Clique em **"Environment"** (no menu lateral)
3. Verifique se tem estas **6 variáveis**:

   ```
   AUTHENTICATION_API_KEY=testdaapi2026
   CORS_ORIGIN=*
   DATABASE_ENABLED=false
   DATABASE_PROVIDER=postgresql
   REDIS_ENABLED=false
   PORT=8080
   ```

4. **DELETE** a variável `SKIP_DB_MIGRATION` se existir (não é oficial)

### ✅ PASSO 4: Salvar e Aguardar

1. O Render vai fazer **redeploy automaticamente**
2. Aguarde o status ficar **"Live"** (verde)
3. Pode levar 3-5 minutos

## 📋 CHECKLIST RÁPIDO

Antes de sair da página, confirme:

- [ ] **Docker Command** = `npm start`
- [ ] **Pre-Deploy Command** = vazio ou `npm install`
- [ ] **Environment Variables** = 6 variáveis (sem `SKIP_DB_MIGRATION`)
- [ ] Status mudou para "Updating" ou "Deploying"

## 🚨 SE DER ERRO

Se ainda tentar executar migrations, tente estes Docker Commands na ordem:

1. `npm start` ← **TENTE PRIMEIRO**
2. `node dist/server.js` ← Se o primeiro não funcionar
3. `npm run build && npm start` ← Se os dois anteriores não funcionarem

## 🎉 APÓS FICAR "Live"

Quando o status ficar **"Live"** (verde):

1. **Teste no navegador:**
   ```
   https://evolution-api-bfri.onrender.com/health
   ```
   Deve retornar JSON com status.

2. **Execute o script de teste:**
   ```powershell
   .\testar-evolution-render.ps1
   ```

3. **Atualize no Supabase:**
   ```powershell
   .\atualizar-evolution-url.ps1
   ```

## ⏱️ TEMPO ESTIMADO

- **Configuração:** 2-3 minutos
- **Deploy:** 3-5 minutos
- **Total:** ~5-8 minutos

---

**Me avise quando terminar ou se tiver alguma dúvida!** 🚀
