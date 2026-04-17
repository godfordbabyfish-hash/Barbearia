# 🔧 SOLUÇÃO: Pular Migrations no Fly.io

## ⚠️ PROBLEMA

A imagem Docker oficial `atendai/evolution-api:latest` executa migrations no ENTRYPOINT, mesmo com `DATABASE_ENABLED=false`.

## ✅ SOLUÇÕES NO FLY.IO

### OPÇÃO 1: Dockerfile Wrapper (RECOMENDADO)

Crie um `Dockerfile` que sobrescreve o ENTRYPOINT:

```dockerfile
FROM atendai/evolution-api:latest

# Override ENTRYPOINT para pular migrations
ENTRYPOINT []
CMD ["sh", "-c", "node dist/main.js || node dist/src/main.js || node dist/server.js || npm run start:prod"]
```

**Atualize o `fly.toml`:**
```toml
[build]
  dockerfile = "Dockerfile"
```

### OPÇÃO 2: Usar Imagem Mais Antiga

A versão `v2.1.1` pode ter comportamento diferente:

```toml
[build]
  image = "atendai/evolution-api:v2.1.1"
```

### OPÇÃO 3: Usar Fly.io Experimental Features

Se o Fly.io suportar `--entrypoint` override, use:

```toml
[experimental]
  entrypoint = []
  cmd = ["node", "dist/main.js"]
```

**Nota:** Isso pode não estar disponível em todas as versões do Fly.io.

---

## 🎯 RECOMENDAÇÃO FINAL

**Use a OPÇÃO 1 (Dockerfile Wrapper)** - é a mais confiável e garante que migrations não sejam executadas.

---

## 📝 IMPLEMENTAÇÃO

1. Crie o `Dockerfile` com o conteúdo acima
2. Atualize `fly.toml` para usar `dockerfile = "Dockerfile"`
3. Faça deploy: `fly deploy`

Se precisar, posso criar o Dockerfile para você!
