# Script para migrar de Managed Postgres (pago) para Unmanaged Postgres (gratuito)

Write-Host "=== MIGRAR PARA POSTGRESQL GRATUITO ===" -ForegroundColor Cyan
Write-Host ""

$env:Path += ";$env:USERPROFILE\.fly\bin"

Write-Host "PASSO 1: Deletar Managed Postgres (pago)..." -ForegroundColor Yellow
Write-Host ""

# Tentar deletar via CLI
Write-Host "Tentando deletar Managed Postgres..." -ForegroundColor Gray
$deleteResult = fly mpg destroy 9g6y30w4dd9rv5ml 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Managed Postgres deletado!" -ForegroundColor Green
} else {
    Write-Host "[AVISO] Nao foi possivel deletar via CLI (precisa de interacao)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "DELETE MANUALMENTE:" -ForegroundColor Red
    Write-Host "1. Acesse: https://dashboard.fly.io/managed_postgres/9g6y30w4dd9rv5ml" -ForegroundColor Gray
    Write-Host "2. Clique em 'Settings' -> 'Destroy Cluster'" -ForegroundColor Gray
    Write-Host "3. Confirme a exclusao" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "Apos deletar, pressione Enter para continuar"
}

Write-Host ""
Write-Host "PASSO 2: Criar Unmanaged Postgres (gratuito)..." -ForegroundColor Yellow
Write-Host ""

Write-Host "O CLI precisa de interacao. Siga estas instrucoes:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Acesse: https://dashboard.fly.io" -ForegroundColor White
Write-Host "2. Clique em 'New' -> 'Postgres'" -ForegroundColor White
Write-Host "3. IMPORTANTE: Escolha 'Unmanaged Postgres' (nao Managed)" -ForegroundColor Red
Write-Host "4. Configure:" -ForegroundColor White
Write-Host "   - App Name: evolution-db-free" -ForegroundColor Gray
Write-Host "   - Region: gru" -ForegroundColor Gray
Write-Host "   - VM Size: shared-cpu-1x" -ForegroundColor Gray
Write-Host "   - Volume: 1 GB" -ForegroundColor Gray
Write-Host "5. Clique em 'Create'" -ForegroundColor White
Write-Host "6. Aguarde 2-3 minutos" -ForegroundColor White
Write-Host ""

$connString = Read-Host "Depois de criar, cole a connection string aqui"

if (-not $connString -or $connString -notmatch "postgresql://") {
    Write-Host "[ERRO] Connection string invalida!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para obter a connection string:" -ForegroundColor Yellow
    Write-Host "1. Acesse: https://dashboard.fly.io/apps/evolution-db-free" -ForegroundColor Gray
    Write-Host "2. Vá em 'Connection' ou 'Settings' -> 'Connection'" -ForegroundColor Gray
    Write-Host "3. Copie a connection string completa" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "PASSO 3: Configurando Evolution API..." -ForegroundColor Yellow

try {
    fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI=$connString --app evolution-api-barbearia
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Configurado!" -ForegroundColor Green
    } else {
        Write-Host "[ERRO] Falha ao configurar" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERRO] Erro ao configurar: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "PASSO 4: Fazendo deploy..." -ForegroundColor Yellow

try {
    fly deploy --app evolution-api-barbearia
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] MIGRACAO CONCLUIDA!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Agora estamos usando PostgreSQL GRATUITO!" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Aguarde 1-2 minutos e teste:" -ForegroundColor Yellow
        Write-Host "  https://evolution-api-barbearia.fly.dev/health" -ForegroundColor Gray
    } else {
        Write-Host "[ERRO] Falha no deploy" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERRO] Erro no deploy: $_" -ForegroundColor Red
}

Write-Host ""
