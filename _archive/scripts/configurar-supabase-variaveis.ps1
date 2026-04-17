# Script para configurar variaveis do Supabase para WhatsApp

Write-Host "=== CONFIGURAR VARIAVEIS SUPABASE ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Este script configura as variaveis necessarias para WhatsApp funcionar." -ForegroundColor Yellow
Write-Host ""

# Verificar se supabase CLI esta instalado
Write-Host "Verificando Supabase CLI..." -ForegroundColor Yellow
try {
    $supabaseVersion = npx supabase --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK Supabase CLI disponivel" -ForegroundColor Green
    } else {
        Write-Host "AVISO: Supabase CLI pode nao estar instalado" -ForegroundColor Yellow
    }
} catch {
    Write-Host "AVISO: Supabase CLI pode nao estar instalado" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Configurando variaveis..." -ForegroundColor Yellow
Write-Host ""

# Valores padrao
$evolutionApiUrl = "https://evolution-api-barbearia.fly.dev"
$evolutionApiKey = "testdaapi2026"
$evolutionInstanceName = "evolution-4"

Write-Host "Valores que serao configurados:" -ForegroundColor Cyan
Write-Host "  EVOLUTION_API_URL: $evolutionApiUrl" -ForegroundColor Gray
Write-Host "  EVOLUTION_API_KEY: $evolutionApiKey" -ForegroundColor Gray
Write-Host "  EVOLUTION_INSTANCE_NAME: $evolutionInstanceName" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Deseja usar esses valores? (S/N)"

if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host ""
    Write-Host "Configuracao cancelada." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Configurando EVOLUTION_API_URL..." -ForegroundColor Gray
npx supabase secrets set EVOLUTION_API_URL=$evolutionApiUrl 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK EVOLUTION_API_URL configurado" -ForegroundColor Green
} else {
    Write-Host "AVISO: Falha ao configurar EVOLUTION_API_URL" -ForegroundColor Yellow
    Write-Host "Configure manualmente no Supabase dashboard" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Configurando EVOLUTION_API_KEY..." -ForegroundColor Gray
npx supabase secrets set EVOLUTION_API_KEY=$evolutionApiKey 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK EVOLUTION_API_KEY configurado" -ForegroundColor Green
} else {
    Write-Host "AVISO: Falha ao configurar EVOLUTION_API_KEY" -ForegroundColor Yellow
    Write-Host "Configure manualmente no Supabase dashboard" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Configurando EVOLUTION_INSTANCE_NAME..." -ForegroundColor Gray
npx supabase secrets set EVOLUTION_INSTANCE_NAME=$evolutionInstanceName 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK EVOLUTION_INSTANCE_NAME configurado" -ForegroundColor Green
} else {
    Write-Host "AVISO: Falha ao configurar EVOLUTION_INSTANCE_NAME" -ForegroundColor Yellow
    Write-Host "Configure manualmente no Supabase dashboard" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== CONCLUIDO ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "  1. Aguarde Evolution API inicializar (2-3 minutos)" -ForegroundColor Gray
Write-Host "  2. Crie instancia WhatsApp no painel admin" -ForegroundColor Gray
Write-Host "  3. Teste criando um agendamento" -ForegroundColor Gray
Write-Host ""
Write-Host "Se o Supabase CLI nao funcionou, configure manualmente:" -ForegroundColor Yellow
Write-Host "  https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets" -ForegroundColor Cyan
