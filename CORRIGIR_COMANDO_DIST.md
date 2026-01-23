# 🔧 CORRIGIR: Caminho do arquivo dist/main

## ⚠️ PROBLEMA
O erro mostra: `sh: node dist/main: not found`

O arquivo não está em `dist/main`. Precisamos descobrir o caminho correto.

## ✅ SOLUÇÃO: Tentar diferentes caminhos

### No Render → Settings → Build & Deploy → Docker Command

**Tente estes comandos na ordem:**

1. **`node ./dist/src/main.js`** ← TENTE PRIMEIRO (mais provável)
2. **`node dist/main.js`** ← Se o primeiro não funcionar (com extensão .js)
3. **DEIXE VAZIO** ← Usa o comando padrão da imagem (mas vai executar migrations)

---

## 🚀 ALTERNATIVA: Deixar vazio e usar variável para pular migrations

Se nenhum caminho funcionar, tente:

1. **Docker Command:** DEIXE VAZIO
2. **Adicione variável:** `SKIP_DB_MIGRATION=true` (pode não funcionar, mas vale tentar)

---

## 🎯 SE NADA FUNCIONAR

A melhor solução é migrar para **FLY.IO** ou **Oracle Cloud** onde você tem controle total sobre o entrypoint.

Veja: `SOLUCAO_DEFINITIVA_MIGRATIONS.md`

---

**Tente `node ./dist/src/main.js` primeiro!** 🚀
