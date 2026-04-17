# Script para criar PostgreSQL via CLI (alternativa ao dashboard)

Write-Host "=== CRIAR POSTGRESQL VIA CLI ===" -ForegroundColor Cyan
Write-Host ""

$env:Path += ";$env:USERPROFILE\.fly\bin"

# Verificar pre-requisitos
Write-Host "Verificando Fly CLI..." -ForegroundColor Yellow
try {
    $flyVersion = fly version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Fly CLI nao encontrado!" -ForegroundColor Red
        exit 1
    }
    Write-Host "OK Fly CLI instalado" -ForegroundColor Green
} catch {
    Write-Host "ERRO: Fly CLI nao encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Verificando autenticacao..." -ForegroundColor Yellow
try {
    $whoami = fly auth whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Nao autenticado!" -ForegroundColor Red
        Write-Host "Execute: fly auth login" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "OK Autenticado" -ForegroundColor Green
} catch {
    Write-Host "ERRO: Nao autenticado!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== TENTANDO CRIAR POSTGRESQL VIA CLI ===" -ForegroundColor Yellow
Write-Host ""

# Gerar senha aleatoria
$password = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 20 | ForEach-Object {[char]$_})

Write-Host "Configuracao:" -ForegroundColor Cyan
Write-Host "  - Nome: evolution-db" -ForegroundColor Gray
Write-Host "  - Region: gru" -ForegroundColor Gray
Write-Host "  - VM Size: shared-cpu-1x" -ForegroundColor Gray
Write-Host "  - Volume: 1 GB" -ForegroundColor Gray
Write-Host "  - Senha: Gerada automaticamente" -ForegroundColor Gray
Write-Host ""

Write-Host "AVISO: Este comando pode pedir confirmacao interativa." -ForegroundColor Yellow
Write-Host "Se pedir, siga as instrucoes na tela." -ForegroundColor Yellow
Write-Host ""

# Tentar criar via CLI
Write-Host "Executando comando..." -ForegroundColor Gray
Write-Host ""

fly postgres create `
    --name evolution-db `
    --region gru `
    --vm-size shared-cpu-1x `
    --volume-size 1 `
    --password $password `
    --org personal 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "OK PostgreSQL criado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Agora obtenha a connection string:" -ForegroundColor Yellow
    Write-Host "  fly postgres connect -a evolution-db" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ou acesse o dashboard quando o DNS estiver resolvido." -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "ERRO: Falha ao criar PostgreSQL via CLI." -ForegroundColor Red
    Write-Host ""
    Write-Host "Possiveis causas:" -ForegroundColor Yellow
    Write-Host "  1. Comando precisa de confirmacao interativa" -ForegroundColor Gray
    Write-Host "  2. Problema de conexao com Fly.io" -ForegroundColor Gray
    Write-Host "  3. Nome 'evolution-db' ja existe" -ForegroundColor Gray
    Write-Host ""
    Write-Host "SOLUCOES:" -ForegroundColor Yellow
    Write-Host "  1. Resolva o problema de DNS e use o dashboard" -ForegroundColor Gray
    Write-Host "  2. Ou tente criar manualmente via CLI interativo" -ForegroundColor Gray
    Write-Host "  3. Ou use outro nome para o PostgreSQL" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Veja: SOLUCAO_DNS_DASHBOARD.md" -ForegroundColor Cyan
}
