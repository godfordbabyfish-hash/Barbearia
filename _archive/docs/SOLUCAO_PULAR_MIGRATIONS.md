# 🎯 SOLUÇÃO: Pular Migrations na Docker Image

## ⚠️ PROBLEMA
Mesmo a Docker Image oficial executa `db:deploy` automaticamente no startup, tentando conectar ao banco.

## ✅ SOLUÇÃO: Sobrescrever com Docker Command

A imagem Docker oficial executa migrations no entrypoint. Podemos sobrescrever isso com um Docker Command customizado.

### No Render → Settings → Build & Deploy → Docker Command

**Use este comando:**

```bash
sh -c "npm run start:prod"
```

**OU, se não funcionar:**

```bash
node dist/main
```

**OU, para forçar sem migrations:**

```bash
sh -c "skip() { echo 'Skipping migrations'; }; skip && npm run start:prod"
```

---

## 🚀 ALTERNATIVA: Usar versão específica sem migrations

Algumas versões antigas podem não ter migrations automáticas. Tente:

**Docker Image:** `atendai/evolution-api:v2.1.1`

Em vez de `latest`, use uma versão específica que pode não ter migrations automáticas.

---

## 🎯 RECOMENDAÇÃO FINAL

**Tente na ordem:**

1. **Docker Command:** `sh -c "npm run start:prod"`
2. **Se não funcionar:** Docker Image: `atendai/evolution-api:v2.1.1` (versão antiga)
3. **Se ainda não funcionar:** Use FLY.IO ou Oracle Cloud (mais controle)

---

**Tente o Docker Command primeiro e me avise o resultado!** 🚀
