# Script para abrir SQL Editor e aplicar migration WhatsApp

Write-Host "Preparando para aplicar migration WhatsApp..." -ForegroundColor Cyan
Write-Host ""

# Ler o arquivo SQL
$sqlFile = "APLICAR_MIGRATION_DIRETO.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "Arquivo nao encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

# Ler conteudo
$sqlContent = Get-Content $sqlFile -Raw

# Copiar para area de transferencia
Set-Clipboard -Value $sqlContent
Write-Host "SQL copiado para area de transferencia!" -ForegroundColor Green
Write-Host ""

# Abrir navegador no SQL Editor
$sqlEditorUrl = "https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new"
Write-Host "Abrindo SQL Editor no navegador..." -ForegroundColor Yellow
Start-Process $sqlEditorUrl

Write-Host ""
Write-Host "INSTRUCOES:" -ForegroundColor Cyan
Write-Host "1. O SQL Editor foi aberto no navegador" -ForegroundColor White
Write-Host "2. O SQL ja esta copiado na area de transferencia" -ForegroundColor White
Write-Host "3. Cole no SQL Editor (Ctrl+V)" -ForegroundColor White
Write-Host "4. Clique em Run ou pressione Ctrl+Enter" -ForegroundColor White
Write-Host "5. Aguarde a execucao" -ForegroundColor White
Write-Host ""
Write-Host "Apos executar, verifique se a tabela whatsapp_notifications_queue foi criada!" -ForegroundColor Green
