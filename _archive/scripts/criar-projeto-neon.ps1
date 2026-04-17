# Script para criar projeto Neon e configurar Evolution API

Write-Host "=== CRIAR PROJETO NEON E CONFIGURAR ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Este script vai:" -ForegroundColor Yellow
Write-Host "  1. Criar um projeto no Neon" -ForegroundColor Gray
Write-Host "  2. Obter a connection string" -ForegroundColor Gray
Write-Host "  3. Configurar Evolution API automaticamente" -ForegroundColor Gray
Write-Host ""

# Verificar se neonctl esta disponivel
Write-Host "Verificando neonctl..." -ForegroundColor Yellow
try {
    $neonVersion = npx neonctl@latest --version 2>&1
    Write-Host "OK neonctl disponivel" -ForegroundColor Green
} catch {
    Write-Host "Instalando neonctl..." -ForegroundColor Gray
}

Write-Host ""
Write-Host "Verificando autenticacao..." -ForegroundColor Yellow

# Verificar se esta autenticado
try {
    $authCheck = npx neonctl@latest projects list 2>&1
    if ($LASTEXITCODE -ne 0 -and $authCheck -match "not authenticated|authentication") {
        Write-Host "ERRO: Nao autenticado no Neon!" -ForegroundColor Red
        Write-Host "Execute: npx neonctl@latest auth" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "OK Autenticado no Neon" -ForegroundColor Green
} catch {
    Write-Host "AVISO: Nao foi possivel verificar autenticacao" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Criando projeto Neon..." -ForegroundColor Yellow
Write-Host ""

# Criar projeto via CLI
# Nota: O comando pode precisar de interacao, mas vamos tentar
$projectName = "evolution-api-barbearia"
$region = "aws-sa-east-1"  # Sao Paulo

Write-Host "Configuracao:" -ForegroundColor Cyan
Write-Host "  - Nome: $projectName" -ForegroundColor Gray
Write-Host "  - Region: $region (Sao Paulo)" -ForegroundColor Gray
Write-Host ""

Write-Host "AVISO: O comando pode pedir confirmacao interativa." -ForegroundColor Yellow
Write-Host "Siga as instrucoes na tela se aparecer." -ForegroundColor Yellow
Write-Host ""

# Tentar criar projeto
npx neonctl@latest projects create --name $projectName --region $region 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "OK Projeto criado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Obtendo connection string..." -ForegroundColor Yellow
    
    # Obter connection string
    $connectionString = npx neonctl@latest connection-string --project-name $projectName 2>&1
    
    if ($connectionString -match "postgresql://") {
        Write-Host ""
        Write-Host "OK Connection string obtida!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Configurando Evolution API..." -ForegroundColor Yellow
        
        $env:Path += ";$env:USERPROFILE\.fly\bin"
        
        fly secrets set `
            DATABASE_ENABLED=true `
            DATABASE_PROVIDER=postgresql `
            DATABASE_CONNECTION_URI="$connectionString" `
            --app evolution-api-barbearia 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK Secrets configurados!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Reiniciando maquinas..." -ForegroundColor Yellow
            
            $status = fly status --app evolution-api-barbearia 2>&1
            $machines = $status | Select-String -Pattern "web\s+(\w+)" | ForEach-Object { $_.Matches.Groups[1].Value }
            
            foreach ($machine in $machines) {
                if ($machine) {
                    fly machines restart $machine --app evolution-api-barbearia 2>&1 | Out-Null
                }
            }
            
            Write-Host ""
            Write-Host "OK Configuracao concluida!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "ERRO: Falha ao configurar secrets" -ForegroundColor Red
        }
    } else {
        Write-Host ""
        Write-Host "AVISO: Nao foi possivel obter connection string automaticamente." -ForegroundColor Yellow
        Write-Host "Execute manualmente:" -ForegroundColor Yellow
        Write-Host "  npx neonctl@latest connection-string --project-name $projectName" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Depois execute: .\configurar-com-neon.ps1" -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Host "AVISO: Nao foi possivel criar projeto automaticamente." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OPCOES:" -ForegroundColor Yellow
    Write-Host "  1. Crie manualmente no dashboard: https://neon.tech" -ForegroundColor Gray
    Write-Host "  2. Ou execute: npx neonctl@latest projects create" -ForegroundColor Gray
    Write-Host "  3. Depois execute: .\configurar-com-neon.ps1" -ForegroundColor Gray
}
