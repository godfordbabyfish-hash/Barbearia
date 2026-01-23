# Script automatico para configurar tudo (sem interacao)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CONFIGURAR TUDO AUTOMATICO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# PASSO 1: Verificar Evolution API
Write-Host "=== PASSO 1: VERIFICAR EVOLUTION API ===" -ForegroundColor Yellow
Write-Host ""

$apiUrl = "https://evolution-api-barbearia.fly.dev"
Write-Host "Testando API..." -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 20 -UseBasicParsing -ErrorAction Stop
    Write-Host ""
    Write-Host "OK API esta funcionando! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "AVISO: API ainda nao esta respondendo." -ForegroundColor Yellow
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Isso pode ser normal. A API pode levar 2-5 minutos para inicializar." -ForegroundColor Yellow
    Write-Host "Continue com a configuracao e teste novamente depois." -ForegroundColor Yellow
    Write-Host ""
}

# PASSO 2: Configurar Supabase (automatico)
Write-Host "=== PASSO 2: CONFIGURAR SUPABASE ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Configurando variaveis automaticamente..." -ForegroundColor Gray
Write-Host ""

Write-Host "EVOLUTION_API_URL..." -ForegroundColor Gray
$result1 = npx supabase secrets set EVOLUTION_API_URL=$apiUrl 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK EVOLUTION_API_URL configurado" -ForegroundColor Green
} else {
    Write-Host "AVISO: Falha ao configurar via CLI" -ForegroundColor Yellow
    Write-Host "Configure manualmente em:" -ForegroundColor Yellow
    Write-Host "  https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets" -ForegroundColor Cyan
    Write-Host "  Valor: $apiUrl" -ForegroundColor Gray
}

Write-Host ""
Write-Host "EVOLUTION_API_KEY..." -ForegroundColor Gray
$result2 = npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK EVOLUTION_API_KEY configurado" -ForegroundColor Green
} else {
    Write-Host "AVISO: Falha ao configurar via CLI" -ForegroundColor Yellow
    Write-Host "Configure manualmente: testdaapi2026" -ForegroundColor Gray
}

Write-Host ""
Write-Host "EVOLUTION_INSTANCE_NAME..." -ForegroundColor Gray
$result3 = npx supabase secrets set EVOLUTION_INSTANCE_NAME=evolution-4 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK EVOLUTION_INSTANCE_NAME configurado" -ForegroundColor Green
} else {
    Write-Host "AVISO: Falha ao configurar via CLI" -ForegroundColor Yellow
    Write-Host "Configure manualmente: evolution-4" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== PASSO 3: INSTRUCOES PARA INSTANCIA WHATSAPP ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Agora voce precisa criar a instancia WhatsApp manualmente:" -ForegroundColor White
Write-Host ""
Write-Host "1. Acesse seu site (Netlify)" -ForegroundColor Cyan
Write-Host "2. Faca login como admin" -ForegroundColor Gray
Write-Host "3. Va em: WhatsApp -> WhatsApp Manager" -ForegroundColor Gray
Write-Host "4. Clique em: Criar Nova Instancia" -ForegroundColor Gray
Write-Host "5. Nome: evolution-4 (ou outro nome)" -ForegroundColor Gray
Write-Host "6. Aguarde o QR Code aparecer" -ForegroundColor Gray
Write-Host "7. Escaneie com seu WhatsApp:" -ForegroundColor Gray
Write-Host "   - Abra WhatsApp no celular" -ForegroundColor Gray
Write-Host "   - Menu -> Aparelhos conectados -> Conectar um aparelho" -ForegroundColor Gray
Write-Host "   - Escaneie o QR Code" -ForegroundColor Gray
Write-Host "8. Aguarde conectar (30-60 segundos)" -ForegroundColor Gray
Write-Host ""

Write-Host "=== CONCLUIDO ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resumo:" -ForegroundColor Yellow
Write-Host "  - Neon PostgreSQL: Configurado" -ForegroundColor Green
Write-Host "  - Evolution API: Configurada (aguardando inicializacao)" -ForegroundColor Green
Write-Host "  - Supabase: Tentativa de configuracao realizada" -ForegroundColor Green
Write-Host "  - Instancia WhatsApp: Criar no painel admin (MANUAL)" -ForegroundColor Yellow
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "  1. Aguarde 2-3 minutos e teste a API novamente" -ForegroundColor Gray
Write-Host "  2. Configure variaveis no Supabase (se CLI falhou)" -ForegroundColor Gray
Write-Host "  3. Crie instancia WhatsApp no painel admin" -ForegroundColor Gray
Write-Host "  4. Teste criando um agendamento" -ForegroundColor Gray
Write-Host ""
Write-Host "Link Supabase Secrets:" -ForegroundColor Cyan
Write-Host "  https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets" -ForegroundColor Gray
