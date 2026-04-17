# Script final para executar o SQL do reminder
# Usa a Supabase Management API para executar SQL diretamente

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "EXECUTANDO SQL DO LEMBRETE - FINAL" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Chamar a Edge Function que criamos
$supabaseUrl = "https://wabefmgfsatlusevxyfo.supabase.co"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc"
$functionUrl = "$supabaseUrl/functions/v1/setup-reminder-cron"

Write-Host "Chamando Edge Function setup-reminder-cron..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $functionUrl -Method POST -Headers @{
        "Content-Type" = "application/json"
        "apikey" = $anonKey
        "Authorization" = "Bearer $anonKey"
    } -ErrorAction Stop

    Write-Host ""
    Write-Host "Resposta da Edge Function:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host

    if ($response.success) {
        Write-Host ""
        Write-Host "SUCESSO! Configuracao concluida!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "A Edge Function retornou SQL para execucao manual:" -ForegroundColor Yellow
        if ($response.sql) {
            Write-Host ""
            Write-Host "SQL para executar:" -ForegroundColor Cyan
            Write-Host $response.sql -ForegroundColor White
            Write-Host ""
            Write-Host "Execute este SQL em: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host ""
    Write-Host "ERRO ao chamar Edge Function: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Execute o SQL manualmente:" -ForegroundColor Yellow
    Write-Host "1. Abra: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new" -ForegroundColor White
    Write-Host "2. Abra o arquivo EXECUTAR_AGORA_REMINDER.sql" -ForegroundColor White
    Write-Host "3. Obtenha sua SERVICE_ROLE_KEY em: Settings > API > service_role key" -ForegroundColor White
    Write-Host "4. Substitua 'YOUR_SERVICE_ROLE_KEY' pela sua chave real" -ForegroundColor White
    Write-Host "5. Execute o SQL" -ForegroundColor White
}

Write-Host ""
Write-Host "Pronto!" -ForegroundColor Green
