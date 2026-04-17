# ✅ SOLUÇÃO FINAL: Criar PostgreSQL no Fly.io

## ⚠️ PROBLEMA IDENTIFICADO

O Evolution API **NÃO funciona sem banco de dados**. Ele sempre tenta inicializar o Prisma, mesmo com `DATABASE_ENABLED=false`.

**Solução:** Criar um PostgreSQL no Fly.io (gratuito) e usar apenas para inicialização.

---

## 🚀 EXECUTAR AGORA

### Opção 1: Script Automático (Recomendado)

```powershell
.\criar-postgres-e-configurar.ps1
```

O script vai:
1. ✅ Criar PostgreSQL no Fly.io
2. ✅ Obter connection string
3. ✅ Configurar Evolution API
4. ✅ Fazer redeploy

---

### Opção 2: Manual

#### 1. Criar PostgreSQL:
```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"
fly postgres create --name evolution-db --region gru --vm-size shared-cpu-1x --volume-size 1
```

#### 2. Obter Connection String:
Acesse: https://dashboard.fly.io/apps/evolution-db
- Vá em "Connection" ou "Settings"
- Copie a connection string (formato: `postgresql://user:pass@host:port/db`)

#### 3. Configurar Evolution API:
```powershell
fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI="sua-connection-string" --app evolution-api-barbearia
```

#### 4. Redeploy:
```powershell
fly deploy --app evolution-api-barbearia
```

---

## ✅ APÓS CONFIGURAR

1. Aguarde 1-2 minutos
2. Teste: `https://evolution-api-barbearia.fly.dev/health`
3. Verifique logs: `fly logs --app evolution-api-barbearia`

---

## 💡 NOTA IMPORTANTE

O PostgreSQL será usado **apenas para inicialização**. O Evolution API não vai salvar dados importantes lá (já que `DATABASE_SAVE_*` não estão configurados).

**É gratuito no Fly.io!** 🎉

---

**Execute o script agora:** `.\criar-postgres-e-configurar.ps1` 🚀
