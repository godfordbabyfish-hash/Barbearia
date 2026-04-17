# Script para verificar e finalizar a configuração do reminder

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "VERIFICAR E FINALIZAR CONFIGURACAO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# SQL final para garantir que o cron job está configurado
$finalSQL = @"
-- Garantir que o cron job está configurado
SELECT cron.unschedule('whatsapp-reminder-every-minute');

SELECT cron.schedule(
  'whatsapp-reminder-every-minute',
  '* * * * *',
  'SELECT invoke_whatsapp_reminder();'
);

-- Verificar se foi criado
SELECT * FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute';
"@

$tempFile = "temp-finalizar-$(Get-Date -Format 'yyyyMMddHHmmss').sql"
$finalSQL | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "SQL final criado: $tempFile" -ForegroundColor Green
Write-Host ""
Write-Host "Para finalizar a configuracao:" -ForegroundColor Yellow
Write-Host "1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new" -ForegroundColor White
Write-Host "2. Execute o SQL abaixo (ou do arquivo $tempFile):" -ForegroundColor White
Write-Host ""
Write-Host $finalSQL -ForegroundColor Cyan
Write-Host ""

$abrirArquivo = Read-Host "Deseja abrir o arquivo SQL? (S/N) [S]"
if ($abrirArquivo -ne 'N' -and $abrirArquivo -ne 'n') {
    notepad $tempFile
}

Write-Host ""
Write-Host "Pronto! Execute o SQL no Supabase SQL Editor para finalizar." -ForegroundColor Green
