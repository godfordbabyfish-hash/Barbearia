# Script para aplicar a política RLS que permite barbeiros solicitarem vales

Write-Host "🔧 Aplicando política RLS para barbeiros solicitarem vales..." -ForegroundColor Cyan

# Verificar se supabase CLI está instalado
$supabaseCheck = supabase --version 2>$null
if (-not $supabaseCheck) {
    Write-Host "❌ Supabase CLI não está instalado" -ForegroundColor Red
    Write-Host "Instale com: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Executar o SQL
Write-Host "📝 Executando SQL..." -ForegroundColor Cyan
supabase db push --dry-run

Write-Host ""
Write-Host "✅ Para aplicar as mudanças, execute:" -ForegroundColor Green
Write-Host "supabase db push" -ForegroundColor Yellow

Write-Host ""
Write-Host "Ou execute o SQL diretamente no Supabase Dashboard:" -ForegroundColor Cyan
Write-Host "1. Vá para SQL Editor" -ForegroundColor Gray
Write-Host "2. Cole o conteúdo de 'aplicar-rls-barber-advances.sql'" -ForegroundColor Gray
Write-Host "3. Execute" -ForegroundColor Gray
