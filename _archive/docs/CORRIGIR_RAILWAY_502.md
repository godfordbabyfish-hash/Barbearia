# 🔧 Corrigir Railway 502 Bad Gateway

## ⚠️ Problema

O Railway está retornando **502 Bad Gateway**, o que significa que o bot não está respondendo ou está crashando.

---

## 🔍 Diagnóstico: Verificar Logs do Railway

### PASSO 1: Acessar Logs do Railway

1. **Acesse:** https://railway.app/dashboard
2. **Selecione o projeto:** `whatsapp-bot-barbearia`
3. **Clique em:** "Deployments" ou "Logs"
4. **Verifique os últimos logs** para ver o erro

---

## 🚨 Possíveis Causas e Soluções

### Causa 1: Bot não está iniciando

**Sintoma:** Logs mostram erro ao iniciar ou crash imediato

**Solução:**
- Verifique se o `package.json` está correto
- Verifique se todas as dependências estão instaladas
- Verifique se o comando de start está correto: `node index.js`

---

### Causa 2: Porta incorreta

**Sintoma:** Bot inicia mas Railway não consegue conectar

**Solução:**
- Railway usa a variável `PORT` automaticamente
- O código já está configurado: `const PORT = process.env.PORT || 3000;`
- Verifique se o Railway está usando a porta correta

---

### Causa 3: Erro no código

**Sintoma:** Bot crasha após iniciar

**Solução:**
- Verifique os logs para ver o erro específico
- Pode ser problema com dependências ou código

---

### Causa 4: Dependências não instaladas

**Sintoma:** Erro `Cannot find module` nos logs

**Solução:**
- Railway deve instalar automaticamente via `npm install`
- Verifique se o `package.json` está no repositório GitHub

---

## ✅ Solução Rápida: Re-deploy

### Opção 1: Trigger Manual no Railway

1. **Acesse:** https://railway.app/dashboard
2. **Selecione:** `whatsapp-bot-barbearia`
3. **Clique em:** "Deploy" ou "Redeploy"
4. **Aguarde** o deploy completar (2-3 minutos)

---

### Opção 2: Fazer Push no GitHub

Se o Railway está conectado ao GitHub:

1. **Faça um pequeno commit** (adicione um espaço em branco)
2. **Push para o GitHub**
3. **Railway vai fazer deploy automaticamente**

---

## 🔍 Verificar Configurações do Railway

### 1. Verificar Variáveis de Ambiente

No Railway Dashboard:
- **API_KEY:** `testdaapi2026` (deve estar configurado)
- **PORT:** Não precisa configurar (Railway define automaticamente)

---

### 2. Verificar Comando de Start

No Railway Dashboard → Settings → Deploy:
- **Start Command:** Deve estar vazio (Railway usa `npm start` automaticamente)
- **OU:** `node index.js`

---

### 3. Verificar Build Command

- **Build Command:** Deve estar vazio (não precisa build)
- **OU:** `npm install` (mas Railway faz isso automaticamente)

---

## 🧪 Testar Após Corrigir

### 1. Verificar Health Endpoint

Aguarde 2-3 minutos após o deploy e teste:
```
https://whatsapp-bot-barbearia-production.up.railway.app/health
```

**Deve retornar:** `{"status":"ok","connected":false}`

---

### 2. Verificar Instâncias

```
https://whatsapp-bot-barbearia-production.up.railway.app/instance/fetchInstances
```

**Headers:** `apikey: testdaapi2026`

**Deve retornar:** `[]` (array vazio se não houver instâncias)

---

## 🚨 Se Continuar com 502

### Verificação Final

1. **Verifique se o repositório GitHub está conectado:**
   - Railway → Settings → Source
   - Deve mostrar o repositório correto

2. **Verifique se o código está no GitHub:**
   - Acesse: https://github.com/godfordbabyfish-hash/whatsapp-bot-barbearia
   - Verifique se `index.js` e `package.json` estão lá

3. **Verifique os logs em tempo real:**
   - Railway → Logs
   - Deve mostrar o que está acontecendo

---

## 📋 Checklist

- [ ] Logs do Railway verificados
- [ ] Erro específico identificado
- [ ] Variáveis de ambiente configuradas (`API_KEY`)
- [ ] Código está no GitHub
- [ ] Re-deploy feito
- [ ] Aguardado 2-3 minutos
- [ ] Testado `/health` endpoint

---

**Verifique os logs do Railway primeiro e me diga qual erro aparece! 🔍**
