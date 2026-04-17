# Script para configurar Evolution API com novo PostgreSQL

Write-Host "=== CONFIGURAR NOVO POSTGRESQL ===" -ForegroundColor Cyan
Write-Host ""

$env:Path += ";$env:USERPROFILE\.fly\bin"

Write-Host "PASSO 1: Obter Connection String" -ForegroundColor Yellow
Write-Host ""
Write-Host "No dashboard Fly.io:" -ForegroundColor White
Write-Host "  1. Acesse: https://dashboard.fly.io" -ForegroundColor Gray
Write-Host "  2. Clique no app do PostgreSQL que você criou" -ForegroundColor Gray
Write-Host "  3. Vá em 'Connection' ou 'Settings' -> 'Connection'" -ForegroundColor Gray
Write-Host "  4. Copie a connection string completa" -ForegroundColor Gray
Write-Host ""

$connectionString = Read-Host "Cole a connection string aqui"

if ([string]::IsNullOrWhiteSpace($connectionString)) {
    Write-Host ""
    Write-Host "❌ Connection string vazia!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "PASSO 2: Configurando Evolution API..." -ForegroundColor Yellow
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
    Write-Host "PASSO 3: Reiniciando máquinas..." -ForegroundColor Yellow
    
    # Obter IDs das máquinas
    $status = fly status --app evolution-api-barbearia 2>&1
    $machines = $status | Select-String -Pattern "web\s+(\w+)" | ForEach-Object { $_.Matches.Groups[1].Value }
    
    foreach ($machine in $machines) {
        if ($machine) {
            Write-Host "  Reiniciando $machine..." -ForegroundColor Gray
            fly machines restart $machine --app evolution-api-barbearia 2>&1 | Out-Null
        }
    }
    
    Write-Host ""
    Write-Host "✅ Configuração concluída!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Aguarde 30 segundos e teste:" -ForegroundColor Yellow
    Write-Host "  https://evolution-api-barbearia.fly.dev" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Erro ao configurar secrets" -ForegroundColor Red
}
