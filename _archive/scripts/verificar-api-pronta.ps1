# Script para verificar se a Evolution API esta pronta

Write-Host "=== VERIFICANDO EVOLUTION API ===" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "https://evolution-api-barbearia.fly.dev"
$maxAttempts = 20
$attempt = 0
$ready = $false

Write-Host "Aguardando API inicializar..." -ForegroundColor Yellow
Write-Host ""

while ($attempt -lt $maxAttempts -and -not $ready) {
    $attempt++
    Write-Host "Tentativa $attempt de $maxAttempts..." -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        Write-Host ""
        Write-Host "OK API esta funcionando! Status: $($response.StatusCode)" -ForegroundColor Green
        $ready = $true
        break
    } catch {
        Write-Host "  API ainda nao esta respondendo..." -ForegroundColor Yellow
        
        if ($attempt -lt $maxAttempts) {
            Write-Host "  Aguardando 15 segundos antes da proxima tentativa..." -ForegroundColor Gray
            Start-Sleep -Seconds 15
        }
    }
}

if (-not $ready) {
    Write-Host ""
    Write-Host "AVISO: API ainda nao esta respondendo apos $maxAttempts tentativas." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "POSSIVEIS SOLUCOES:" -ForegroundColor Cyan
    Write-Host "  1. Verifique os logs: fly logs --app evolution-api-barbearia" -ForegroundColor White
    Write-Host "  2. Reinicie a API: fly machines restart --app evolution-api-barbearia" -ForegroundColor White
    Write-Host "  3. Aguarde mais alguns minutos e tente novamente" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "=== API PRONTA! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Agora voce pode:" -ForegroundColor Cyan
    Write-Host "  1. Recarregar a pagina do painel admin" -ForegroundColor White
    Write-Host "  2. A instancia WhatsApp sera criada automaticamente" -ForegroundColor White
    Write-Host "  3. O QR code aparecera automaticamente" -ForegroundColor White
}
