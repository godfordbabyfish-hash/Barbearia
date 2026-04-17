# Script para aplicar a política RLS via API do Supabase

$projectId = "wabefmgfsatlusevxyfo"
$supabaseUrl = "https://$projectId.supabase.co"

# Ler o arquivo SQL
$sqlContent = Get-Content "aplicar-rls-barber-advances.sql" -Raw

Write-Host "🔧 Aplicando política RLS para barbeiros solicitarem vales..." -ForegroundColor Cyan
Write-Host ""

# Tentar obter o token do arquivo .env ou variável de ambiente
$envFile = ".env"
$token = $null

if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match 'SUPABASE_SERVICE_ROLE_KEY=(.+)') {
        $token = $matches[1].Trim()
    }
}

if (-not $token) {
    $token = $env:SUPABASE_SERVICE_ROLE_KEY
}

if (-not $token) {
    Write-Host "❌ Token não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Opções:" -ForegroundColor Yellow
    Write-Host "1. Adicione SUPABASE_SERVICE_ROLE_KEY ao .env" -ForegroundColor Cyan
    Write-Host "2. Ou execute manualmente no Supabase Dashboard:" -ForegroundColor Cyan
    Write-Host "   https://app.supabase.com/project/$projectId/sql/new" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "SQL a executar:" -ForegroundColor Yellow
    Write-Host $sqlContent -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Token encontrado" -ForegroundColor Green
Write-Host ""

# Executar o SQL via API
try {
    Write-Host "📡 Enviando SQL para o Supabase..." -ForegroundColor Cyan
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
        "apikey" = "<REMOVIDO_ROTACIONAR_CHAVE_SUPABASE>"
    }
    
    $body = @{
        query = $sqlContent
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/rpc/sql" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "✅ Política RLS aplicada com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Resposta:" -ForegroundColor Cyan
    Write-Host $response.Content -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Erro ao executar SQL:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Tente executar manualmente:" -ForegroundColor Yellow
    Write-Host "https://app.supabase.com/project/$projectId/sql/new" -ForegroundColor Cyan
    exit 1
}
