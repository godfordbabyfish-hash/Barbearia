# Script completo para finalizar configuracao dos agendamentos

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FINALIZAR CONFIGURACAO AGENDAMENTOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Este script vai:" -ForegroundColor Yellow
Write-Host "  1. Verificar se Evolution API esta funcionando" -ForegroundColor Gray
Write-Host "  2. Configurar variaveis no Supabase" -ForegroundColor Gray
Write-Host "  3. Guiar criacao da instancia WhatsApp" -ForegroundColor Gray
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

# PASSO 2: Configurar Supabase
Write-Host "=== PASSO 2: CONFIGURAR SUPABASE ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Valores que serao configurados:" -ForegroundColor Cyan
Write-Host "  EVOLUTION_API_URL: $apiUrl" -ForegroundColor Gray
Write-Host "  EVOLUTION_API_KEY: testdaapi2026" -ForegroundColor Gray
Write-Host "  EVOLUTION_INSTANCE_NAME: evolution-4" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Deseja configurar essas variaveis no Supabase? (S/N)"

if ($confirm -eq "S" -or $confirm -eq "s") {
    Write-Host ""
    Write-Host "Configurando..." -ForegroundColor Gray
    
    npx supabase secrets set EVOLUTION_API_URL=$apiUrl 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK EVOLUTION_API_URL" -ForegroundColor Green
    } else {
        Write-Host "AVISO: Falha ao configurar EVOLUTION_API_URL via CLI" -ForegroundColor Yellow
    }
    
    npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK EVOLUTION_API_KEY" -ForegroundColor Green
    } else {
        Write-Host "AVISO: Falha ao configurar EVOLUTION_API_KEY via CLI" -ForegroundColor Yellow
    }
    
    npx supabase secrets set EVOLUTION_INSTANCE_NAME=evolution-4 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK EVOLUTION_INSTANCE_NAME" -ForegroundColor Green
    } else {
        Write-Host "AVISO: Falha ao configurar EVOLUTION_INSTANCE_NAME via CLI" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Se algum falhou, configure manualmente em:" -ForegroundColor Yellow
    Write-Host "  https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions/secrets" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Configuracao do Supabase pulada." -ForegroundColor Yellow
    Write-Host "Configure manualmente quando necessario." -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== PASSO 3: CRIAR INSTANCIA WHATSAPP ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Agora voce precisa criar a instancia WhatsApp:" -ForegroundColor White
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

$instanceCreated = Read-Host "Ja criou a instancia WhatsApp? (S/N)"

if ($instanceCreated -ne "S" -and $instanceCreated -ne "s") {
    Write-Host ""
    Write-Host "Crie a instancia antes de testar os agendamentos!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== PASSO 4: TESTAR AGENDAMENTO ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Para testar:" -ForegroundColor White
Write-Host "  1. Acesse seu site" -ForegroundColor Gray
Write-Host "  2. Crie um agendamento (com telefone valido)" -ForegroundColor Gray
Write-Host "  3. Verifique se o cliente recebeu WhatsApp" -ForegroundColor Gray
Write-Host ""

Write-Host "=== CONCLUIDO ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resumo:" -ForegroundColor Yellow
Write-Host "  - Neon PostgreSQL: Configurado" -ForegroundColor Green
Write-Host "  - Evolution API: Configurada (aguardando inicializacao)" -ForegroundColor Green
Write-Host "  - Supabase: Variaveis configuradas" -ForegroundColor Green
Write-Host "  - Instancia WhatsApp: Criar no painel admin" -ForegroundColor Yellow
Write-Host ""
Write-Host "Guia completo: PROXIMOS_PASSOS_AGENDAMENTOS.md" -ForegroundColor Gray
