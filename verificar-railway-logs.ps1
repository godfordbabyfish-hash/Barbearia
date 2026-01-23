# Script para Verificar Logs do Railway
# Requer Railway CLI instalado

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VERIFICAR LOGS DO RAILWAY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Railway CLI esta instalado
Write-Host "Verificando Railway CLI..." -ForegroundColor Yellow
try {
    $railwayVersion = railway --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Railway CLI encontrado" -ForegroundColor Green
    } else {
        Write-Host "   Railway CLI nao encontrado" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Para instalar Railway CLI:" -ForegroundColor White
        Write-Host "   npm install -g @railway/cli" -ForegroundColor Cyan
        Write-Host "   OU" -ForegroundColor Gray
        Write-Host "   winget install Railway.CLI" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Alternativa: Veja os logs no dashboard:" -ForegroundColor White
        Write-Host "   https://railway.app/dashboard" -ForegroundColor Cyan
        exit 1
    }
} catch {
    Write-Host "   Railway CLI nao encontrado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para instalar Railway CLI:" -ForegroundColor White
    Write-Host "   npm install -g @railway/cli" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Alternativa: Veja os logs no dashboard:" -ForegroundColor White
    Write-Host "   https://railway.app/dashboard" -ForegroundColor Cyan
    exit 1
}

Write-Host ""

# Verificar se esta logado
Write-Host "Verificando login no Railway..." -ForegroundColor Yellow
try {
    $whoami = railway whoami 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Logado como: $whoami" -ForegroundColor Green
    } else {
        Write-Host "   Nao esta logado" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Para fazer login:" -ForegroundColor White
        Write-Host "   railway login" -ForegroundColor Cyan
        exit 1
    }
} catch {
    Write-Host "   Erro ao verificar login" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Listar projetos
Write-Host "Procurando projeto whatsapp-bot-barbearia..." -ForegroundColor Yellow
try {
    $projects = railway list 2>&1
    if ($projects -match "whatsapp-bot-barbearia") {
        Write-Host "   Projeto encontrado" -ForegroundColor Green
    } else {
        Write-Host "   Projeto nao encontrado na lista" -ForegroundColor Yellow
        Write-Host "   Projetos disponiveis:" -ForegroundColor Gray
        Write-Host $projects -ForegroundColor Gray
    }
} catch {
    Write-Host "   Erro ao listar projetos" -ForegroundColor Red
}

Write-Host ""

# Mostrar logs recentes
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LOGS RECENTES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para ver logs completos, execute:" -ForegroundColor Yellow
Write-Host "   railway logs --service whatsapp-bot-barbearia" -ForegroundColor Cyan
Write-Host ""
Write-Host "OU acesse o dashboard:" -ForegroundColor Yellow
Write-Host "   https://railway.app/dashboard" -ForegroundColor Cyan
Write-Host "   -> Selecione o projeto" -ForegroundColor Gray
Write-Host "   -> Clique em 'View logs'" -ForegroundColor Gray
Write-Host ""

# Tentar mostrar ultimos logs
Write-Host "Tentando obter ultimos logs..." -ForegroundColor Yellow
try {
    railway logs --service whatsapp-bot-barbearia --tail 50 2>&1 | Select-Object -First 30
} catch {
    Write-Host "   Use o comando manual ou o dashboard" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE RAPIDO DA API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Testar API
$apiUrl = "https://whatsapp-bot-barbearia-production.up.railway.app"
Write-Host "Testando: $apiUrl" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 10 -Method GET -ErrorAction Stop
    Write-Host "   SUCESSO! API esta respondendo" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode) {
        Write-Host "   Status: $statusCode" -ForegroundColor Yellow
    } else {
        Write-Host "   ERRO: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
