# Script para atualizar EVOLUTION_API_URL no Supabase
# Use após o deploy no Fly.io

param(
    [Parameter(Mandatory=$false)]
    [string]$AppName = "evolution-api-barbearia"
)

$appUrl = "https://$AppName.fly.dev"

Write-Host "🔐 Atualizando Supabase..." -ForegroundColor Cyan
Write-Host "URL: $appUrl" -ForegroundColor Gray
Write-Host ""

# Verificar se app está respondendo
Write-Host "🔍 Verificando se app está online..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "$appUrl/health" -TimeoutSec 10 -ErrorAction Stop
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "✅ App está online!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ App não está respondendo ainda." -ForegroundColor Yellow
    Write-Host "   Continue mesmo assim? (S/N)" -ForegroundColor Cyan
    $continue = Read-Host
    if ($continue -ne "S" -and $continue -ne "s") {
        Write-Host "Cancelado." -ForegroundColor Yellow
        exit
    }
}

Write-Host ""
Write-Host "Atualizando Supabase..." -ForegroundColor Yellow

# API Key (deve ser a mesma configurada no Fly.io)
$apiKey = "testdaapi2026"

try {
    # Atualizar URL
    Write-Host "   Configurando EVOLUTION_API_URL..." -ForegroundColor Gray
    $urlResult = npx supabase secrets set EVOLUTION_API_URL=$appUrl 2>&1
    
    # Atualizar API Key
    Write-Host "   Configurando EVOLUTION_API_KEY..." -ForegroundColor Gray
    $keyResult = npx supabase secrets set EVOLUTION_API_KEY=$apiKey 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Supabase atualizado com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "EVOLUTION_API_URL = $appUrl" -ForegroundColor Gray
        Write-Host "EVOLUTION_API_KEY = $apiKey" -ForegroundColor Gray
    } else {
        Write-Host "❌ Erro ao atualizar Supabase" -ForegroundColor Red
        Write-Host $urlResult -ForegroundColor Gray
        Write-Host $keyResult -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erro: $_" -ForegroundColor Red
}

Write-Host ""
