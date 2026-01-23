# Script para fazer deploy completo no Railway
# Tenta automatizar o máximo possível

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY BAILEYS NO RAILWAY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$botPath = "whatsapp-bot-railway"

# Verificar se pasta existe
if (-not (Test-Path $botPath)) {
    Write-Host "ERRO: Pasta $botPath nao encontrada!" -ForegroundColor Red
    exit 1
}

Write-Host "=== PASSO 1: PREPARAR REPOSITORIO ===" -ForegroundColor Yellow
Write-Host ""

cd $botPath

# Verificar se já é repositório Git
if (-not (Test-Path ".git")) {
    Write-Host "Inicializando repositorio Git..." -ForegroundColor Gray
    git init 2>&1 | Out-Null
    Write-Host "OK Repositorio inicializado" -ForegroundColor Green
}

# Adicionar arquivos
Write-Host "Adicionando arquivos..." -ForegroundColor Gray
git add . 2>&1 | Out-Null

# Verificar se há mudanças
$status = git status --porcelain
if ($status) {
    Write-Host "Criando commit..." -ForegroundColor Gray
    git commit -m "WhatsApp Bot com Baileys - Pronto para deploy" 2>&1 | Out-Null
    Write-Host "OK Commit criado" -ForegroundColor Green
} else {
    Write-Host "OK Nenhuma mudanca para commitar" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== PASSO 2: VERIFICAR GITHUB ===" -ForegroundColor Yellow
Write-Host ""

# Verificar se já tem remote
$remote = git remote get-url origin 2>&1
if ($LASTEXITCODE -eq 0 -and $remote) {
    Write-Host "OK Remote GitHub configurado: $remote" -ForegroundColor Green
    Write-Host ""
    Write-Host "Fazendo push para GitHub..." -ForegroundColor Yellow
    git push -u origin main 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK Push realizado!" -ForegroundColor Green
    } else {
        Write-Host "AVISO: Nao foi possivel fazer push automaticamente" -ForegroundColor Yellow
        Write-Host "Execute manualmente:" -ForegroundColor White
        Write-Host "  cd $botPath" -ForegroundColor Gray
        Write-Host "  git push -u origin main" -ForegroundColor Gray
    }
} else {
    Write-Host "AVISO: Nenhum remote GitHub configurado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "PARA CONCLUIR O DEPLOY:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Crie um repositorio no GitHub:" -ForegroundColor White
    Write-Host "   - Acesse: https://github.com/new" -ForegroundColor Gray
    Write-Host "   - Nome: whatsapp-bot-barbearia" -ForegroundColor Gray
    Write-Host "   - Crie o repositorio" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Conecte o repositorio local:" -ForegroundColor White
    Write-Host "   git remote add origin https://github.com/SEU_USUARIO/whatsapp-bot-barbearia.git" -ForegroundColor Gray
    Write-Host "   git push -u origin main" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Deploy no Railway:" -ForegroundColor White
    Write-Host "   - Acesse: https://railway.app" -ForegroundColor Gray
    Write-Host "   - New Project > Deploy from GitHub repo" -ForegroundColor Gray
    Write-Host "   - Selecione o repositorio" -ForegroundColor Gray
    Write-Host "   - Configure: API_KEY = testdaapi2026" -ForegroundColor Gray
    Write-Host "   - Anote a URL gerada" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Atualizar Supabase:" -ForegroundColor White
    Write-Host "   npx supabase secrets set EVOLUTION_API_URL=<URL_DO_RAILWAY>" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

cd ..

Write-Host ""
Write-Host "=== PASSO 3: DEPLOY NO RAILWAY ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "O codigo esta no GitHub!" -ForegroundColor Green
Write-Host ""
Write-Host "AGORA:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Acesse: https://railway.app" -ForegroundColor White
Write-Host "2. Login com GitHub" -ForegroundColor White
Write-Host "3. New Project > Deploy from GitHub repo" -ForegroundColor White
Write-Host "4. Selecione: whatsapp-bot-barbearia" -ForegroundColor White
Write-Host "5. Railway vai fazer deploy automaticamente" -ForegroundColor White
Write-Host "6. Configure variavel: API_KEY = testdaapi2026" -ForegroundColor White
Write-Host "7. Anote a URL gerada" -ForegroundColor White
Write-Host ""
Write-Host "Quando tiver a URL, execute:" -ForegroundColor Yellow
Write-Host "  npx supabase secrets set EVOLUTION_API_URL=<URL_DO_RAILWAY>" -ForegroundColor Cyan
Write-Host ""
