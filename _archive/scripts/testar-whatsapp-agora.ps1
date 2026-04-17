# Script para Testar WhatsApp - Barbearia Raimundos
# Este script ajuda a verificar se o sistema WhatsApp está funcionando

Write-Host "🧪 Teste de Mensagens WhatsApp - Barbearia Raimundos" -ForegroundColor Cyan
Write-Host ""

# Verificar se Supabase CLI está instalado
Write-Host "1️⃣ Verificando Supabase CLI..." -ForegroundColor Yellow
try {
    $supabaseVersion = npx supabase --version 2>&1
    Write-Host "   ✅ Supabase CLI encontrado" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Supabase CLI não encontrado. Instale com: npm install -g supabase" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "2️⃣ Verificando Secrets do Supabase..." -ForegroundColor Yellow
Write-Host "   Executando: npx supabase secrets list" -ForegroundColor Gray
Write-Host ""

try {
    npx supabase secrets list
    Write-Host ""
    Write-Host "   ✅ Secrets verificados" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Erro ao verificar secrets. Verifique se está logado: npx supabase login" -ForegroundColor Red
}

Write-Host ""
Write-Host "3️⃣ Verificando Railway Bot..." -ForegroundColor Yellow
$railwayUrl = "https://whatsapp-bot-barbearia-production.up.railway.app"

try {
    $response = Invoke-WebRequest -Uri "$railwayUrl/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Railway bot está online" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️ Não foi possível verificar Railway bot. URL: $railwayUrl" -ForegroundColor Yellow
    Write-Host "   Verifique manualmente no dashboard do Railway" -ForegroundColor Gray
}

Write-Host ""
Write-Host "4️⃣ Próximos Passos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   📋 1. Acesse o painel admin: http://localhost:8080/admin" -ForegroundColor White
Write-Host "   📋 2. Vá em 'WhatsApp' no menu lateral" -ForegroundColor White
Write-Host "   📋 3. Verifique se está 'Conectado'" -ForegroundColor White
Write-Host "   📋 4. Se não estiver, clique em 'Conectar WhatsApp' e escaneie o QR code" -ForegroundColor White
Write-Host ""
Write-Host "   📋 5. Crie um agendamento de teste:" -ForegroundColor White
Write-Host "      - Acesse: http://localhost:8080" -ForegroundColor Gray
Write-Host "      - Clique em 'Agendar'" -ForegroundColor Gray
Write-Host "      - Preencha os dados (use cliente com telefone válido)" -ForegroundColor Gray
Write-Host "      - Confirme o agendamento" -ForegroundColor Gray
Write-Host ""
Write-Host "   📋 6. Verifique a fila de WhatsApp no Supabase:" -ForegroundColor White
Write-Host "      SQL: SELECT * FROM whatsapp_notifications_queue ORDER BY created_at DESC LIMIT 5;" -ForegroundColor Gray
Write-Host ""
Write-Host "   📋 7. Verifique se a mensagem chegou no WhatsApp" -ForegroundColor White
Write-Host ""
Write-Host "📖 Para mais detalhes, consulte: TESTE_WHATSAPP_COMPLETO.md" -ForegroundColor Cyan
Write-Host ""
