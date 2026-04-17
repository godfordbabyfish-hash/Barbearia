# Script para atualizar variáveis do Supabase usando tokens
# ATENÇÃO: Este script contém tokens sensíveis!

param(
    [Parameter(Mandatory=$false)]
    [string]$RailwayUrl = "https://whatsapp-bot-barbearia-production.up.railway.app"
)

# Tokens do Supabase (fornecidos pelo usuário)
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUwODMyNiwiZXhwIjoyMDg0MDg0MzI2fQ.LhxPhe6CYdGyRqfibPQpRmitqIHSRlf1YTLU3daDnTg"
$supabaseUrl = "https://wabefmgfsatlusevxyfo.supabase.co"
$projectRef = "wabefmgfsatlusevxyfo"

Write-Host "🔐 Atualizando Supabase com tokens..." -ForegroundColor Cyan
Write-Host "URL Railway: $RailwayUrl" -ForegroundColor Gray
Write-Host ""

# Tentar usar CLI do Supabase primeiro (mais seguro)
Write-Host "Tentando atualizar via CLI do Supabase..." -ForegroundColor Yellow

try {
    # Configurar variáveis via CLI
    Write-Host "   Configurando EVOLUTION_API_URL..." -ForegroundColor Gray
    $urlResult = npx supabase secrets set EVOLUTION_API_URL=$RailwayUrl 2>&1
    
    Write-Host "   Configurando EVOLUTION_API_KEY..." -ForegroundColor Gray
    $keyResult = npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026 2>&1
    
    Write-Host "   Configurando EVOLUTION_INSTANCE_NAME..." -ForegroundColor Gray
    $instanceResult = npx supabase secrets set EVOLUTION_INSTANCE_NAME=default 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Supabase atualizado com sucesso via CLI!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Configurações:" -ForegroundColor Cyan
        Write-Host "  EVOLUTION_API_URL = $RailwayUrl" -ForegroundColor Gray
        Write-Host "  EVOLUTION_API_KEY = testdaapi2026" -ForegroundColor Gray
        Write-Host "  EVOLUTION_INSTANCE_NAME = default" -ForegroundColor Gray
        exit 0
    }
} catch {
    Write-Host "⚠️ CLI não funcionou, tentando via API..." -ForegroundColor Yellow
}

# Se CLI não funcionar, tentar via API REST do Supabase
Write-Host ""
Write-Host "Tentando atualizar via API REST..." -ForegroundColor Yellow

# Nota: A API do Supabase para secrets requer autenticação especial
# Por enquanto, vamos apenas mostrar as instruções manuais

Write-Host ""
Write-Host "⚠️ Atualização automática não disponível via API direta" -ForegroundColor Yellow
Write-Host ""
Write-Host "Por favor, atualize manualmente:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Acesse: https://supabase.com/dashboard/project/$projectRef/settings/functions/secrets" -ForegroundColor White
Write-Host ""
Write-Host "2. Configure estas variáveis:" -ForegroundColor White
Write-Host "   EVOLUTION_API_URL = $RailwayUrl" -ForegroundColor Gray
Write-Host "   EVOLUTION_API_KEY = testdaapi2026" -ForegroundColor Gray
Write-Host "   EVOLUTION_INSTANCE_NAME = default" -ForegroundColor Gray
Write-Host ""
Write-Host "OU use o CLI do Supabase após fazer login:" -ForegroundColor Yellow
Write-Host "   npx supabase login" -ForegroundColor Cyan
Write-Host "   npx supabase link --project-ref $projectRef" -ForegroundColor Cyan
Write-Host "   npx supabase secrets set EVOLUTION_API_URL=$RailwayUrl" -ForegroundColor Cyan
Write-Host ""
