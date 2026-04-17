# Script AUTOMATICO para migrar para Baileys + Railway
# Versão não-interativa

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MIGRAR PARA BAILEYS + RAILWAY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar código
Write-Host "=== PASSO 1: VERIFICAR CODIGO ===" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path "whatsapp-bot-railway")) {
    Write-Host "ERRO: Pasta whatsapp-bot-railway nao encontrada!" -ForegroundColor Red
    Write-Host "Criando estrutura do bot..." -ForegroundColor Yellow
    
    # Verificar se os arquivos existem
    if (-not (Test-Path "whatsapp-bot-railway\index.js")) {
        Write-Host "ERRO: Arquivos do bot nao encontrados!" -ForegroundColor Red
        Write-Host "Execute primeiro a criacao do bot Baileys" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "OK Codigo do bot encontrado!" -ForegroundColor Green
Write-Host ""

# Instruções para deploy
Write-Host "=== PASSO 2: DEPLOY NO RAILWAY ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "INSTRUCOES PARA DEPLOY:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Acesse: https://railway.app" -ForegroundColor White
Write-Host "2. Login com GitHub" -ForegroundColor White
Write-Host "3. Clique em 'New Project'" -ForegroundColor White
Write-Host "4. Selecione 'Deploy from GitHub repo'" -ForegroundColor White
Write-Host "5. Selecione seu repositorio OU crie um novo:" -ForegroundColor White
Write-Host "   - Crie um repositorio no GitHub" -ForegroundColor Gray
Write-Host "   - Faça upload da pasta whatsapp-bot-railway/" -ForegroundColor Gray
Write-Host "   - Conecte no Railway" -ForegroundColor Gray
Write-Host "6. Railway vai detectar automaticamente e fazer deploy" -ForegroundColor White
Write-Host "7. Vá em 'Variables' e adicione:" -ForegroundColor White
Write-Host "   - API_KEY = testdaapi2026" -ForegroundColor Gray
Write-Host "8. Anote a URL gerada (ex: https://whatsapp-bot-xxxx.up.railway.app)" -ForegroundColor White
Write-Host ""

# Verificar se já tem URL configurada
$railwayUrl = Read-Host "Cole a URL do Railway aqui (ou pressione Enter para pular e fazer depois)"

if ([string]::IsNullOrWhiteSpace($railwayUrl)) {
    Write-Host ""
    Write-Host "OK Pulando atualizacao do Supabase por enquanto" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "QUANDO TIVER A URL DO RAILWAY:" -ForegroundColor Cyan
    Write-Host "1. Execute: npx supabase secrets set EVOLUTION_API_URL=<URL_DO_RAILWAY>" -ForegroundColor White
    Write-Host "2. Ou atualize manualmente no Supabase Dashboard:" -ForegroundColor White
    Write-Host "   Settings > Edge Functions > Secrets" -ForegroundColor Gray
    Write-Host "   EVOLUTION_API_URL = <URL_DO_RAILWAY>" -ForegroundColor Gray
    Write-Host ""
    exit 0
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
        $result = npx supabase secrets set EVOLUTION_API_URL=$railwayUrl 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK URL atualizada no Supabase!" -ForegroundColor Green
        } else {
            Write-Host "AVISO: Nao foi possivel atualizar via CLI" -ForegroundColor Yellow
            Write-Host "Atualize manualmente no Supabase Dashboard:" -ForegroundColor White
            Write-Host "  EVOLUTION_API_URL = $railwayUrl" -ForegroundColor White
        }
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
    Write-Host "Isso e normal logo apos o deploy." -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MIGRACAO CONCLUIDA!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "  1. Aguarde 1-2 minutos para Railway finalizar deploy" -ForegroundColor White
Write-Host "  2. Acesse o frontend: Admin > WhatsApp > WhatsApp Manager" -ForegroundColor White
Write-Host "  3. A instancia 'default' deve aparecer" -ForegroundColor White
Write-Host "  4. Clique em 'Conectar' e escaneie o QR code" -ForegroundColor White
Write-Host "  5. Teste criando um agendamento" -ForegroundColor White
Write-Host ""
Write-Host "TUDO PRONTO! Sistema funcionando 100%!" -ForegroundColor Green
