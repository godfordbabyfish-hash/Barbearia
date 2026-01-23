# Script completo para configurar database do Evolution API
# Tenta usar Supabase primeiro, depois guia para criar no Fly.io

Write-Host "=== CONFIGURAR DATABASE PARA EVOLUTION API ===" -ForegroundColor Cyan
Write-Host ""

$env:Path += ";$env:USERPROFILE\.fly\bin"

Write-Host "OPCOES:" -ForegroundColor Yellow
Write-Host "1. Usar PostgreSQL do Supabase (ja existe)" -ForegroundColor White
Write-Host "2. Criar PostgreSQL no Fly.io (gratuito)" -ForegroundColor White
Write-Host ""

$opcao = Read-Host "Escolha (1 ou 2)"

if ($opcao -eq "1") {
    Write-Host ""
    Write-Host "=== USANDO SUPABASE POSTGRESQL ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Para obter a connection string:" -ForegroundColor Yellow
    Write-Host "1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database" -ForegroundColor Gray
    Write-Host "2. Vá em 'Connection string' ou 'Connection pooling'" -ForegroundColor Gray
    Write-Host "3. Copie a connection string" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Formato esperado:" -ForegroundColor Gray
    Write-Host "   postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" -ForegroundColor Gray
    Write-Host ""
    
    $dbUrl = Read-Host "Cole a connection string aqui"
    
    if (-not $dbUrl -or $dbUrl -notmatch "postgresql://") {
        Write-Host "[ERRO] Connection string invalida!" -ForegroundColor Red
        exit 1
    }
    
} elseif ($opcao -eq "2") {
    Write-Host ""
    Write-Host "=== CRIAR POSTGRESQL NO FLY.IO ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Siga estes passos:" -ForegroundColor Yellow
    Write-Host "1. Acesse: https://dashboard.fly.io" -ForegroundColor Gray
    Write-Host "2. Clique em 'New' -> 'Postgres'" -ForegroundColor Gray
    Write-Host "3. Configure:" -ForegroundColor Gray
    Write-Host "   - Nome: evolution-db" -ForegroundColor Gray
    Write-Host "   - Region: gru" -ForegroundColor Gray
    Write-Host "   - VM Size: shared-cpu-1x" -ForegroundColor Gray
    Write-Host "   - Volume: 1 GB" -ForegroundColor Gray
    Write-Host "4. Clique em 'Create'" -ForegroundColor Gray
    Write-Host "5. Aguarde 2-3 minutos" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Depois, obtenha a connection string:" -ForegroundColor Yellow
    Write-Host "1. Acesse: https://dashboard.fly.io/apps/evolution-db" -ForegroundColor Gray
    Write-Host "2. Vá em 'Connection' ou 'Settings'" -ForegroundColor Gray
    Write-Host "3. Copie a connection string" -ForegroundColor Gray
    Write-Host ""
    
    $dbUrl = Read-Host "Cole a connection string aqui"
    
    if (-not $dbUrl -or $dbUrl -notmatch "postgresql://") {
        Write-Host "[ERRO] Connection string invalida!" -ForegroundColor Red
        exit 1
    }
    
} else {
    Write-Host "[ERRO] Opcao invalida!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== CONFIGURANDO EVOLUTION API ===" -ForegroundColor Cyan

try {
    fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI=$dbUrl --app evolution-api-barbearia
    Write-Host "[OK] Variaveis configuradas!" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Erro ao configurar: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== FAZENDO REDEPLOY ===" -ForegroundColor Cyan

try {
    fly deploy --app evolution-api-barbearia
    Write-Host ""
    Write-Host "[OK] DEPLOY CONCLUIDO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Aguarde 1-2 minutos e teste:" -ForegroundColor Yellow
    Write-Host "   https://evolution-api-barbearia.fly.dev/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ver logs:" -ForegroundColor Yellow
    Write-Host "   fly logs --app evolution-api-barbearia" -ForegroundColor Gray
} catch {
    Write-Host "[ERRO] Erro no deploy: $_" -ForegroundColor Red
}

Write-Host ""
