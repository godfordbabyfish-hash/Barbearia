# 🚀 DEPLOY EVOLUTION API NO FLY.IO - GUIA COMPLETO

## ✅ VANTAGENS DO FLY.IO

- ✅ **Gratuito** (3 VMs compartilhadas)
- ✅ **Controle total** sobre entrypoint/CMD
- ✅ **Skip migrations** facilmente
- ✅ **Deploy rápido** via CLI
- ✅ **Logs em tempo real**
- ✅ **URL permanente** (evolution-api.fly.dev)

---

## 📋 PRÉ-REQUISITOS

1. **Conta no Fly.io** → https://fly.io/app/sign-up
2. **Fly CLI instalado** (vamos instalar agora)

---

## 🔧 PASSO 1: INSTALAR FLY CLI

### Windows (PowerShell):
```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### Ou baixe manualmente:
1. Acesse: https://fly.io/docs/hands-on/install-flyctl/
2. Baixe o executável
3. Adicione ao PATH

### Verificar instalação:
```powershell
fly version
```

---

## 🔐 PASSO 2: AUTENTICAR NO FLY.IO

```powershell
fly auth login
```

Isso vai abrir o navegador. Faça login e autorize.

---

## 📝 PASSO 3: CRIAR O ARQUIVO fly.toml

Use o arquivo `fly.toml` que está no projeto (ou execute o script `criar-fly-config.ps1`).

O arquivo já está configurado com:
- ✅ Imagem Docker oficial: `atendai/evolution-api:latest`
- ✅ Comando customizado para pular migrations
- ✅ Variáveis de ambiente corretas
- ✅ Porta 8080 exposta

---

## 🚀 PASSO 4: CRIAR O APP NO FLY.IO

Execute na pasta do projeto:

```powershell
fly launch --no-deploy --name evolution-api-barbearia
```

**OU use o nome que preferir:**
```powershell
fly launch --no-deploy --name seu-nome-aqui
```

**Nota:** `--no-deploy` cria o app mas não faz deploy ainda (vamos configurar primeiro).

---

## ⚙️ PASSO 5: CONFIGURAR VARIÁVEIS DE AMBIENTE

```powershell
fly secrets set AUTHENTICATION_API_KEY=testdaapi2026
fly secrets set CORS_ORIGIN=*
fly secrets set DATABASE_ENABLED=false
fly secrets set DATABASE_PROVIDER=postgresql
fly secrets set REDIS_ENABLED=false
fly secrets set PORT=8080
```

**OU tudo de uma vez:**
```powershell
fly secrets set AUTHENTICATION_API_KEY=testdaapi2026 CORS_ORIGIN=* DATABASE_ENABLED=false DATABASE_PROVIDER=postgresql REDIS_ENABLED=false PORT=8080
```

---

## 🎯 PASSO 6: FAZER DEPLOY

```powershell
fly deploy
```

Aguarde o deploy finalizar (2-5 minutos).

---

## ✅ PASSO 7: VERIFICAR STATUS

```powershell
fly status
fly logs
```

**Testar a API:**
```powershell
fly open
```

Ou acesse: `https://evolution-api-barbearia.fly.dev/health`

---

## 🔍 COMANDOS ÚTEIS

### Ver logs em tempo real:
```powershell
fly logs
```

### Reiniciar o app:
```powershell
fly apps restart evolution-api-barbearia
```

### Ver variáveis de ambiente:
```powershell
fly secrets list
```

### Acessar o shell do container:
```powershell
fly ssh console
```

### Ver informações do app:
```powershell
fly status
fly info
```

---

## 🐛 TROUBLESHOOTING

### Se aparecer erro de migrations:
O `fly.toml` já está configurado para pular migrations. Se ainda assim executar, verifique se o `CMD` está correto.

### Se o app não iniciar:
```powershell
fly logs
```
Verifique os logs para identificar o problema.

### Se precisar recriar o app:
```powershell
fly apps destroy evolution-api-barbearia
fly launch --no-deploy --name evolution-api-barbearia
```

---

## 📝 ATUALIZAR URL NO SUPABASE

Depois que o app estiver funcionando, atualize a URL no Supabase:

1. Obtenha a URL: `https://evolution-api-barbearia.fly.dev`
2. Execute:
```powershell
npx supabase secrets set EVOLUTION_API_URL=https://evolution-api-barbearia.fly.dev
```

---

## 🎉 PRONTO!

Sua Evolution API está rodando no Fly.io sem problemas de migrations! 🚀
