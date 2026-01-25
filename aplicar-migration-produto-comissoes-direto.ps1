# Script para aplicar apenas a migration de comissões de produtos
# Usa SQL direto via Supabase Management API

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "APLICANDO MIGRATION DE COMISSOES DE PRODUTOS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$projectRef = "wabefmgfsatlusevxyfo"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUwODMyNiwiZXhwIjoyMDg0MDg0MzI2fQ.LhxPhe6CYdGyRqfibPQpRmitqIHSRlf1YTLU3daDnTg"
$supabaseUrl = "https://$projectRef.supabase.co"

# Ler SQL da migration
$migrationFile = "supabase\migrations\20260124000003_add_barber_product_commissions.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "ERRO: Migration nao encontrada!" -ForegroundColor Red
    exit 1
}

$sqlContent = Get-Content $migrationFile -Raw -Encoding UTF8

Write-Host "Migration encontrada: $migrationFile" -ForegroundColor Green
Write-Host "Tamanho: $($sqlContent.Length) caracteres" -ForegroundColor Gray
Write-Host ""

# Verificar se tabela já existe
Write-Host "Verificando se tabela ja existe..." -ForegroundColor Yellow

$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
}

try {
    $checkUrl = "$supabaseUrl/rest/v1/barber_product_commissions?select=id&limit=1"
    $response = Invoke-RestMethod -Uri $checkUrl -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "  ✅ Tabela ja existe! Migration ja foi aplicada." -ForegroundColor Green
    Write-Host ""
    Write-Host "Nada a fazer!" -ForegroundColor Green
    exit 0
} catch {
    if ($_.Exception.Response.StatusCode -eq 404 -or $_.ErrorDetails.Message -match "relation.*does not exist|does not exist") {
        Write-Host "  Tabela nao existe - vamos criar" -ForegroundColor Yellow
    } else {
        Write-Host "  Erro ao verificar: $_" -ForegroundColor Yellow
        Write-Host "  Continuando mesmo assim..." -ForegroundColor Gray
    }
}

Write-Host ""

# Abrir SQL Editor com o SQL copiado
Write-Host "Preparando aplicacao via SQL Editor..." -ForegroundColor Yellow

try {
    Set-Clipboard -Value $sqlContent
    Write-Host "  ✅ SQL copiado para area de transferencia!" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️ Nao foi possivel copiar automaticamente" -ForegroundColor Yellow
}

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
Write-Host "OU execute via CLI (se conseguir resolver conflitos):" -ForegroundColor Yellow
Write-Host "  supabase migration repair" -ForegroundColor Cyan
Write-Host "  supabase db push --linked" -ForegroundColor Cyan
Write-Host ""
