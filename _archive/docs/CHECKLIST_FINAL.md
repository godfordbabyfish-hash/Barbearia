# ✅ CHECKLIST FINAL - O QUE FALTA PARA FUNCIONAR

## 📋 STATUS ATUAL

✅ **Arquivos criados:**
- ✅ `fly.toml` - Configuração do Fly.io
- ✅ `Dockerfile` - Wrapper para pular migrations
- ✅ `criar-fly-config.ps1` - Script automático
- ✅ Guias de documentação

❌ **Ainda não executado:**
- ❌ Deploy no Fly.io
- ❌ Atualizar URL no Supabase
- ❌ Testar conexão WhatsApp

---

## 🚀 PASSO 1: EXECUTAR DEPLOY NO FLY.IO

### Opção Rápida (Recomendado):
```powershell
.\criar-fly-config.ps1
```

O script vai:
1. Instalar Fly CLI (se necessário)
2. Autenticar no Fly.io
3. Criar o app
4. Configurar variáveis de ambiente
5. Fazer deploy

**Tempo estimado:** 5-10 minutos

---

## 🔐 PASSO 2: ATUALIZAR URL NO SUPABASE

Após o deploy, você terá uma URL como: `https://evolution-api-barbearia.fly.dev`

Execute:
```powershell
npx supabase secrets set EVOLUTION_API_URL=https://evolution-api-barbearia.fly.dev
```

**Substitua** `evolution-api-barbearia` pelo nome real do seu app.

---

## ✅ PASSO 3: VERIFICAR SE ESTÁ FUNCIONANDO

### 3.1. Testar Health Check:
```powershell
# No navegador ou PowerShell:
Invoke-WebRequest -Uri "https://evolution-api-barbearia.fly.dev/health"
```

Deve retornar status 200.

### 3.2. Verificar logs do Fly.io:
```powershell
fly logs --app evolution-api-barbearia
```

Verifique se:
- ✅ Não há erros de migrations
- ✅ App está rodando na porta 8080
- ✅ Não há erros de conexão

### 3.3. Testar criação de instância WhatsApp:
Acesse o painel admin e tente criar uma instância WhatsApp via `whatsapp-manager`.

---

## 🎯 RESUMO: 3 PASSOS SIMPLES

1. **Execute:** `.\criar-fly-config.ps1`
2. **Aguarde** o deploy finalizar (5-10 min)
3. **Atualize** Supabase com a nova URL

**Pronto!** 🎉

---

## 🐛 SE ALGO DER ERRADO

### Erro no deploy:
```powershell
fly logs --app evolution-api-barbearia
```

### App não inicia:
- Verifique se as variáveis de ambiente estão corretas
- Verifique os logs para ver qual caminho do `dist/` está sendo usado
- Pode precisar ajustar o `Dockerfile` CMD

### Migrations ainda executam:
- O Dockerfile já sobrescreve ENTRYPOINT, então não deveria executar
- Se executar, verifique os logs e me avise

---

**Execute o script agora e me avise quando finalizar!** 🚀
