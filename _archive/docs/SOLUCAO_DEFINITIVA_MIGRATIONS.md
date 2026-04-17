# 🎯 SOLUÇÃO DEFINITIVA - Pular Migrations

## ⚠️ PROBLEMA CONFIRMADO
A Docker Image oficial **sempre executa migrations** no startup, mesmo com `DATABASE_ENABLED=false`. Não há variável de ambiente oficial para pular isso.

## ✅ SOLUÇÃO 1: Sobrescrever Entrypoint (Render)

No Render, quando usa Docker Image, o "Docker Command" sobrescreve o CMD, mas o ENTRYPOINT pode executar migrations antes.

### Tentar Docker Command customizado:

**No Render → Settings → Build & Deploy → Docker Command:**

```bash
sh -c "exec node dist/main"
```

**OU:**

```bash
sh -c "npm run start:prod"
```

**OU (forçar sem migrations):**

```bash
sh -c "cd /evolution && node dist/main"
```

---

## ✅ SOLUÇÃO 2: Usar Versão Antiga (Pode não ter migrations)

Algumas versões antigas podem não executar migrations automaticamente:

**Docker Image:** `atendai/evolution-api:v2.1.1`

Em vez de `latest`, use uma versão específica mais antiga.

---

## ✅ SOLUÇÃO 3: FLY.IO (RECOMENDADO - Mais Controle)

FLY.IO permite sobrescrever completamente o entrypoint:

1. Crie conta: https://fly.io
2. Instale CLI: `iwr https://fly.io/install.ps1 -useb | iex`
3. Crie `fly.toml`:

```toml
app = "evolution-api-barbearia"
primary_region = "gru"

[build]
  image = "atendai/evolution-api:latest"

[env]
  AUTHENTICATION_API_KEY = "testdaapi2026"
  CORS_ORIGIN = "*"
  DATABASE_ENABLED = "false"
  DATABASE_PROVIDER = "postgresql"
  REDIS_ENABLED = "false"
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"
```

4. Deploy: `fly deploy --no-build`

**Vantagem:** Mais controle sobre o container.

---

## ✅ SOLUÇÃO 4: Oracle Cloud (Solução Permanente Free)

Oracle Cloud permite controle total:

1. Crie VM grátis
2. Instale Docker
3. Rode com comando customizado:

```bash
docker run -d \
  -p 8080:8080 \
  --entrypoint /bin/sh \
  atendai/evolution-api:latest \
  -c "node dist/main" \
  -e AUTHENTICATION_API_KEY=testdaapi2026 \
  -e CORS_ORIGIN=* \
  -e DATABASE_ENABLED=false \
  -e DATABASE_PROVIDER=postgresql \
  -e REDIS_ENABLED=false \
  -e PORT=8080
```

---

## 🎯 RECOMENDAÇÃO POR PRIORIDADE

1. **PRIMEIRO**: Tente Docker Command no Render: `sh -c "node dist/main"`
2. **SEGUNDO**: Tente versão antiga: `atendai/evolution-api:v2.1.1`
3. **TERCEIRO**: Migre para FLY.IO (mais controle, ainda free)
4. **QUARTO**: Use Oracle Cloud (permanente, mais trabalho)

---

**Tente a Solução 1 primeiro (Docker Command) e me avise!** 🚀
