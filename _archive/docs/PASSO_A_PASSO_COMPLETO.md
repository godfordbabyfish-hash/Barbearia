# 🚀 PASSO A PASSO COMPLETO - POSTGRESQL DO ZERO

## 🎯 OBJETIVO

Criar um PostgreSQL novo do zero no Fly.io e configurar a Evolution API corretamente, evitando todos os erros anteriores.

---

## ✅ PRÉ-REQUISITOS

Antes de começar, verifique:

- [ ] Fly.io CLI instalado (`fly version` deve funcionar)
- [ ] Logado no Fly.io (`fly auth whoami`)
- [ ] Dashboard Fly.io acessível (https://dashboard.fly.io)

---

## 📋 PASSO 1: VERIFICAR E LIMPAR POSTGRESQL ANTIGOS

### 1.1 Listar todos os apps

**Execute:**
```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"
fly apps list
```

**O que procurar:**
- Apps com nome contendo "postgres", "Postgres", "postgresql"
- Anote os nomes de todos os PostgreSQL encontrados

### 1.2 Deletar PostgreSQL antigos (se houver)

**Para cada PostgreSQL encontrado:**

**Opção A - Via Dashboard (RECOMENDADO):**
1. Acesse: https://dashboard.fly.io
2. Clique no app PostgreSQL
3. Vá em **"Settings"** (menu lateral)
4. Role até o final
5. Clique em **"Delete App"**
6. Digite o nome do app para confirmar
7. Clique em **"Delete"**

**Opção B - Via CLI:**
```powershell
fly apps destroy NOME_DO_APP --yes
```

**✅ Verificação:**
```powershell
fly apps list | Select-String -Pattern "postgres"
```
**Resultado esperado:** Nenhum app PostgreSQL listado

---

## 📋 PASSO 2: CRIAR NOVO POSTGRESQL

### 2.1 Acessar Dashboard

1. **Abra o navegador**
2. **Acesse:** https://dashboard.fly.io
3. **Faça login** se necessário

### 2.2 Criar PostgreSQL

1. **Clique no botão:** "New" (canto superior direito, verde)
2. **Selecione:** "Postgres" no menu dropdown

### 2.3 Escolher Tipo (CRÍTICO!)

**Na tela que abrir, você verá 2 opções:**

- ❌ **"Managed Postgres"** 
  - Mostra preço: "$38/month" ou similar
  - **NÃO ESCOLHA ESTE!**

- ✅ **"Unmanaged Postgres"**
  - Mostra: "Free tier" ou não mostra preço
  - **ESCOLHA ESTE!**

**⚠️ ATENÇÃO:** Se não vir "Unmanaged Postgres", procure por:
- "Create Postgres" (sem "Managed")
- "Unmanaged" ou "Self-managed"
- Opção que não menciona preço

### 2.4 Configurar PostgreSQL

**Preencha os campos:**

1. **App Name:**
   - Digite: `evolution-db`
   - ✅ Deve ser único (se já existir, use `evolution-db-2`)

2. **Region:**
   - Selecione: `gru` (São Paulo - Brazil)
   - ✅ Ou escolha a região mais próxima de você

3. **VM Size:**
   - Selecione: `shared-cpu-1x`
   - ✅ Esta é a opção gratuita

4. **Volume Size:**
   - Digite: `1`
   - Unidade: `GB`
   - ✅ 1 GB é suficiente para começar

5. **Password (opcional):**
   - Pode deixar em branco (será gerada automaticamente)
   - ✅ Ou crie uma senha forte se preferir

### 2.5 Criar

1. **Revise todas as configurações**
2. **Clique em:** "Create" ou "Deploy"
3. **Aguarde 2-3 minutos** para criar

**✅ Verificação:**
- No dashboard, você verá o app `evolution-db` aparecer
- Status deve mudar de "Deploying" para "Deployed" ou "Running"
- Aguarde até aparecer status verde/online

---

## 📋 PASSO 3: OBTER CONNECTION STRING

### 3.1 Acessar App PostgreSQL

1. **No dashboard Fly.io**, clique no app **`evolution-db`**
2. **Aguarde a página carregar completamente**

### 3.2 Encontrar Connection String

**Opção A - Menu "Connection":**
1. No menu lateral esquerdo, procure por **"Connection"**
2. Clique em **"Connection"**
3. Você verá a connection string completa

**Opção B - Settings → Connection:**
1. No menu lateral, clique em **"Settings"**
2. Procure por **"Connection"** ou **"Database Connection"**
3. Clique nele
4. Você verá a connection string completa

**Opção C - Overview:**
1. Na página inicial do app, procure por uma seção **"Connection"** ou **"Connect"**
2. A connection string pode estar visível diretamente

### 3.3 Copiar Connection String

**Formato esperado:**
```
postgresql://postgres:SENHA@evolution-db.fly.dev:5432/evolution_db
```

ou

```
postgresql://postgres:SENHA@evolution-db.internal:5432/evolution_db
```

**✅ Verificação:**
- Connection string deve começar com `postgresql://`
- Deve conter: `postgres`, senha, hostname, porta `5432`, e nome do database
- **Copie a string COMPLETA** (incluindo a senha)

**💾 Salve a connection string em um local seguro!**

---

## 📋 PASSO 4: CONFIGURAR EVOLUTION API

### 4.1 Executar Script de Configuração

**Execute:**
```powershell
cd c:\Users\thiag\Downloads\Barbearia
.\configurar-novo-postgres.ps1
```

### 4.2 Inserir Connection String

**Quando o script pedir:**
```
Cole a connection string aqui:
```

1. **Cole a connection string** que você copiou no Passo 3
2. **Pressione Enter**

**✅ Verificação:**
- O script deve mostrar: "PASSO 2: Configurando Evolution API..."
- Não deve aparecer erro de "Connection string vazia"

### 4.3 Aguardar Configuração

**O script vai:**
1. Configurar secrets no Fly.io
2. Reiniciar as máquinas da Evolution API
3. Mostrar mensagem de sucesso

**✅ Verificação:**
- Deve aparecer: "✅ Secrets configurados!"
- Deve aparecer: "✅ Configuração concluída!"
- Não deve aparecer erros em vermelho

---

## 📋 PASSO 5: VERIFICAR SE ESTÁ FUNCIONANDO

### 5.1 Aguardar Inicialização

**Aguarde 30-60 segundos** após o script terminar para a aplicação inicializar.

### 5.2 Testar API

**Opção A - Navegador:**
1. Abra: https://evolution-api-barbearia.fly.dev
2. **Resultado esperado:**
   - ✅ Página carrega (não erro 502)
   - ✅ Mostra JSON ou interface da Evolution API
   - ❌ Se der erro 502, aguarde mais 30 segundos e tente novamente

**Opção B - PowerShell:**
```powershell
try {
    $response = Invoke-WebRequest -Uri "https://evolution-api-barbearia.fly.dev" -TimeoutSec 10 -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "✅ API está funcionando!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}
```

### 5.3 Verificar Logs (se necessário)

**Se ainda der erro 502:**
```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"
fly logs --app evolution-api-barbearia | Select-String -Pattern "error|Error|ERROR|Prisma|database|Failed" | Select-Object -Last 20
```

**O que procurar:**
- ❌ `PrismaClientInitializationError` = Problema de conexão com database
- ❌ `Can't reach database server` = Connection string incorreta
- ❌ `FATAL:` = Erro de autenticação no PostgreSQL
- ✅ `Server listening on port 8080` = Tudo funcionando!

---

## 🔧 SOLUÇÃO DE PROBLEMAS

### Problema: Erro 502 após configurar

**Possíveis causas:**
1. Connection string incorreta
2. Database ainda não terminou de criar
3. Evolution API precisa de mais tempo para inicializar

**Solução:**
1. Verifique se a connection string está correta
2. Aguarde mais 2-3 minutos
3. Verifique os logs (Passo 5.3)

### Problema: Não encontro "Unmanaged Postgres"

**Solução:**
1. Procure por "Create Postgres" sem "Managed"
2. Ou use o CLI: `fly postgres create --name evolution-db --region gru --vm-size shared-cpu-1x --volume-size 1`

### Problema: Connection string não aparece

**Solução:**
1. Aguarde mais tempo (database pode estar criando)
2. Recarregue a página
3. Verifique se o app está "Deployed" ou "Running"

---

## ✅ CHECKLIST FINAL

Antes de considerar concluído, verifique:

- [ ] PostgreSQL criado e online no dashboard
- [ ] Connection string obtida e salva
- [ ] Evolution API configurada (script executado com sucesso)
- [ ] API respondendo (não erro 502)
- [ ] Logs não mostram erros críticos

---

## 🎉 PRONTO!

Se todos os itens do checklist estão marcados, **você está pronto!**

A Evolution API está configurada e funcionando com o PostgreSQL do Fly.io.

---

**Status:** 🚀 **PRONTO PARA EXECUTAR!**
