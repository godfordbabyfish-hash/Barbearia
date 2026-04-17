# Script para verificar e corrigir conexão com PostgreSQL do Railway

Write-Host "=== VERIFICANDO E CORRIGINDO DATABASE ===" -ForegroundColor Cyan
Write-Host ""

$env:Path += ";$env:USERPROFILE\.fly\bin"

# Connection string atual (database: railway)
$railwayConnection = "postgresql://postgres:liIPIQlnvkkmJjdpGjTPCpBTsDyadeyY@shuttle.proxy.rlwy.net:13461/railway?sslmode=require"

# Connection string alternativa (sem database específico, para criar)
$railwayConnectionDefault = "postgresql://postgres:liIPIQlnvkkmJjdpGjTPCpBTsDyadeyY@shuttle.proxy.rlwy.net:13461/postgres?sslmode=require"

Write-Host "Connection String atual: $($railwayConnection -replace ':[^:@]+@', ':****@')" -ForegroundColor Gray
Write-Host ""

# Verificar se precisa criar database evolution_db
Write-Host "A Evolution API pode precisar de um database específico." -ForegroundColor Yellow
Write-Host "Vamos tentar usar o database 'evolution_db' que já existe no Railway." -ForegroundColor Yellow
Write-Host ""

# Connection string com evolution_db (baseado no criar-db.py)
$evolutionDbConnection = "postgresql://postgres:liIPIQlnvkkmJjdpGjTPCpBTsDyadeyY@shuttle.proxy.rlwy.net:13461/evolution_db?sslmode=require"

Write-Host "Tentando configurar com database 'evolution_db'..." -ForegroundColor Yellow
fly secrets set `
    DATABASE_ENABLED=true `
    DATABASE_PROVIDER=postgresql `
    DATABASE_CONNECTION_URI="$evolutionDbConnection" `
    --app evolution-api-barbearia

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Secrets atualizados!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Reiniciando máquinas..." -ForegroundColor Yellow
    
    # Reiniciar máquinas
    fly machines restart 48e7799a7de538 --app evolution-api-barbearia 2>&1 | Out-Null
    fly machines restart 6837932c771098 --app evolution-api-barbearia 2>&1 | Out-Null
    
    Write-Host "✅ Máquinas reiniciadas!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Aguarde 15 segundos e teste: https://evolution-api-barbearia.fly.dev" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Erro ao atualizar secrets" -ForegroundColor Red
}
