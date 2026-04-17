# 🔧 SOLUÇÃO: ERRO 502 - Evolution API não está respondendo

## 🎯 PROBLEMA

O erro `HTTP 502: Bad Gateway` indica que a Evolution API não está respondendo ou ainda está inicializando.

---

## ✅ SOLUÇÕES

### 1. Aguardar Inicialização (RECOMENDADO)

A Evolution API pode levar **3-5 minutos** para inicializar completamente após o deploy.

**Aguarde alguns minutos e recarregue a página do painel admin.**

---

### 2. Verificar se a API está funcionando

**Teste no PowerShell:**
```powershell
Invoke-WebRequest -Uri "https://evolution-api-barbearia.fly.dev" -TimeoutSec 15
```

**✅ Se responder:** API está funcionando, recarregue a página do painel.

**❌ Se não responder:** Continue com as soluções abaixo.

---

### 3. Verificar Logs do Fly.io

**Execute:**
```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"
fly logs --app evolution-api-barbearia
```

**Procure por:**
- ✅ `Server listening on port 8080` = API funcionando
- ❌ `PrismaClientInitializationError` = Problema com database
- ❌ `Can't reach database server` = Connection string incorreta

---

### 4. Reiniciar a API

**Se a API não inicializar após 5 minutos:**

```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"
fly machines restart --app evolution-api-barbearia
```

**Aguarde 2-3 minutos e teste novamente.**

---

### 5. Verificar Variáveis no Supabase

**Certifique-se de que as variáveis estão configuradas:**

1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets
2. Verifique se existem:
   - `EVOLUTION_API_URL=https://evolution-api-barbearia.fly.dev`
   - `EVOLUTION_API_KEY=testdaapi2026`
   - `EVOLUTION_INSTANCE_NAME=evolution-4`

**Se não existirem, configure manualmente.**

---

## 🔍 DIAGNÓSTICO

### O que foi melhorado:

1. ✅ **Timeout aumentado:** 15 segundos para requisições
2. ✅ **Mensagens de erro mais claras:** Agora mostra se é timeout ou conexão recusada
3. ✅ **Detecção de 502:** Mensagem específica quando API não está respondendo

---

## ⏳ TEMPO ESPERADO

- **Inicialização normal:** 2-5 minutos
- **Primeira inicialização:** 3-7 minutos (migrations do Prisma)
- **Após reiniciar:** 1-3 minutos

---

## 🚨 SE NADA FUNCIONAR

1. **Verifique o status no Fly.io:**
   ```powershell
   fly status --app evolution-api-barbearia
   ```

2. **Verifique se há máquinas rodando:**
   ```powershell
   fly machines list --app evolution-api-barbearia
   ```

3. **Se não houver máquinas, faça deploy novamente:**
   ```powershell
   fly deploy --app evolution-api-barbearia
   ```

---

**Status:** 🔧 **TRATAMENTO DE ERRO MELHORADO**
