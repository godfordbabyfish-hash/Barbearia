# 🔍 Verificar Estrutura do Build

## ⚠️ PROBLEMA
O erro mostra: `Cannot find module '/evolution/dist/server.js'`

Mas os logs mostram que arquivos `.mjs.map` foram gerados, sugerindo que o build usa ESM (`.mjs`), não CommonJS (`.js`).

## ✅ SOLUÇÃO: Verificar qual arquivo foi gerado

### Opção 1: Verificar logs do build
Nos logs, procure por:
- Arquivos em `dist/` que foram copiados
- Qual é o arquivo principal gerado

### Opção 2: Tentar comandos alternativos

Baseado nos logs que mostram `.mjs.map`, tente estes Docker Commands:

1. **`node dist/main.mjs`** ← TENTE PRIMEIRO (ESM)
2. **`node dist/index.mjs`** ← Se o primeiro não funcionar
3. **`node dist/server.mjs`** ← Se os anteriores não funcionarem
4. **`npm run start:prod`** ← Usa o script do package.json

### Opção 3: Verificar package.json do repositório
1. Acesse: https://github.com/EvolutionAPI/evolution-api/blob/main/package.json
2. Procure pelo script `start:prod`
3. Veja qual comando ele executa

---

## 🎯 RECOMENDAÇÃO IMEDIATA

**Tente estes Docker Commands na ordem:**

1. `node dist/main.mjs` ← **PRIMEIRO** (mais provável)
2. `node dist/index.mjs`
3. `npm run start:prod`
4. `node --loader tsx dist/main.mjs` (se for TypeScript)

---

**Me avise qual comando funcionou!** 🚀
