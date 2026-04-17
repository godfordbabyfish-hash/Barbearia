# ⚡ FAZER AGORA - CRIAR POSTGRESQL GRATUITO

## 🎯 PASSO A PASSO NO DASHBOARD

O CLI precisa de interação, então vamos fazer via Dashboard (2 minutos):

---

### PASSO 1: Acessar Dashboard

**Clique aqui:** https://dashboard.fly.io

---

### PASSO 2: Criar PostgreSQL

1. **Clique no botão:** "New" (canto superior direito)
2. **Selecione:** "Postgres"
3. **IMPORTANTE:** Na tela que abrir, você verá 2 opções:
   - ❌ **"Managed Postgres"** (pago - $38/mês) - **NÃO ESCOLHA ESTE!**
   - ✅ **"Unmanaged Postgres"** (gratuito) - **ESCOLHA ESTE!**
4. **Configure:**
   - **App Name:** `evolution-db-free`
   - **Region:** `gru` (São Paulo - Brazil)
   - **VM Size:** `shared-cpu-1x`
   - **Volume Size:** `1 GB`
5. **Clique em:** "Create" ou "Deploy"
6. **Aguarde 2-3 minutos** para criar

---

### PASSO 3: Obter Connection String

**Após criar (quando aparecer "Deployed" ou status verde):**

1. **Clique no app:** `evolution-db-free`
2. **Vá em:** "Connection" (menu lateral) ou "Settings" → "Connection"
3. **Copie a connection string** completa

**Formato esperado:**
```
postgresql://postgres:senha@evolution-db-free.fly.dev:5432/evolution_db_free
```

---

### PASSO 4: Configurar (Execute quando tiver a string)

**Cole a connection string e execute:**

```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"
fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="COLE_A_STRING_AQUI" --app evolution-api-barbearia
fly deploy --app evolution-api-barbearia
```

---

## ✅ PRONTO!

**Siga os 4 passos acima e me avise quando tiver a connection string!** 🚀

---

**Dica:** Se não encontrar "Unmanaged Postgres", procure por "Create Postgres" e certifique-se de que não está escolhendo o plano pago.
