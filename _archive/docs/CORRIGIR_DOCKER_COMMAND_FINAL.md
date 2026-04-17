# 🔧 CORRIGIR DOCKER COMMAND - Comando Correto

## ⚠️ PROBLEMA
O `npm start` está tentando executar código TypeScript não compilado (`tsx ./src/main.ts`), mas o arquivo não existe no caminho esperado.

## ✅ SOLUÇÃO: Usar código compilado

O comando correto é usar o código já compilado em `dist/`:

### Opção 1: node dist/server.js (RECOMENDADO)
```bash
node dist/server.js
```

### Opção 2: npm run start:prod
```bash
npm run start:prod
```

### Opção 3: Se não funcionar, verificar estrutura
O Dockerfile da Evolution API pode ter uma estrutura diferente. Verifique os logs do build para ver qual arquivo foi gerado.

## 🚀 ATUALIZAR VIA API

Execute o script atualizado:

```powershell
.\configurar-render-rapido.ps1
```

O script agora usa: `node dist/server.js`

## 📝 ATUALIZAR MANUALMENTE

1. Acesse: https://dashboard.render.com
2. Vá em Settings → Build & Deploy → Docker Command
3. Altere de `npm start` para: `node dist/server.js`
4. Salve e aguarde o redeploy

## 🎯 COMANDOS ALTERNATIVOS (se não funcionar)

Tente estes na ordem:

1. `node dist/server.js` ← **TENTE PRIMEIRO**
2. `npm run start:prod`
3. `node dist/main.js`
4. `npm run build && node dist/server.js`

## ⚠️ SE AINDA DER ERRO

Se `dist/server.js` não existir, o problema pode ser:
- O build não foi executado corretamente
- A estrutura do Dockerfile é diferente
- Precisamos verificar o Dockerfile do repositório

Nesse caso, verifique os logs do build para ver qual arquivo foi gerado.
