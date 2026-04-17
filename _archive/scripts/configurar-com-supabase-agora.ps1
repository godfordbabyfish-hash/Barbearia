# Script para configurar Evolution API com PostgreSQL do Supabase

Write-Host "=== CONFIGURAR EVOLUTION API COM SUPABASE POSTGRESQL ===" -ForegroundColor Cyan
Write-Host ""

$env:Path += ";$env:USERPROFILE\.fly\bin"

Write-Host "Para obter a connection string do Supabase:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database/connection" -ForegroundColor White
Write-Host "2. Procure por 'Connection string' ou 'Connection pooling'" -ForegroundColor White
Write-Host "3. Copie a string que começa com 'postgresql://'" -ForegroundColor White
Write-Host ""
Write-Host "Formato esperado:" -ForegroundColor Gray
Write-Host "   postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" -ForegroundColor Gray
Write-Host ""

$dbUrl = Read-Host "Cole a connection string do Supabase aqui"

if (-not $dbUrl -or $dbUrl -notmatch "postgresql://") {
    Write-Host ""
    Write-Host "[ERRO] Connection string invalida!" -ForegroundColor Red
    Write-Host "A string deve comecar com 'postgresql://'" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=== CONFIGURANDO EVOLUTION API ===" -ForegroundColor Cyan

try {
    Write-Host "Configurando variaveis de ambiente..." -ForegroundColor Yellow
    fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI=$dbUrl --app evolution-api-barbearia
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Variaveis configuradas!" -ForegroundColor Green
    } else {
        Write-Host "[ERRO] Falha ao configurar variaveis" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERRO] Erro ao configurar: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== FAZENDO REDEPLOY ===" -ForegroundColor Cyan

try {
    Write-Host "Iniciando deploy..." -ForegroundColor Yellow
    fly deploy --app evolution-api-barbearia
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] DEPLOY CONCLUIDO!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Aguarde 1-2 minutos e teste:" -ForegroundColor Yellow
        Write-Host "   https://evolution-api-barbearia.fly.dev/health" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Ver logs:" -ForegroundColor Yellow
        Write-Host "   fly logs --app evolution-api-barbearia" -ForegroundColor Gray
    } else {
        Write-Host "[ERRO] Falha no deploy" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERRO] Erro no deploy: $_" -ForegroundColor Red
}

Write-Host ""
