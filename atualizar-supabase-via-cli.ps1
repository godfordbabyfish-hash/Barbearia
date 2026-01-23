# Script para atualizar Supabase usando CLI (com tokens já configurados)

param(
    [Parameter(Mandatory=$false)]
    [string]$RailwayUrl = "https://whatsapp-bot-barbearia-production.up.railway.app"
)

Write-Host "🔐 Atualizando Supabase via CLI..." -ForegroundColor Cyan
Write-Host "URL Railway: $RailwayUrl" -ForegroundColor Gray
Write-Host ""

# Verificar se supabase CLI está disponível
Write-Host "Verificando Supabase CLI..." -ForegroundColor Yellow
try {
    $version = npx supabase --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Supabase CLI encontrado" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Supabase CLI pode não estar instalado" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Erro ao verificar CLI" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== INSTRUÇÕES ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Como a página de secrets retornou 404, use o CLI:" -ForegroundColor White
Write-Host ""
Write-Host "1. Execute este comando para fazer login:" -ForegroundColor Yellow
Write-Host "   npx supabase login" -ForegroundColor Cyan
Write-Host "   (Isso abrirá o navegador para autenticação)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Depois execute:" -ForegroundColor Yellow
Write-Host "   npx supabase link --project-ref wabefmgfsatlusevxyfo" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Depois configure as variáveis:" -ForegroundColor Yellow
Write-Host "   npx supabase secrets set EVOLUTION_API_URL=$RailwayUrl" -ForegroundColor Cyan
Write-Host "   npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026" -ForegroundColor Cyan
Write-Host "   npx supabase secrets set EVOLUTION_INSTANCE_NAME=default" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Verificar:" -ForegroundColor Yellow
Write-Host "   npx supabase secrets list" -ForegroundColor Cyan
Write-Host ""

# Tentar executar automaticamente (se já estiver logado)
Write-Host "Tentando configurar automaticamente..." -ForegroundColor Yellow
Write-Host ""

try {
    Write-Host "   Configurando EVOLUTION_API_URL..." -ForegroundColor Gray
    $urlResult = npx supabase secrets set EVOLUTION_API_URL=$RailwayUrl 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ EVOLUTION_API_URL configurado" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Precisa fazer login primeiro" -ForegroundColor Yellow
        Write-Host "   Execute: npx supabase login" -ForegroundColor Cyan
    }
    
    Write-Host "   Configurando EVOLUTION_API_KEY..." -ForegroundColor Gray
    $keyResult = npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ EVOLUTION_API_KEY configurado" -ForegroundColor Green
    }
    
    Write-Host "   Configurando EVOLUTION_INSTANCE_NAME..." -ForegroundColor Gray
    $instanceResult = npx supabase secrets set EVOLUTION_INSTANCE_NAME=default 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ EVOLUTION_INSTANCE_NAME configurado" -ForegroundColor Green
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Todas as variáveis configuradas com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Configurações aplicadas:" -ForegroundColor Cyan
        Write-Host "  EVOLUTION_API_URL = $RailwayUrl" -ForegroundColor Gray
        Write-Host "  EVOLUTION_API_KEY = testdaapi2026" -ForegroundColor Gray
        Write-Host "  EVOLUTION_INSTANCE_NAME = default" -ForegroundColor Gray
    }
} catch {
    Write-Host ""
    Write-Host "⚠️ Erro ao configurar automaticamente" -ForegroundColor Yellow
    Write-Host "Siga as instruções manuais acima" -ForegroundColor White
}

Write-Host ""
