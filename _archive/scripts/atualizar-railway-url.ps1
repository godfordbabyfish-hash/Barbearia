# Script para atualizar EVOLUTION_API_URL no Supabase para Railway
# Use após o deploy no Railway

param(
    [Parameter(Mandatory=$true)]
    [string]$RailwayUrl
)

if (-not $RailwayUrl) {
    Write-Host "❌ Erro: URL do Railway é obrigatória" -ForegroundColor Red
    Write-Host ""
    Write-Host "Uso: .\atualizar-railway-url.ps1 -RailwayUrl 'https://whatsapp-bot-xxxx.up.railway.app'" -ForegroundColor Yellow
    exit 1
}

# Remover barra final se houver
$RailwayUrl = $RailwayUrl.TrimEnd('/')

Write-Host "🔐 Atualizando Supabase para usar Railway..." -ForegroundColor Cyan
Write-Host "URL: $RailwayUrl" -ForegroundColor Gray
Write-Host ""

# Verificar se Railway está respondendo
Write-Host "🔍 Verificando se Railway está online..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "$RailwayUrl/health" -TimeoutSec 10 -ErrorAction Stop
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "✅ Railway está online!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Railway não está respondendo ainda." -ForegroundColor Yellow
    Write-Host "   Continue mesmo assim? (S/N)" -ForegroundColor Cyan
    $continue = Read-Host
    if ($continue -ne "S" -and $continue -ne "s") {
        Write-Host "Cancelado." -ForegroundColor Yellow
        exit
    }
}

Write-Host ""
Write-Host "Atualizando Supabase..." -ForegroundColor Yellow

# API Key (deve ser a mesma configurada no Railway)
$apiKey = "testdaapi2026"
$instanceName = "default"

try {
    # Atualizar URL
    Write-Host "   Configurando EVOLUTION_API_URL..." -ForegroundColor Gray
    $urlResult = npx supabase secrets set EVOLUTION_API_URL=$RailwayUrl 2>&1
    
    # Atualizar API Key
    Write-Host "   Configurando EVOLUTION_API_KEY..." -ForegroundColor Gray
    $keyResult = npx supabase secrets set EVOLUTION_API_KEY=$apiKey 2>&1
    
    # Atualizar Instance Name
    Write-Host "   Configurando EVOLUTION_INSTANCE_NAME..." -ForegroundColor Gray
    $instanceResult = npx supabase secrets set EVOLUTION_INSTANCE_NAME=$instanceName 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Supabase atualizado com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Configurações:" -ForegroundColor Cyan
        Write-Host "  EVOLUTION_API_URL = $RailwayUrl" -ForegroundColor Gray
        Write-Host "  EVOLUTION_API_KEY = $apiKey" -ForegroundColor Gray
        Write-Host "  EVOLUTION_INSTANCE_NAME = $instanceName" -ForegroundColor Gray
        Write-Host ""
        Write-Host "📱 Próximos passos:" -ForegroundColor Yellow
        Write-Host "  1. Acesse o painel admin" -ForegroundColor Gray
        Write-Host "  2. Vá em 'WhatsApp' no menu" -ForegroundColor Gray
        Write-Host "  3. Clique em 'Conectar WhatsApp' e escaneie o QR code" -ForegroundColor Gray
    } else {
        Write-Host "❌ Erro ao atualizar Supabase" -ForegroundColor Red
        Write-Host $urlResult -ForegroundColor Gray
        Write-Host $keyResult -ForegroundColor Gray
        Write-Host $instanceResult -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erro: $_" -ForegroundColor Red
}

Write-Host ""
