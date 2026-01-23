# ⚡ EXECUTAR AGORA - 3 PASSOS

## ✅ TUDO ESTÁ PRONTO! SÓ FALTA EXECUTAR:

---

## 🚀 PASSO 1: DEPLOY NO FLY.IO

Execute no PowerShell:
```powershell
.\criar-fly-config.ps1
```

**O que vai acontecer:**
1. Instala Fly CLI (se necessário)
2. Abre navegador para login no Fly.io
3. Cria o app
4. Configura variáveis
5. Faz deploy (5-10 minutos)

**Aguarde finalizar!** ⏳

---

## 🔐 PASSO 2: ATUALIZAR SUPABASE

Após o deploy, você verá uma URL como:
`https://evolution-api-barbearia.fly.dev`

Execute:
```powershell
npx supabase secrets set EVOLUTION_API_URL=https://evolution-api-barbearia.fly.dev
```

**Substitua** `evolution-api-barbearia` pelo nome real do seu app.

---

## ✅ PASSO 3: TESTAR

### Teste rápido:
```powershell
Invoke-WebRequest -Uri "https://evolution-api-barbearia.fly.dev/health"
```

### Ver logs:
```powershell
fly logs --app evolution-api-barbearia
```

---

## 🎉 PRONTO!

Agora você pode:
- ✅ Criar instância WhatsApp via painel admin
- ✅ Receber notificações automáticas
- ✅ Tudo funcionando sem migrations! 🚀

---

**Execute o PASSO 1 agora!** ⬆️
