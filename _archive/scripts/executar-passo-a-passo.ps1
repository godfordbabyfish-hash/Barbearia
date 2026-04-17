# Script automatizado com verificacoes em cada etapa

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PASSO A PASSO AUTOMATIZADO" -ForegroundColor Cyan
Write-Host "  PostgreSQL do Zero" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$env:Path += ";$env:USERPROFILE\.fly\bin"

# Verificar pre-requisitos
Write-Host "=== VERIFICANDO PRE-REQUISITOS ===" -ForegroundColor Yellow
Write-Host ""

# Verificar Fly CLI
Write-Host "1. Verificando Fly CLI..." -ForegroundColor Gray
try {
    $flyVersion = fly version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   OK Fly CLI instalado" -ForegroundColor Green
    } else {
        Write-Host "   ERRO: Fly CLI nao encontrado!" -ForegroundColor Red
        Write-Host "   Instale: https://fly.io/docs/getting-started/installing-flyctl/" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "   ERRO: Fly CLI nao encontrado!" -ForegroundColor Red
    exit 1
}

# Verificar autenticacao
Write-Host "2. Verificando autenticacao..." -ForegroundColor Gray
try {
    $whoami = fly auth whoami 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   OK Autenticado no Fly.io" -ForegroundColor Green
    } else {
        Write-Host "   ERRO: Nao autenticado!" -ForegroundColor Red
        Write-Host "   Execute: fly auth login" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "   ERRO: Nao autenticado!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== PASSO 1: VERIFICAR POSTGRESQL ANTIGOS ===" -ForegroundColor Yellow
Write-Host ""

$allApps = fly apps list 2>&1
$postgresApps = $allApps | Select-String -Pattern "postgres|Postgres" -CaseSensitive:$false

if ($postgresApps) {
    Write-Host "ATENCAO: PostgreSQL antigos encontrados:" -ForegroundColor Red
    foreach ($app in $postgresApps) {
        $appName = ($app -split '\s+')[0]
        Write-Host "  - $appName" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "IMPORTANTE: Delete esses apps no dashboard antes de continuar!" -ForegroundColor Yellow
    Write-Host "  Acesse: https://dashboard.fly.io" -ForegroundColor Gray
    Write-Host "  Para cada app: Settings -> Delete App" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "Deseja continuar mesmo assim? (S/N)"
    if ($continue -ne "S" -and $continue -ne "s") {
        Write-Host "Operacao cancelada." -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Host "OK Nenhum PostgreSQL antigo encontrado!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== PASSO 2: CRIAR NOVO POSTGRESQL ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Agora voce precisa criar o PostgreSQL no dashboard:" -ForegroundColor White
Write-Host ""
Write-Host "1. Acesse: https://dashboard.fly.io" -ForegroundColor Cyan
Write-Host "2. Clique em 'New' -> 'Postgres'" -ForegroundColor Cyan
Write-Host "3. IMPORTANTE: Escolha 'Unmanaged Postgres' (gratuito)" -ForegroundColor Red
Write-Host "   NAO escolha 'Managed Postgres' (pago!)" -ForegroundColor Red
Write-Host "4. Configure:" -ForegroundColor Cyan
Write-Host "   - App Name: evolution-db" -ForegroundColor Gray
Write-Host "   - Region: gru" -ForegroundColor Gray
Write-Host "   - VM Size: shared-cpu-1x" -ForegroundColor Gray
Write-Host "   - Volume: 1 GB" -ForegroundColor Gray
Write-Host "5. Clique em 'Create'" -ForegroundColor Cyan
Write-Host "6. Aguarde 2-3 minutos para criar" -ForegroundColor Cyan
Write-Host ""

# Verificar se o app foi criado
Write-Host "Aguardando criacao do PostgreSQL..." -ForegroundColor Yellow
Write-Host ""

$maxAttempts = 30
$attempt = 0
$found = $false

while ($attempt -lt $maxAttempts -and -not $found) {
    Start-Sleep -Seconds 10
    $attempt++
    Write-Host "Tentativa $($attempt) de $($maxAttempts): Verificando se 'evolution-db' foi criado..." -ForegroundColor Gray
    
    $apps = fly apps list 2>&1
    if ($apps -match "evolution-db") {
        $found = $true
        Write-Host "OK PostgreSQL 'evolution-db' encontrado!" -ForegroundColor Green
        break
    }
}

if (-not $found) {
    Write-Host ""
    Write-Host "AVISO: PostgreSQL 'evolution-db' nao foi encontrado ainda." -ForegroundColor Yellow
    Write-Host "Continue manualmente quando o PostgreSQL estiver criado." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "=== PASSO 3: OBTER CONNECTION STRING ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "No dashboard Fly.io:" -ForegroundColor White
Write-Host "1. Clique no app 'evolution-db'" -ForegroundColor Gray
Write-Host "2. Vá em 'Connection' ou 'Settings' -> 'Connection'" -ForegroundColor Gray
Write-Host "3. Copie a connection string completa" -ForegroundColor Gray
Write-Host ""

$connectionString = Read-Host "Cole a connection string aqui"

if ([string]::IsNullOrWhiteSpace($connectionString)) {
    Write-Host ""
    Write-Host "ERRO: Connection string vazia!" -ForegroundColor Red
    exit 1
}

# Validar formato da connection string
if ($connectionString -notmatch "^postgresql://") {
    Write-Host ""
    Write-Host "AVISO: Connection string nao parece estar no formato correto." -ForegroundColor Yellow
    Write-Host "Formato esperado: postgresql://postgres:senha@host:port/database" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "Deseja continuar mesmo assim? (S/N)"
    if ($continue -ne "S" -and $continue -ne "s") {
        exit 1
    }
}

Write-Host ""
Write-Host "=== PASSO 4: CONFIGURAR EVOLUTION API ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Configurando secrets..." -ForegroundColor Gray
fly secrets set `
    DATABASE_ENABLED=true `
    DATABASE_PROVIDER=postgresql `
    DATABASE_CONNECTION_URI="$connectionString" `
    --app evolution-api-barbearia 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK Secrets configurados!" -ForegroundColor Green
} else {
    Write-Host "ERRO: Falha ao configurar secrets!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Reiniciando maquinas..." -ForegroundColor Gray

# Obter IDs das maquinas
$status = fly status --app evolution-api-barbearia 2>&1
$machines = $status | Select-String -Pattern "web\s+(\w+)" | ForEach-Object { $_.Matches.Groups[1].Value }

if ($machines) {
    foreach ($machine in $machines) {
        if ($machine) {
            Write-Host "  Reiniciando $machine..." -ForegroundColor Gray
            fly machines restart $machine --app evolution-api-barbearia 2>&1 | Out-Null
        }
    }
    Write-Host "OK Maquinas reiniciadas!" -ForegroundColor Green
} else {
    Write-Host "AVISO: Nenhuma maquina encontrada para reiniciar." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== PASSO 5: VERIFICAR FUNCIONAMENTO ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Aguardando 30 segundos para inicializacao..." -ForegroundColor Gray
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
    Write-Host "API esta funcionando!" -ForegroundColor Green
    Write-Host ""
    Write-Host "URL: https://evolution-api-barbearia.fly.dev" -ForegroundColor Cyan
} catch {
    Write-Host ""
    Write-Host "AVISO: API ainda nao esta respondendo." -ForegroundColor Yellow
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Isso pode ser normal. Aguarde mais 1-2 minutos e teste novamente:" -ForegroundColor Yellow
    Write-Host "  https://evolution-api-barbearia.fly.dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Se persistir, verifique os logs:" -ForegroundColor Yellow
    Write-Host "  fly logs --app evolution-api-barbearia" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== CONCLUIDO ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Guia completo: PASSO_A_PASSO_COMPLETO.md" -ForegroundColor Gray
