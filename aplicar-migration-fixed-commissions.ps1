# Script para aplicar migration de comissões fixas
# Resolve o erro 404 da tabela barber_fixed_commissions

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "APLICANDO MIGRATION DE COMISSOES FIXAS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$projectRef = "wabefmgfsatlusevxyfo"
$migrationFile = "supabase\migrations\20260122000000_modify_commissions_fixed_percentage_safe.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "ERRO: Migration segura nao encontrada!" -ForegroundColor Red
    exit 1
}

$sqlContent = Get-Content $migrationFile -Raw -Encoding UTF8

Write-Host "Migration segura encontrada: $migrationFile" -ForegroundColor Green
Write-Host "Tamanho: $($sqlContent.Length) caracteres" -ForegroundColor Gray
Write-Host ""
Write-Host "Esta versao cria a tabela barber_fixed_commissions" -ForegroundColor Yellow
Write-Host "Pode ser executada multiplas vezes sem erros!" -ForegroundColor Green
Write-Host ""

# Tentar copiar para clipboard
try {
    Set-Clipboard -Value $sqlContent
    Write-Host "✅ SQL copiado para area de transferencia!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Nao foi possivel copiar automaticamente" -ForegroundColor Yellow
    Write-Host "   Mas o arquivo esta disponivel: $migrationFile" -ForegroundColor Gray
}

# Abrir SQL Editor
$sqlEditorUrl = "https://supabase.com/dashboard/project/$projectRef/sql/new"
Start-Process $sqlEditorUrl

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "INSTRUCOES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "SQL Editor aberto no navegador!" -ForegroundColor Green
Write-Host ""
Write-Host "1. Cole o SQL (Ctrl+V)" -ForegroundColor White
Write-Host "2. Execute (Ctrl+Enter)" -ForegroundColor White
Write-Host "3. Verifique se nao houve erros" -ForegroundColor White
Write-Host ""
Write-Host "Esta migration cria:" -ForegroundColor Yellow
Write-Host "  ✅ Tabela barber_fixed_commissions" -ForegroundColor Green
Write-Host "  ✅ Policies RLS configuradas" -ForegroundColor Green
Write-Host "  ✅ Trigger para updated_at" -ForegroundColor Green
Write-Host "  ✅ Registros iniciais para barbeiros existentes" -ForegroundColor Green
Write-Host ""
Write-Host "Arquivo: $migrationFile" -ForegroundColor Gray
Write-Host ""
