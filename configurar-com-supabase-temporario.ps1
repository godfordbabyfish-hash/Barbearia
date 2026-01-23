# Script para configurar Evolution API com Supabase PostgreSQL (temporario)

Write-Host "=== CONFIGURAR COM SUPABASE (TEMPORARIO) ===" -ForegroundColor Cyan
Write-Host ""

$env:Path += ";$env:USERPROFILE\.fly\bin"

Write-Host "Esta e uma solucao TEMPORARIA enquanto o dashboard nao esta acessivel." -ForegroundColor Yellow
Write-Host "Quando o DNS resolver, podemos migrar para PostgreSQL do Fly.io." -ForegroundColor Yellow
Write-Host ""

# Connection string do Supabase (ja conhecida)
$supabaseConnection = "postgresql://postgres:pFgNQxhpdCkmxED1@db.wabefmgfsatlusevxyfo.supabase.co:5432/postgres?sslmode=require"

Write-Host "Connection String: $($supabaseConnection -replace ':[^:@]+@', ':****@')" -ForegroundColor Gray
Write-Host ""

Write-Host "Configurando Evolution API..." -ForegroundColor Yellow

fly secrets set `
    DATABASE_ENABLED=true `
    DATABASE_PROVIDER=postgresql `
    DATABASE_CONNECTION_URI="$supabaseConnection" `
    --app evolution-api-barbearia 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK Secrets configurados!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Reiniciando maquinas..." -ForegroundColor Yellow
    
    # Obter IDs das maquinas
    $status = fly status --app evolution-api-barbearia 2>&1
    $machines = $status | Select-String -Pattern "web\s+(\w+)" | ForEach-Object { $_.Matches.Groups[1].Value }
    
    foreach ($machine in $machines) {
        if ($machine) {
            Write-Host "  Reiniciando $machine..." -ForegroundColor Gray
            fly machines restart $machine --app evolution-api-barbearia 2>&1 | Out-Null
        }
    }
    
    Write-Host ""
    Write-Host "OK Configuracao concluida!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Aguarde 30 segundos e teste:" -ForegroundColor Yellow
    Write-Host "  https://evolution-api-barbearia.fly.dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "NOTA: Esta e uma solucao temporaria com Supabase." -ForegroundColor Gray
    Write-Host "Quando o dashboard voltar, podemos migrar para Fly.io Postgres." -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "ERRO: Falha ao configurar secrets!" -ForegroundColor Red
}
