# Rodar process-queue da Edge Function whatsapp-notify
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RODAR FILA WHATSAPP (process-queue)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# URL do projeto Supabase
$supabaseUrl = "https://wabefmgfsatlusevxyfo.supabase.co"

# Usar a mesma publishable key (anon) que já está no projeto
$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc"

$headers = @{
  "apikey"        = $apiKey
  "Authorization" = "Bearer $apiKey"
  "Content-Type"  = "application/json"
}

$body = '{}'  # corpo vazio

$endpoint = "$supabaseUrl/functions/v1/whatsapp-notify/process-queue"

Write-Host "Chamando: $endpoint" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $endpoint -Method POST -Headers $headers -Body $body -TimeoutSec 90
    Write-Host ""
    Write-Host "Resposta da função:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5 | Write-Host
}
catch {
    Write-Host ""
    Write-Host "❌ ERRO ao chamar process-queue:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

