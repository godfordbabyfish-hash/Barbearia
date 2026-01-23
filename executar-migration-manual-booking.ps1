# Script para executar a migration de agendamentos retroativos no Supabase
# Copia o SQL para a área de transferência e abre o SQL Editor

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "EXECUTANDO MIGRATION: AGENDAMENTOS RETROATIVOS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Caminho do arquivo SQL
$sqlFile = "supabase\migrations\20260124000000_add_manual_booking_type.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "ERRO: Arquivo SQL nao encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "Lendo arquivo SQL..." -ForegroundColor Yellow
$sqlContent = Get-Content $sqlFile -Raw -Encoding UTF8

# Copiar para área de transferência
Write-Host "Copiando SQL para area de transferencia..." -ForegroundColor Yellow
Set-Clipboard -Value $sqlContent
Write-Host "SQL copiado com sucesso!" -ForegroundColor Green
Write-Host ""

# Abrir SQL Editor no navegador
$projectId = "wabefmgfsatlusevxyfo"
$sqlEditorUrl = "https://supabase.com/dashboard/project/$projectId/sql/new"
Write-Host "Abrindo SQL Editor no navegador..." -ForegroundColor Yellow
Start-Process $sqlEditorUrl

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "INSTRUCOES:" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. O SQL Editor foi aberto no navegador" -ForegroundColor White
Write-Host "2. O SQL ja esta copiado na area de transferencia" -ForegroundColor White
Write-Host "3. Cole no SQL Editor (Ctrl+V)" -ForegroundColor White
Write-Host "4. Clique em 'Run' ou pressione Ctrl+Enter" -ForegroundColor White
Write-Host "5. Aguarde a execucao e verifique se nao houve erros" -ForegroundColor White
Write-Host ""
Write-Host "SQL que sera executado:" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host $sqlContent -ForegroundColor White
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "Apos executar, verifique se a constraint foi atualizada:" -ForegroundColor Green
Write-Host "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'appointments'::regclass AND conname = 'appointments_booking_type_check';" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pronto!" -ForegroundColor Green
