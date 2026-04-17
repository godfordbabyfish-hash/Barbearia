# Script COMPLETO para fazer migração para Baileys + Railway
# Tenta automatizar tudo que for possível

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MIGRACAO COMPLETA PARA BAILEYS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$botPath = "whatsapp-bot-railway"

# Verificar se pasta existe
if (-not (Test-Path $botPath)) {
    Write-Host "ERRO: Pasta $botPath nao encontrada!" -ForegroundColor Red
    exit 1
}

Write-Host "=== PASSO 1: VERIFICAR CODIGO ===" -ForegroundColor Yellow
Write-Host ""

cd $botPath

if (-not (Test-Path "index.js") -or -not (Test-Path "package.json")) {
    Write-Host "ERRO: Arquivos do bot nao encontrados!" -ForegroundColor Red
    exit 1
}

Write-Host "OK Codigo verificado!" -ForegroundColor Green
Write-Host ""

# Verificar Git
if (-not (Test-Path ".git")) {
    Write-Host "Inicializando Git..." -ForegroundColor Gray
    git init 2>&1 | Out-Null
    git add . 2>&1 | Out-Null
    git commit -m "WhatsApp Bot com Baileys" 2>&1 | Out-Null
    Write-Host "OK Git inicializado" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== PASSO 2: PREPARAR GITHUB ===" -ForegroundColor Yellow
Write-Host ""

# Verificar se já tem remote
$remote = git remote get-url origin 2>&1
if ($LASTEXITCODE -eq 0 -and $remote) {
    Write-Host "OK Remote ja configurado: $remote" -ForegroundColor Green
    Write-Host "Fazendo push..." -ForegroundColor Yellow
    git branch -M main 2>&1 | Out-Null
    git push -u origin main 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK Push realizado!" -ForegroundColor Green
        $githubReady = $true
    } else {
        Write-Host "AVISO: Push falhou" -ForegroundColor Yellow
        $githubReady = $false
    }
} else {
    Write-Host "AVISO: Nenhum remote configurado" -ForegroundColor Yellow
    $githubReady = $false
}

Write-Host ""
Write-Host "=== PASSO 3: INSTRUCOES FINAIS ===" -ForegroundColor Yellow
Write-Host ""

if (-not $githubReady) {
    Write-Host "PARA COMPLETAR A MIGRACAO:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Crie repositorio no GitHub:" -ForegroundColor White
    Write-Host "   https://github.com/new" -ForegroundColor Gray
    Write-Host "   Nome: whatsapp-bot-barbearia" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Execute estes comandos (substitua SEU_USUARIO):" -ForegroundColor White
    Write-Host "   git remote add origin https://github.com/SEU_USUARIO/whatsapp-bot-barbearia.git" -ForegroundColor Cyan
    Write-Host "   git branch -M main" -ForegroundColor Cyan
    Write-Host "   git push -u origin main" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "3. Deploy no Railway:" -ForegroundColor White
Write-Host "   https://railway.app" -ForegroundColor Gray
Write-Host "   New Project > Deploy from GitHub repo" -ForegroundColor Gray
Write-Host "   Selecione: whatsapp-bot-barbearia" -ForegroundColor Gray
Write-Host "   Configure: API_KEY = testdaapi2026" -ForegroundColor Gray
Write-Host "   Anote a URL gerada" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Atualizar Supabase:" -ForegroundColor White
Write-Host "   npx supabase secrets set EVOLUTION_API_URL=<URL_DO_RAILWAY>" -ForegroundColor Cyan
Write-Host ""

cd ..

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PREPARACAO CONCLUIDA!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Siga os passos acima para completar a migracao!" -ForegroundColor Yellow
