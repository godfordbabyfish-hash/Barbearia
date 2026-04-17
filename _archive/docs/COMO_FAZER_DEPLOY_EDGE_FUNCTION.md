# 🚀 Como Fazer Deploy da Edge Function

## 🔍 Verificação Inicial

A última atualização da Edge Function foi em **23 de janeiro**, então o deploy precisa ser feito agora.

## ✅ Passo a Passo

### Opção 1: Via Supabase CLI (Recomendado)

#### 1. Verificar se o Supabase CLI está instalado

```powershell
npx supabase --version
```

Se não estiver instalado, será instalado automaticamente ao usar `npx`.

#### 2. Fazer Login no Supabase

```powershell
npx supabase login
```

Isso vai abrir o navegador para você fazer login. Após fazer login, volte ao terminal.

#### 3. Linkar o Projeto

```powershell
cd "C:\Users\thiag\Downloads\Barbearia"
npx supabase link --project-ref wabefmgfsatlusevxyfo
```

**Se pedir senha:** Use sua senha do Supabase ou token de acesso.

#### 4. Fazer Deploy da Edge Function

```powershell
npx supabase functions deploy whatsapp-manager
```

**Aguarde** até aparecer "Deployed Function whatsapp-manager" ou mensagem de sucesso.

---

### Opção 2: Via Supabase Dashboard (Alternativa)

Se o CLI não funcionar, você pode fazer via Dashboard:

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions
2. **Clique em:** `whatsapp-manager`
3. **Vá na aba:** "Code"
4. **Copie o conteúdo** de `supabase/functions/whatsapp-manager/index.ts`
5. **Cole no editor** do Dashboard
6. **Clique em:** "Deploy" ou "Save"

---

## ❌ Problemas Comuns e Soluções

### Erro: "Not logged in" ou "Authentication failed"

**Solução:**
```powershell
npx supabase login
```

### Erro: "Project not linked"

**Solução:**
```powershell
cd "C:\Users\thiag\Downloads\Barbearia"
npx supabase link --project-ref wabefmgfsatlusevxyfo
```

### Erro: "Function not found"

**Solução:**
Verifique se o arquivo existe:
```powershell
Test-Path "supabase\functions\whatsapp-manager\index.ts"
```

Deve retornar `True`.

### Erro: "Network error" ou "Connection timeout"

**Soluções:**
1. Verifique sua conexão com a internet
2. Tente novamente após alguns segundos
3. Se estiver usando proxy, desabilite temporariamente:
   ```powershell
   $env:HTTP_PROXY = ""
   $env:HTTPS_PROXY = ""
   npx supabase functions deploy whatsapp-manager
   ```

### Erro: "Permission denied"

**Solução:**
Verifique se você tem permissão para fazer deploy no projeto. Acesse o Supabase Dashboard e verifique se você é admin do projeto.

---

## 🔍 Verificar se o Deploy Funcionou

### Método 1: Verificar no Dashboard

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions/whatsapp-manager
2. **Vá na aba:** "Details"
3. **Verifique:** "Last updated at" deve mostrar a data/hora de hoje

### Método 2: Verificar via Logs

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions/whatsapp-manager/logs
2. **Tente gerar QR code** no painel admin
3. **Procure por:** logs que começam com `[WhatsApp Manager] Step 1:`, `Step 2:`, etc.

Se você ver esses logs, o deploy funcionou!

---

## 📝 Script PowerShell Completo

Crie um arquivo `deploy-edge-function.ps1` com este conteúdo:

```powershell
# Script para fazer deploy da Edge Function whatsapp-manager

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY EDGE FUNCTION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Navegar para o diretório do projeto
$projectPath = "C:\Users\thiag\Downloads\Barbearia"
Write-Host "1. Navegando para: $projectPath" -ForegroundColor Yellow
Set-Location $projectPath

# 2. Verificar se o arquivo existe
Write-Host "2. Verificando se a Edge Function existe..." -ForegroundColor Yellow
$functionPath = "supabase\functions\whatsapp-manager\index.ts"
if (Test-Path $functionPath) {
    Write-Host "   ✓ Arquivo encontrado!" -ForegroundColor Green
} else {
    Write-Host "   ✗ Arquivo não encontrado: $functionPath" -ForegroundColor Red
    exit 1
}

# 3. Fazer login (se necessário)
Write-Host ""
Write-Host "3. Verificando login no Supabase..." -ForegroundColor Yellow
Write-Host "   (Se pedir login, faça login no navegador)" -ForegroundColor Gray
npx supabase login

# 4. Linkar projeto (se necessário)
Write-Host ""
Write-Host "4. Linkando projeto..." -ForegroundColor Yellow
npx supabase link --project-ref wabefmgfsatlusevxyfo

# 5. Fazer deploy
Write-Host ""
Write-Host "5. Fazendo deploy da Edge Function..." -ForegroundColor Yellow
Write-Host "   Função: whatsapp-manager" -ForegroundColor Gray
Write-Host ""

npx supabase functions deploy whatsapp-manager

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✓ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Cyan
    Write-Host "1. Acesse o painel admin → WhatsApp" -ForegroundColor White
    Write-Host "2. Clique em 'Gerar Novo QR'" -ForegroundColor White
    Write-Host "3. Escaneie o QR code com o WhatsApp" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ✗ ERRO NO DEPLOY" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifique os erros acima e tente novamente." -ForegroundColor Yellow
    Write-Host "Ou use o Supabase Dashboard como alternativa." -ForegroundColor Yellow
}

Write-Host ""
```

**Para executar:**
```powershell
.\deploy-edge-function.ps1
```

---

## 🎯 Resumo Rápido

**Comando único (se já está logado e linkado):**
```powershell
cd "C:\Users\thiag\Downloads\Barbearia"
npx supabase functions deploy whatsapp-manager
```

**Se não estiver logado:**
```powershell
npx supabase login
npx supabase link --project-ref wabefmgfsatlusevxyfo
npx supabase functions deploy whatsapp-manager
```

---

## ✅ Após o Deploy

1. **Verifique no Dashboard** que a data de "Last updated" mudou
2. **Teste gerar QR code** no painel admin
3. **Verifique os logs** para confirmar que está funcionando

Se ainda tiver problemas, me envie a mensagem de erro completa!
