# Script para executar a correção do usuário João para Welton Douglas

Write-Host "🔧 Executando correção do usuário João para Welton Douglas..." -ForegroundColor Yellow

# Verificar se o arquivo SQL existe
if (-not (Test-Path "corrigir-joao-simples.sql")) {
    Write-Host "❌ Arquivo corrigir-joao-simples.sql não encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Conteúdo do SQL que será executado:" -ForegroundColor Cyan
Get-Content "corrigir-joao-simples.sql" | Write-Host

Write-Host "`n🚀 Para executar este SQL:" -ForegroundColor Green
Write-Host "1. Abra o Supabase Dashboard" -ForegroundColor White
Write-Host "2. Vá para SQL Editor" -ForegroundColor White
Write-Host "3. Cole o conteúdo do arquivo corrigir-joao-simples.sql" -ForegroundColor White
Write-Host "4. Execute o SQL" -ForegroundColor White

Write-Host "`n📁 Ou use o arquivo completo:" -ForegroundColor Green
Write-Host "   atualizar-welton-completo.sql" -ForegroundColor White

Write-Host "`n✅ Após executar, o usuário João será renomeado para Welton Douglas" -ForegroundColor Green