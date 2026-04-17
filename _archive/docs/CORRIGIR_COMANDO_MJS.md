# 🔧 CORRIGIR: Arquivo .mjs não .js

## ⚠️ PROBLEMA IDENTIFICADO
O erro mostra: `Cannot find module '/evolution/dist/server.js'`

**Mas os logs mostram que arquivos `.mjs.map` foram gerados!**

Isso significa que o build gera arquivos **ESM (`.mjs`)**, não CommonJS (`.js`).

## ✅ SOLUÇÃO IMEDIATA

### No Render → Settings → Build & Deploy → Docker Command

**Tente estes comandos na ordem:**

1. **`node dist/main.mjs`** ← **TENTE PRIMEIRO** (mais provável)
2. **`npm run start:prod`** ← Se o primeiro não funcionar (usa script do package.json)
3. **`node dist/index.mjs`** ← Se os anteriores não funcionarem

---

## 🚀 ATUALIZAR AGORA

1. Acesse: https://dashboard.render.com
2. Vá em Settings → Build & Deploy → Docker Command
3. Altere de `node dist/server.js` para: **`node dist/main.mjs`**
4. Salve e aguarde o redeploy

---

## 📝 SE NÃO FUNCIONAR

Se `node dist/main.mjs` não funcionar, tente:

1. **`npm run start:prod`** - Usa o script do package.json (mais seguro)
2. Verifique os logs do build para ver qual arquivo foi realmente gerado

---

**Me avise se funcionou!** 🎯
