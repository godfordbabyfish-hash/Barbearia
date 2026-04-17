# Script para usar PostgreSQL do Railway (gratuito)
# Alternativa ao Fly.io quando o dashboard não está acessível

Write-Host "=== USANDO POSTGRESQL DO RAILWAY ===" -ForegroundColor Cyan
Write-Host ""

$env:Path += ";$env:USERPROFILE\.fly\bin"

# Connection string do Railway (já encontrada no código)
$railwayConnection = "postgresql://postgres:liIPIQlnvkkmJjdpGjTPCpBTsDyadeyY@shuttle.proxy.rlwy.net:13461/railway?sslmode=require"

Write-Host "Connection String: $($railwayConnection -replace ':[^:@]+@', ':****@')" -ForegroundColor Gray
Write-Host ""

# Configurar Evolution API com Railway PostgreSQL
Write-Host "Configurando Evolution API..." -ForegroundColor Yellow
fly secrets set `
    DATABASE_ENABLED=true `
    DATABASE_PROVIDER=postgresql `
    DATABASE_CONNECTION_URI="$railwayConnection" `
    --app evolution-api-barbearia

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Secrets configurados!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Fazendo deploy..." -ForegroundColor Yellow
    fly deploy --app evolution-api-barbearia
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Deploy concluído!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Verificando logs..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        fly logs --app evolution-api-barbearia
    } else {
        Write-Host ""
        Write-Host "❌ Erro no deploy" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "❌ Erro ao configurar secrets" -ForegroundColor Red
}
