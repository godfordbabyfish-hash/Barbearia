# Script completo para verificar TODAS as configuracoes da API

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VERIFICACAO COMPLETA DAS CONFIGURACOES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allOk = $true

# ============================================
# 1. VERIFICAR EVOLUTION API (Fly.io)
# ============================================
Write-Host "=== 1. EVOLUTION API (Fly.io) ===" -ForegroundColor Yellow
Write-Host ""

$apiUrl = "https://evolution-api-barbearia.fly.dev"
Write-Host "Testando: $apiUrl" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
    Write-Host "OK API esta respondendo! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "ERRO: API nao esta respondendo" -ForegroundColor Red
    Write-Host "  Erro: $($_.Exception.Message)" -ForegroundColor Yellow
    $allOk = $false
}

Write-Host ""

# Verificar status no Fly.io
Write-Host "Verificando status no Fly.io..." -ForegroundColor Gray
$env:Path += ";$env:USERPROFILE\.fly\bin"

try {
    $status = fly status --app evolution-api-barbearia 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK Status verificado" -ForegroundColor Green
        $status | Select-String -Pattern "Status|Machines" | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    } else {
        Write-Host "AVISO: Nao foi possivel verificar status (pode ser normal)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "AVISO: Fly CLI nao disponivel ou nao autenticado" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# 2. VERIFICAR VARIAVEIS NO SUPABASE
# ============================================
Write-Host "=== 2. VARIAVEIS NO SUPABASE ===" -ForegroundColor Yellow
Write-Host ""

$requiredVars = @(
    "EVOLUTION_API_URL",
    "EVOLUTION_API_KEY",
    "EVOLUTION_INSTANCE_NAME"
)

Write-Host "Verificando variaveis configuradas..." -ForegroundColor Gray

try {
    $secrets = npx supabase secrets list 2>&1
    if ($LASTEXITCODE -eq 0) {
        foreach ($var in $requiredVars) {
            if ($secrets -match $var) {
                Write-Host "OK $var configurado" -ForegroundColor Green
            } else {
                Write-Host "ERRO: $var NAO configurado" -ForegroundColor Red
                $allOk = $false
            }
        }
    } else {
        Write-Host "AVISO: Nao foi possivel listar secrets via CLI" -ForegroundColor Yellow
        Write-Host "  Verifique manualmente em:" -ForegroundColor Gray
        Write-Host "  https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets" -ForegroundColor Cyan
    }
} catch {
    Write-Host "AVISO: Supabase CLI nao disponivel" -ForegroundColor Yellow
    Write-Host "  Verifique manualmente as variaveis no dashboard" -ForegroundColor Gray
}

Write-Host ""

# Valores esperados
Write-Host "Valores esperados:" -ForegroundColor Cyan
Write-Host "  EVOLUTION_API_URL: https://evolution-api-barbearia.fly.dev" -ForegroundColor Gray
Write-Host "  EVOLUTION_API_KEY: testdaapi2026" -ForegroundColor Gray
Write-Host "  EVOLUTION_INSTANCE_NAME: evolution-4" -ForegroundColor Gray

Write-Host ""

# ============================================
# 3. VERIFICAR NEON POSTGRESQL
# ============================================
Write-Host "=== 3. NEON POSTGRESQL ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Verificando conexao com Neon..." -ForegroundColor Gray

try {
    $neonProjects = npx neonctl@latest projects list 2>&1
    if ($LASTEXITCODE -eq 0 -and $neonProjects -match "evolution-api-barbearia") {
        Write-Host "OK Projeto Neon encontrado" -ForegroundColor Green
        
        # Tentar obter connection string
        $connectionString = npx neonctl@latest connection-string --project-name evolution-api-barbearia 2>&1
        if ($LASTEXITCODE -eq 0 -and $connectionString -match "postgresql://") {
            Write-Host "OK Connection string disponivel" -ForegroundColor Green
        } else {
            Write-Host "AVISO: Nao foi possivel obter connection string" -ForegroundColor Yellow
        }
    } else {
        Write-Host "AVISO: Projeto Neon nao encontrado ou nao autenticado" -ForegroundColor Yellow
    }
} catch {
    Write-Host "AVISO: Neon CLI nao disponivel" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# 4. VERIFICAR EDGE FUNCTIONS
# ============================================
Write-Host "=== 4. EDGE FUNCTIONS ===" -ForegroundColor Yellow
Write-Host ""

$edgeFunctions = @(
    "whatsapp-manager",
    "whatsapp-notify",
    "whatsapp-process-queue"
)

Write-Host "Verificando Edge Functions..." -ForegroundColor Gray

foreach ($func in $edgeFunctions) {
    $funcPath = "supabase\functions\$func\index.ts"
    if (Test-Path $funcPath) {
        Write-Host "OK $func existe" -ForegroundColor Green
    } else {
        Write-Host "ERRO: $func NAO encontrado" -ForegroundColor Red
        $allOk = $false
    }
}

Write-Host ""

# ============================================
# 5. VERIFICAR FRONTEND
# ============================================
Write-Host "=== 5. FRONTEND ===" -ForegroundColor Yellow
Write-Host ""

$frontendFiles = @(
    "src\components\admin\WhatsAppManager.tsx"
)

Write-Host "Verificando componentes frontend..." -ForegroundColor Gray

foreach ($file in $frontendFiles) {
    if (Test-Path $file) {
        Write-Host "OK $file existe" -ForegroundColor Green
    } else {
        Write-Host "ERRO: $file NAO encontrado" -ForegroundColor Red
        $allOk = $false
    }
}

Write-Host ""

# ============================================
# 6. TESTAR ENDPOINTS DA API
# ============================================
Write-Host "=== 6. TESTAR ENDPOINTS DA API ===" -ForegroundColor Yellow
Write-Host ""

if ($apiReady) {
    $apiKey = "testdaapi2026"
    
    # Testar listar instancias
    Write-Host "Testando: GET /instance/fetchInstances" -ForegroundColor Gray
    try {
        $headers = @{ "apikey" = $apiKey }
        $instancesResponse = Invoke-RestMethod -Uri "$apiUrl/instance/fetchInstances" `
            -Method GET `
            -Headers $headers `
            -TimeoutSec 10 `
            -ErrorAction Stop
        
        Write-Host "OK Endpoint funcionando" -ForegroundColor Green
        if ($instancesResponse -is [Array] -and $instancesResponse.Count -gt 0) {
            Write-Host "  Instancias encontradas: $($instancesResponse.Count)" -ForegroundColor Gray
        } elseif ($instancesResponse -is [Array]) {
            Write-Host "  Nenhuma instancia encontrada (normal se ainda nao criou)" -ForegroundColor Gray
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 403) {
            Write-Host "ERRO: Acesso negado (API key pode estar incorreta)" -ForegroundColor Red
            $allOk = $false
        } else {
            Write-Host "AVISO: Erro ao testar endpoint: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "PULADO: API nao esta respondendo" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# RESUMO FINAL
# ============================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO DA VERIFICACAO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($allOk) {
    Write-Host "OK Todas as verificacoes basicas passaram!" -ForegroundColor Green
    Write-Host ""
    Write-Host "PROXIMOS PASSOS:" -ForegroundColor Cyan
    Write-Host "  1. Aguarde a API inicializar completamente (2-5 minutos)" -ForegroundColor White
    Write-Host "  2. Execute: .\criar-instancia-automatica.ps1" -ForegroundColor White
    Write-Host "  3. Acesse o painel admin e conecte o WhatsApp" -ForegroundColor White
} else {
    Write-Host "ATENCAO: Algumas verificacoes falharam!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Revise os erros acima e corrija antes de continuar." -ForegroundColor White
}

Write-Host ""
Write-Host "Detalhes completos acima." -ForegroundColor Gray
