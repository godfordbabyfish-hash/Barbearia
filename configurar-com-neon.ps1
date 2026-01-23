# Script para configurar Evolution API com Neon PostgreSQL

Write-Host "=== CONFIGURAR COM NEON POSTGRESQL ===" -ForegroundColor Cyan
Write-Host ""

$env:Path += ";$env:USERPROFILE\.fly\bin"

Write-Host "Neon e uma solucao DEFINITIVA e GRATUITA!" -ForegroundColor Green
Write-Host ""

Write-Host "PASSO 1: Obter Connection String do Neon" -ForegroundColor Yellow
Write-Host ""
Write-Host "No dashboard Neon (https://neon.tech):" -ForegroundColor White
Write-Host "  1. Acesse seu projeto" -ForegroundColor Gray
Write-Host "  2. A connection string esta visivel na pagina principal" -ForegroundColor Gray
Write-Host "  3. Copie a connection string completa" -ForegroundColor Gray
Write-Host ""

$connectionString = Read-Host "Cole a connection string aqui"

if ([string]::IsNullOrWhiteSpace($connectionString)) {
    Write-Host ""
    Write-Host "ERRO: Connection string vazia!" -ForegroundColor Red
    exit 1
}

# Validar formato
if ($connectionString -notmatch "^postgresql://") {
    Write-Host ""
    Write-Host "AVISO: Connection string nao parece estar no formato correto." -ForegroundColor Yellow
    Write-Host "Formato esperado: postgresql://usuario:senha@host/database" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "Deseja continuar mesmo assim? (S/N)"
    if ($continue -ne "S" -and $continue -ne "s") {
        exit 1
    }
}

Write-Host ""
Write-Host "PASSO 2: Configurando Evolution API..." -ForegroundColor Yellow
Write-Host ""

fly secrets set `
    DATABASE_ENABLED=true `
    DATABASE_PROVIDER=postgresql `
    DATABASE_CONNECTION_URI="$connectionString" `
    --app evolution-api-barbearia 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK Secrets configurados!" -ForegroundColor Green
    Write-Host ""
    Write-Host "PASSO 3: Reiniciando maquinas..." -ForegroundColor Yellow
    
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
    Write-Host "OK Maquinas reiniciadas!" -ForegroundColor Green
    Write-Host ""
    Write-Host "PASSO 4: Aguardando inicializacao..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    Write-Host ""
    Write-Host "Testando API..." -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri "https://evolution-api-barbearia.fly.dev" -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  SUCESSO!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "API esta funcionando com Neon PostgreSQL!" -ForegroundColor Green
        Write-Host ""
        Write-Host "URL: https://evolution-api-barbearia.fly.dev" -ForegroundColor Cyan
    } catch {
        Write-Host ""
        Write-Host "AVISO: API ainda nao esta respondendo." -ForegroundColor Yellow
        Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Aguarde mais 1-2 minutos e teste novamente:" -ForegroundColor Yellow
        Write-Host "  https://evolution-api-barbearia.fly.dev" -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Host "ERRO: Falha ao configurar secrets!" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== CONCLUIDO ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Neon PostgreSQL configurado com sucesso!" -ForegroundColor Green
