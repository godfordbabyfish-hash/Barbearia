# Script para configurar Evolution API usando PostgreSQL do Supabase

Write-Host "Configurando Evolution API com PostgreSQL do Supabase..." -ForegroundColor Cyan
Write-Host ""

$env:Path += ";$env:USERPROFILE\.fly\bin"

Write-Host "Obtendo connection string do Supabase..." -ForegroundColor Yellow

# Tentar obter connection string do Supabase
# Formato: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

Write-Host ""
Write-Host "Para obter a connection string do Supabase:" -ForegroundColor Yellow
Write-Host "1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database" -ForegroundColor Gray
Write-Host "2. Vá em 'Connection string' ou 'Connection pooling'" -ForegroundColor Gray
Write-Host "3. Copie a connection string (formato: postgresql://postgres.[PROJECT]:[PASSWORD]@...)" -ForegroundColor Gray
Write-Host ""
Write-Host "OU use a connection string direta (sem pooling):" -ForegroundColor Yellow
Write-Host "   postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres" -ForegroundColor Gray
Write-Host ""

$dbUrl = Read-Host "Cole a connection string do Supabase PostgreSQL aqui"

if (-not $dbUrl -or $dbUrl -notmatch "postgresql://") {
    Write-Host "[ERRO] Connection string invalida!" -ForegroundColor Red
    Write-Host ""
    Write-Host "ALTERNATIVA: Criar PostgreSQL no Fly.io" -ForegroundColor Yellow
    Write-Host "1. Acesse: https://dashboard.fly.io" -ForegroundColor Gray
    Write-Host "2. New -> Postgres" -ForegroundColor Gray
    Write-Host "3. Nome: evolution-db" -ForegroundColor Gray
    Write-Host "4. Copie a connection string e execute este script novamente" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "Configurando Evolution API..." -ForegroundColor Yellow

try {
    fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI=$dbUrl --app evolution-api-barbearia
    Write-Host "[OK] Variaveis configuradas!" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Erro ao configurar: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Fazendo redeploy..." -ForegroundColor Yellow

try {
    fly deploy --app evolution-api-barbearia
    Write-Host ""
    Write-Host "[OK] DEPLOY CONCLUIDO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Aguarde 1-2 minutos e teste: https://evolution-api-barbearia.fly.dev/health" -ForegroundColor Cyan
} catch {
    Write-Host "[ERRO] Erro no deploy: $_" -ForegroundColor Red
}

Write-Host ""
