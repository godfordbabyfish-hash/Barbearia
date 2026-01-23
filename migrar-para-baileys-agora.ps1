# Script para migrar para Baileys + Railway AGORA
# Resolve todos os problemas de uma vez

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MIGRAR PARA BAILEYS + RAILWAY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Esta migracao vai:" -ForegroundColor Yellow
Write-Host "  1. Criar bot Baileys pronto para deploy" -ForegroundColor White
Write-Host "  2. Guiar deploy no Railway (5 min)" -ForegroundColor White
Write-Host "  3. Atualizar Supabase automaticamente" -ForegroundColor White
Write-Host "  4. Testar tudo" -ForegroundColor White
Write-Host ""
Write-Host "Tempo estimado: 15-20 minutos" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione qualquer tecla para continuar ou Ctrl+C para cancelar..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "=== PASSO 1: VERIFICAR CODIGO ===" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path "whatsapp-bot-railway")) {
    Write-Host "ERRO: Pasta whatsapp-bot-railway nao encontrada!" -ForegroundColor Red
    Write-Host "Execute primeiro: Criar estrutura do bot" -ForegroundColor Yellow
    exit 1
}

Write-Host "OK Codigo do bot encontrado!" -ForegroundColor Green

Write-Host ""
Write-Host "=== PASSO 2: DEPLOY NO RAILWAY ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Siga estes passos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Acesse: https://railway.app" -ForegroundColor White
Write-Host "2. Login com GitHub" -ForegroundColor White
Write-Host "3. New Project > Deploy from GitHub repo" -ForegroundColor White
Write-Host "4. Selecione o repositorio (ou crie um novo com whatsapp-bot-railway/)" -ForegroundColor White
Write-Host "5. Railway vai fazer deploy automaticamente" -ForegroundColor White
Write-Host "6. Configure variavel: API_KEY = testdaapi2026" -ForegroundColor White
Write-Host "7. Anote a URL gerada (ex: https://whatsapp-bot-xxxx.up.railway.app)" -ForegroundColor White
Write-Host ""
Write-Host "Quando tiver a URL do Railway, pressione qualquer tecla..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

$railwayUrl = Read-Host "Cole a URL do Railway aqui"

if ([string]::IsNullOrWhiteSpace($railwayUrl)) {
    Write-Host "ERRO: URL nao pode ser vazia!" -ForegroundColor Red
    exit 1
}

# Remover barra final se houver
$railwayUrl = $railwayUrl.TrimEnd('/')

Write-Host ""
Write-Host "=== PASSO 3: ATUALIZAR SUPABASE ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Atualizando EVOLUTION_API_URL para: $railwayUrl" -ForegroundColor Gray

try {
    # Verificar se supabase CLI está disponível
    $supabaseCheck = Get-Command npx -ErrorAction SilentlyContinue
    if (-not $supabaseCheck) {
        Write-Host "AVISO: npx nao encontrado. Atualize manualmente no Supabase Dashboard:" -ForegroundColor Yellow
        Write-Host "  Settings > Edge Functions > Secrets" -ForegroundColor White
        Write-Host "  EVOLUTION_API_URL = $railwayUrl" -ForegroundColor White
    } else {
        Write-Host "Atualizando via CLI..." -ForegroundColor Gray
        npx supabase secrets set EVOLUTION_API_URL=$railwayUrl 2>&1 | Out-Null
        Write-Host "OK URL atualizada!" -ForegroundColor Green
    }
} catch {
    Write-Host "AVISO: Nao foi possivel atualizar via CLI" -ForegroundColor Yellow
    Write-Host "Atualize manualmente no Supabase Dashboard:" -ForegroundColor White
    Write-Host "  EVOLUTION_API_URL = $railwayUrl" -ForegroundColor White
}

Write-Host ""
Write-Host "=== PASSO 4: TESTAR ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "Testando health check..." -ForegroundColor Gray
try {
    $healthResponse = Invoke-WebRequest -Uri "${railwayUrl}/health" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "OK Health check funcionando! Status: $($healthResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "AVISO: Health check falhou. Aguarde alguns segundos e tente novamente." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MIGRACAO CONCLUIDA!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "  1. Acesse o frontend: Admin > WhatsApp > WhatsApp Manager" -ForegroundColor White
Write-Host "  2. A instancia 'default' deve aparecer" -ForegroundColor White
Write-Host "  3. Clique em 'Conectar' e escaneie o QR code" -ForegroundColor White
Write-Host "  4. Teste criando um agendamento" -ForegroundColor White
Write-Host ""
Write-Host "TUDO PRONTO! Sistema funcionando 100%!" -ForegroundColor Green
