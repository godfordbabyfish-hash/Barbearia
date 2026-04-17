# Script para testar Evolution API no Fly.io

param(
    [Parameter(Mandatory=$false)]
    [string]$AppName = "evolution-api-barbearia"
)

$appUrl = "https://$AppName.fly.dev"

Write-Host "🧪 TESTANDO EVOLUTION API NO FLY.IO" -ForegroundColor Cyan
Write-Host "URL: $appUrl" -ForegroundColor Gray
Write-Host ""

# Teste 1: Health Check
Write-Host "1️⃣ Testando Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "$appUrl/health" -TimeoutSec 10 -ErrorAction Stop
    if ($health.StatusCode -eq 200) {
        Write-Host "   ✅ Health Check OK (Status: $($health.StatusCode))" -ForegroundColor Green
        Write-Host "   Resposta: $($health.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Health Check falhou: $_" -ForegroundColor Red
}

Write-Host ""

# Teste 2: Verificar logs
Write-Host "2️⃣ Verificando logs (últimas 20 linhas)..." -ForegroundColor Yellow
try {
    $logs = fly logs --app $AppName 2>&1 | Select-Object -Last 20
    Write-Host "   Últimas linhas dos logs:" -ForegroundColor Gray
    $logs | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} catch {
    Write-Host "   ⚠️ Não foi possível ler logs: $_" -ForegroundColor Yellow
}

Write-Host ""

# Teste 3: Status do app
Write-Host "3️⃣ Verificando status do app..." -ForegroundColor Yellow
try {
    fly status --app $AppName
} catch {
    Write-Host "   ⚠️ Não foi possível verificar status: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Testes concluídos!" -ForegroundColor Green
Write-Host ""
