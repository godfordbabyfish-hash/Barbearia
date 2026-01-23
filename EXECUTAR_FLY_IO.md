# ⚡ EXECUTAR DEPLOY NO FLY.IO - RÁPIDO

## 🚀 OPÇÃO 1: Script Automático (RECOMENDADO)

Execute o script PowerShell que faz tudo automaticamente:

```powershell
.\criar-fly-config.ps1
```

O script vai:
1. ✅ Verificar/instalar Fly CLI
2. ✅ Autenticar no Fly.io
3. ✅ Criar o app
4. ✅ Configurar variáveis de ambiente
5. ✅ Fazer deploy

---

## 📝 OPÇÃO 2: Manual (Passo a Passo)

### 1. Instalar Fly CLI:
```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2. Autenticar:
```powershell
fly auth login
```

### 3. Criar app (sem deploy ainda):
```powershell
fly launch --no-deploy --name evolution-api-barbearia --region gru
```

### 4. Configurar variáveis:
```powershell
fly secrets set AUTHENTICATION_API_KEY=testdaapi2026 CORS_ORIGIN=* DATABASE_ENABLED=false DATABASE_PROVIDER=postgresql REDIS_ENABLED=false PORT=8080 --app evolution-api-barbearia
```

### 5. Fazer deploy:
```powershell
fly deploy --app evolution-api-barbearia
```

---

## ✅ APÓS DEPLOY

### Verificar status:
```powershell
fly status --app evolution-api-barbearia
```

### Ver logs:
```powershell
fly logs --app evolution-api-barbearia
```

### Testar API:
Acesse: `https://evolution-api-barbearia.fly.dev/health`

### Atualizar Supabase:
```powershell
npx supabase secrets set EVOLUTION_API_URL=https://evolution-api-barbearia.fly.dev
```

---

**Use o script automático! É mais rápido! 🚀**
