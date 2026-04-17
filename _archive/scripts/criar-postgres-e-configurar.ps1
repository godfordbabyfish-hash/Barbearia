# Script para criar PostgreSQL no Fly.io e configurar Evolution API

Write-Host "Criando PostgreSQL no Fly.io..." -ForegroundColor Cyan
Write-Host ""

$env:Path += ";$env:USERPROFILE\.fly\bin"

# Criar PostgreSQL (gratuito)
Write-Host "1. Criando banco PostgreSQL..." -ForegroundColor Yellow
try {
    # Usar --yes para não precisar de interação
    $dbResult = fly postgres create --name evolution-db --region gru --vm-size shared-cpu-1x --volume-size 1 --yes 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] PostgreSQL criado!" -ForegroundColor Green
    } else {
        Write-Host "[AVISO] Pode ja existir ou erro. Continuando..." -ForegroundColor Yellow
        Write-Host $dbResult -ForegroundColor Gray
    }
} catch {
    Write-Host "[ERRO] Erro ao criar PostgreSQL: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUCAO MANUAL:" -ForegroundColor Yellow
    Write-Host "1. Acesse: https://dashboard.fly.io" -ForegroundColor Gray
    Write-Host "2. Crie um PostgreSQL manualmente" -ForegroundColor Gray
    Write-Host "3. Obtenha a connection string" -ForegroundColor Gray
    Write-Host "4. Configure: fly secrets set DATABASE_CONNECTION_URI='sua-connection-string'" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "2. Aguardando banco inicializar (30 segundos)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "3. Obtendo connection string..." -ForegroundColor Yellow

# Obter connection string
try {
    # Tentar obter connection string
    $connString = fly postgres connect -a evolution-db --command "echo \$DATABASE_URL" 2>&1
    
    if ($connString -match "postgresql://") {
        Write-Host "[OK] Connection string obtida!" -ForegroundColor Green
        $dbUrl = $connString.Trim()
    } else {
        Write-Host "[AVISO] Nao foi possivel obter automaticamente." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "OBTENHA MANUALMENTE:" -ForegroundColor Yellow
        Write-Host "1. Acesse: https://dashboard.fly.io/apps/evolution-db" -ForegroundColor Gray
        Write-Host "2. Vá em 'Connection' ou 'Settings'" -ForegroundColor Gray
        Write-Host "3. Copie a connection string" -ForegroundColor Gray
        Write-Host ""
        $dbUrl = Read-Host "Cole a connection string aqui"
    }
} catch {
    Write-Host "[AVISO] Erro ao obter connection string: $_" -ForegroundColor Yellow
    Write-Host ""
    $dbUrl = Read-Host "Digite a connection string do PostgreSQL manualmente"
}

if (-not $dbUrl -or $dbUrl -notmatch "postgresql://") {
    Write-Host "[ERRO] Connection string invalida!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "4. Configurando Evolution API..." -ForegroundColor Yellow

# Configurar variáveis no app
try {
    fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI=$dbUrl --app evolution-api-barbearia
    Write-Host "[OK] Variaveis configuradas!" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Erro ao configurar: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "5. Fazendo redeploy..." -ForegroundColor Yellow

try {
    fly deploy --app evolution-api-barbearia
    Write-Host ""
    Write-Host "[OK] DEPLOY CONCLUIDO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Aguarde 1-2 minutos e teste: https://evolution-api-barbearia.fly.dev/health" -ForegroundColor Cyan
} catch {
    Write-Host "[ERRO] Erro no deploy: $_" -ForegroundColor Red
}

Write-Host ""
