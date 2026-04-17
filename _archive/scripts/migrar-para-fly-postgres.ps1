# Script para migrar Evolution API para PostgreSQL do Fly.io

Write-Host "=== MIGRAR PARA POSTGRESQL DO FLY.IO ===" -ForegroundColor Cyan
Write-Host ""

$env:Path += ";$env:USERPROFILE\.fly\bin"

Write-Host "Motivo da migração:" -ForegroundColor Yellow
Write-Host "  - Railway era temporário (dashboard Fly.io estava inacessível)" -ForegroundColor Gray
Write-Host "  - Fly.io tem PostgreSQL gratuito (Unmanaged Postgres)" -ForegroundColor Gray
Write-Host "  - Tudo em um lugar (melhor performance)" -ForegroundColor Gray
Write-Host ""

Write-Host "Situação atual:" -ForegroundColor Yellow
Write-Host "  - Postgres-IS7K: ONLINE (usar este!)" -ForegroundColor Green
Write-Host "  - Postgres: CRASHED (pode deletar depois)" -ForegroundColor Red
Write-Host "  - evolution-api: usando Railway (precisa migrar)" -ForegroundColor Red
Write-Host ""

Write-Host "PASSO 1: Obter Connection String" -ForegroundColor Cyan
Write-Host ""
Write-Host "Acesse o dashboard:" -ForegroundColor Yellow
Write-Host "  https://dashboard.fly.io" -ForegroundColor White
Write-Host ""
Write-Host "1. Clique no app 'Postgres-IS7K' (ou 'postgres-is7k')" -ForegroundColor White
Write-Host "2. Vá em 'Connection' ou 'Settings' -> 'Connection'" -ForegroundColor White
Write-Host "3. Copie a connection string completa" -ForegroundColor White
Write-Host ""

$connectionString = Read-Host "Cole a connection string aqui"

if ([string]::IsNullOrWhiteSpace($connectionString)) {
    Write-Host ""
    Write-Host "❌ Connection string vazia!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "PASSO 2: Configurando Evolution API..." -ForegroundColor Cyan
Write-Host ""

fly secrets set `
    DATABASE_ENABLED=true `
    DATABASE_PROVIDER=postgresql `
    DATABASE_CONNECTION_URI="$connectionString" `
    --app evolution-api-barbearia

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Secrets configurados!" -ForegroundColor Green
    Write-Host ""
    Write-Host "PASSO 3: Reiniciando máquinas..." -ForegroundColor Cyan
    
    # Obter IDs das máquinas
    $machines = fly status --app evolution-api-barbearia 2>&1 | Select-String -Pattern "web\s+(\w+)" | ForEach-Object { $_.Matches.Groups[1].Value }
    
    foreach ($machine in $machines) {
        if ($machine) {
            Write-Host "  Reiniciando $machine..." -ForegroundColor Gray
            fly machines restart $machine --app evolution-api-barbearia 2>&1 | Out-Null
        }
    }
    
    Write-Host ""
    Write-Host "✅ Migração concluída!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Aguarde 30 segundos e teste:" -ForegroundColor Yellow
    Write-Host "  https://evolution-api-barbearia.fly.dev" -ForegroundColor White
    Write-Host ""
    Write-Host "PASSO 4 (Opcional): Deletar PostgreSQL crashed" -ForegroundColor Cyan
    Write-Host "  - Acesse: https://dashboard.fly.io" -ForegroundColor Gray
    Write-Host "  - Clique no app 'Postgres' (crashed)" -ForegroundColor Gray
    Write-Host "  - Settings -> Delete App" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ Erro ao configurar secrets" -ForegroundColor Red
}
