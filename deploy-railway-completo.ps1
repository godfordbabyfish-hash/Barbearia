# Script para fazer deploy completo no Railway
# Tenta automatizar tudo que for possível

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY COMPLETO NO RAILWAY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$botPath = "whatsapp-bot-railway"

cd $botPath

Write-Host "=== PASSO 1: VERIFICAR AUTENTICACAO ===" -ForegroundColor Yellow
Write-Host ""

# Verificar se está autenticado
$whoami = railway whoami 2>&1
if ($LASTEXITCODE -ne 0 -or $whoami -match "not authenticated" -or $whoami -match "not logged") {
    Write-Host "AVISO: Nao esta autenticado no Railway" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Fazendo login..." -ForegroundColor Yellow
    Write-Host "Siga as instrucoes na tela para autenticar" -ForegroundColor Gray
    railway login 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERRO: Login falhou ou foi cancelado" -ForegroundColor Red
        Write-Host ""
        Write-Host "OPCAO ALTERNATIVA: Deploy via Web" -ForegroundColor Cyan
        Write-Host "  1. Acesse: https://railway.app" -ForegroundColor White
        Write-Host "  2. Login com GitHub" -ForegroundColor White
        Write-Host "  3. New Project > Deploy from GitHub repo" -ForegroundColor White
        Write-Host "  4. Selecione: whatsapp-bot-barbearia" -ForegroundColor White
        exit 1
    }
}

Write-Host "OK Autenticado!" -ForegroundColor Green
Write-Host ""

Write-Host "=== PASSO 2: INICIALIZAR PROJETO ===" -ForegroundColor Yellow
Write-Host ""

# Verificar se já tem projeto Railway
if (Test-Path ".railway") {
    Write-Host "OK Projeto Railway ja inicializado" -ForegroundColor Green
} else {
    Write-Host "Inicializando projeto Railway..." -ForegroundColor Gray
    railway init --name whatsapp-bot-barbearia 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK Projeto inicializado" -ForegroundColor Green
    } else {
        Write-Host "AVISO: Nao foi possivel inicializar automaticamente" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== PASSO 3: CONFIGURAR VARIAVEIS ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Configurando API_KEY..." -ForegroundColor Gray
railway variables set API_KEY=testdaapi2026 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK API_KEY configurada" -ForegroundColor Green
} else {
    Write-Host "AVISO: Nao foi possivel configurar variavel automaticamente" -ForegroundColor Yellow
    Write-Host "Configure manualmente no dashboard: API_KEY = testdaapi2026" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== PASSO 4: FAZER DEPLOY ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Deployando aplicacao..." -ForegroundColor Gray
railway up --detach 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "OK Deploy iniciado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Aguardando deploy completar (2-3 minutos)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    Write-Host ""
    Write-Host "=== PASSO 5: OBTER URL ===" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Obtendo URL do Railway..." -ForegroundColor Gray
    $domain = railway domain 2>&1
    if ($domain -and $domain -notmatch "error" -and $domain -notmatch "not found") {
        $railwayUrl = $domain.Trim()
        Write-Host "OK URL obtida: $railwayUrl" -ForegroundColor Green
        Write-Host ""
        Write-Host "=== PASSO 6: ATUALIZAR SUPABASE ===" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Atualizando EVOLUTION_API_URL..." -ForegroundColor Gray
        npx supabase secrets set EVOLUTION_API_URL=$railwayUrl 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK Supabase atualizado!" -ForegroundColor Green
        } else {
            Write-Host "AVISO: Nao foi possivel atualizar automaticamente" -ForegroundColor Yellow
            Write-Host "Execute manualmente:" -ForegroundColor White
            Write-Host "  npx supabase secrets set EVOLUTION_API_URL=$railwayUrl" -ForegroundColor Cyan
        }
    } else {
        Write-Host "AVISO: Nao foi possivel obter URL automaticamente" -ForegroundColor Yellow
        Write-Host "Verifique no dashboard: https://railway.app" -ForegroundColor Gray
        Write-Host "Depois execute:" -ForegroundColor White
        Write-Host "  npx supabase secrets set EVOLUTION_API_URL=<URL_DO_RAILWAY>" -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Host "AVISO: Deploy pode ter falhado ou precisa de configuracao manual" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OPCAO ALTERNATIVA: Deploy via Web" -ForegroundColor Cyan
    Write-Host "  1. Acesse: https://railway.app" -ForegroundColor White
    Write-Host "  2. New Project > Deploy from GitHub repo" -ForegroundColor White
    Write-Host "  3. Selecione: whatsapp-bot-barbearia" -ForegroundColor White
}

cd ..

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY CONCLUIDO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Aguarde 2-3 minutos e teste:" -ForegroundColor Yellow
Write-Host "  - Acesse: Admin > WhatsApp > WhatsApp Manager" -ForegroundColor White
Write-Host "  - A instancia 'default' deve aparecer" -ForegroundColor White
Write-Host "  - Clique em 'Conectar' e escaneie QR code" -ForegroundColor White
