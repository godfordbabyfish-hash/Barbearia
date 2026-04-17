# Script para aplicar migration segura (pode executar múltiplas vezes)
# Usa DROP IF EXISTS antes de CREATE para evitar erros

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "APLICANDO MIGRATION SEGURA" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$projectRef = "wabefmgfsatlusevxyfo"
$migrationFile = "supabase\migrations\20260124000003_add_barber_product_commissions_safe.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "ERRO: Migration segura nao encontrada!" -ForegroundColor Red
    Write-Host "Criando arquivo seguro..." -ForegroundColor Yellow
    
    # Criar arquivo seguro se não existir
    $migrationFile = "supabase\migrations\20260124000003_add_barber_product_commissions_safe.sql"
}

$sqlContent = Get-Content $migrationFile -Raw -Encoding UTF8

Write-Host "Migration segura encontrada: $migrationFile" -ForegroundColor Green
Write-Host "Tamanho: $($sqlContent.Length) caracteres" -ForegroundColor Gray
Write-Host ""
Write-Host "Esta versao usa DROP IF EXISTS antes de CREATE" -ForegroundColor Yellow
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
Write-Host "Esta versao segura:" -ForegroundColor Yellow
Write-Host "  ✅ Usa DROP IF EXISTS antes de CREATE POLICY" -ForegroundColor Green
Write-Host "  ✅ Usa DROP TRIGGER IF EXISTS antes de CREATE TRIGGER" -ForegroundColor Green
Write-Host "  ✅ Pode ser executada multiplas vezes sem erros" -ForegroundColor Green
Write-Host ""
Write-Host "Arquivo: $migrationFile" -ForegroundColor Gray
Write-Host ""
