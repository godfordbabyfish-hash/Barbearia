# Script para criar instância WhatsApp diretamente
Write-Host "🚀 Criando instância WhatsApp..." -ForegroundColor Cyan
Write-Host ""

$evolutionApiUrl = "https://evolution-api-production-228b.up.railway.app"
$apiKey = "testdapi2026"
$instanceName = "instance-1"

$headers = @{
    "Content-Type" = "application/json"
    "apikey" = $apiKey
}

$body = @{
    instanceName = $instanceName
    token = "token-instance-1-2026"
    qrcode = $true
} | ConvertTo-Json

Write-Host "Tentando criar instância '$instanceName'..." -ForegroundColor Yellow
Write-Host "URL: $evolutionApiUrl" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$evolutionApiUrl/instance/create" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "✅ Instância criada com sucesso!" -ForegroundColor Green
    Write-Host "Resposta:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5 | Write-Host
    Write-Host ""
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 409) {
        Write-Host "⚠️  A instância '$instanceName' já existe (isso é OK)" -ForegroundColor Yellow
        Write-Host ""
    } elseif ($statusCode -eq 403) {
        Write-Host "❌ ERRO 403: Acesso negado" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possíveis causas:" -ForegroundColor Yellow
        Write-Host "1. API Key incorreta: '$apiKey'" -ForegroundColor White
        Write-Host "2. URL incorreta: '$evolutionApiUrl'" -ForegroundColor White
        Write-Host "3. A Evolution API mudou a forma de autenticação" -ForegroundColor White
        Write-Host ""
        Write-Host "Verifique os logs da Evolution API no Railway para mais detalhes." -ForegroundColor Yellow
        Write-Host ""
        
        # Tentar obter mais detalhes do erro
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Detalhes do erro:" -ForegroundColor Red
            Write-Host $errorBody -ForegroundColor Gray
        } catch {
            Write-Host "Não foi possível obter detalhes do erro" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Erro ao criar instância:" -ForegroundColor Red
        Write-Host "Status: $statusCode" -ForegroundColor Red
        Write-Host "Mensagem: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
}

Write-Host ""
Write-Host "✅ Script concluído!" -ForegroundColor Green
