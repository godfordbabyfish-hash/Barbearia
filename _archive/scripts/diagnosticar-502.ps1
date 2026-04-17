# Script para diagnosticar erro 502

Write-Host "=== DIAGNOSTICO ERRO 502 ===" -ForegroundColor Cyan
Write-Host ""

$env:Path += ";$env:USERPROFILE\.fly\bin"

Write-Host "1. Verificando status das máquinas..." -ForegroundColor Yellow
fly status --app evolution-api-barbearia 2>&1 | Select-String -Pattern "STATE|stopped|started"

Write-Host ""
Write-Host "2. Verificando secrets configurados..." -ForegroundColor Yellow
fly secrets list --app evolution-api-barbearia 2>&1 | Select-String -Pattern "DATABASE|PORT|SERVER"

Write-Host ""
Write-Host "3. O problema pode ser:" -ForegroundColor Red
Write-Host "   - Database não existe ou conexão falhando" -ForegroundColor Gray
Write-Host "   - Prisma não consegue conectar" -ForegroundColor Gray
Write-Host "   - Aplicação crashando na inicialização" -ForegroundColor Gray
Write-Host ""

Write-Host "4. Vamos tentar usar o database 'railway' (padrão)..." -ForegroundColor Yellow
$railwayConnection = "postgresql://postgres:liIPIQlnvkkmJjdpGjTPCpBTsDyadeyY@shuttle.proxy.rlwy.net:13461/railway?sslmode=require"

fly secrets set `
    DATABASE_CONNECTION_URI="$railwayConnection" `
    --app evolution-api-barbearia 2>&1 | Out-Null

Write-Host "✅ Connection string atualizada para database 'railway'" -ForegroundColor Green
Write-Host ""

Write-Host "5. Reiniciando máquinas..." -ForegroundColor Yellow
fly machines restart 48e7799a7de538 --app evolution-api-barbearia 2>&1 | Out-Null
fly machines restart 6837932c771098 --app evolution-api-barbearia 2>&1 | Out-Null

Write-Host "✅ Máquinas reiniciadas!" -ForegroundColor Green
Write-Host ""
Write-Host "Aguarde 20 segundos e teste novamente: https://evolution-api-barbearia.fly.dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se ainda não funcionar, o problema pode ser:" -ForegroundColor Yellow
Write-Host "   - O database 'railway' não tem as tabelas do Prisma" -ForegroundColor Gray
Write-Host "   - A Evolution API precisa rodar migrations primeiro" -ForegroundColor Gray
