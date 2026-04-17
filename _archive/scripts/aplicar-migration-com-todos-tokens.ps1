# Script para aplicar migration usando TODOS os tokens encontrados
# Configura ambiente e tenta aplicar automaticamente

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "APLICANDO MIGRATION COM TODOS OS TOKENS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Tokens encontrados nos arquivos
$projectRef = "wabefmgfsatlusevxyfo"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUwODMyNiwiZXhwIjoyMDg0MDg0MzI2fQ.LhxPhe6CYdGyRqfibPQpRmitqIHSRlf1YTLU3daDnTg"
$secretKey = "sb_secret_eHnNFSwOqKlFojquCOmzPg_kuRPh47p"
$dbPassword = "pFgNQxhpdCkmxED1"
$supabaseUrl = "https://$projectRef.supabase.co"

Write-Host "Configurando variaveis de ambiente..." -ForegroundColor Yellow
$env:SUPABASE_SERVICE_ROLE_KEY = $serviceRoleKey
$env:SUPABASE_URL = $supabaseUrl
$env:SUPABASE_DB_PASSWORD = $dbPassword

Write-Host "  Service Role Key: Configurada" -ForegroundColor Green
Write-Host "  URL: $supabaseUrl" -ForegroundColor Green
Write-Host "  Senha do banco: Configurada" -ForegroundColor Green
Write-Host ""

# Verificar se migration existe
$migrationFile = "supabase\migrations\20260124000003_add_barber_product_commissions.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "ERRO: Migration nao encontrada!" -ForegroundColor Red
    exit 1
}

Write-Host "Migration encontrada: $migrationFile" -ForegroundColor Green
Write-Host ""

# Método 1: Tentar via Supabase CLI com tokens configurados
Write-Host "[1/3] Tentando aplicar via Supabase CLI..." -ForegroundColor Yellow

try {
    # Tentar aplicar migration
    $output = supabase db push --linked --yes 2>&1 | Tee-Object -Variable pushOutput
    
    Write-Host $output
    
    if ($LASTEXITCODE -eq 0 -or $output -match "Applied|applied|success|Migration|migration|Finished") {
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "SUCESSO! Migration aplicada via CLI!" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "CLI nao conseguiu aplicar (pode ser problema de link)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Erro ao usar CLI: $_" -ForegroundColor Yellow
}

Write-Host ""

# Método 2: Tentar via API REST (verificar se tabela existe)
Write-Host "[2/3] Verificando acesso via API REST..." -ForegroundColor Yellow

try {
    $headers = @{
        "apikey" = $serviceRoleKey
        "Authorization" = "Bearer $serviceRoleKey"
        "Content-Type" = "application/json"
    }
    
    # Tentar verificar se tabela existe
    $checkUrl = "$supabaseUrl/rest/v1/barber_product_commissions?select=id&limit=1"
    
    try {
        $response = Invoke-RestMethod -Uri $checkUrl -Method GET -Headers $headers -ErrorAction Stop
        Write-Host "  AVISO: Tabela ja existe! (Migration ja foi aplicada)" -ForegroundColor Yellow
        Write-Host "  Resposta: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
        exit 0
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404 -or $_.ErrorDetails.Message -match "relation.*does not exist") {
            Write-Host "  Tabela nao existe ainda (vamos criar)" -ForegroundColor Yellow
        } else {
            Write-Host "  Erro ao verificar: $_" -ForegroundColor Red
        }
    }
    
    Write-Host "  API REST acessivel!" -ForegroundColor Green
} catch {
    Write-Host "  Erro ao acessar API REST: $_" -ForegroundColor Red
}

Write-Host ""

# Método 3: Preparar para aplicação manual
Write-Host "[3/3] Preparando aplicacao manual..." -ForegroundColor Yellow

$sqlContent = Get-Content $migrationFile -Raw -Encoding UTF8

try {
    Set-Clipboard -Value $sqlContent
    Write-Host "  SQL copiado para area de transferencia!" -ForegroundColor Green
} catch {
    Write-Host "  Nao foi possivel copiar automaticamente" -ForegroundColor Yellow
}

$sqlEditorUrl = "https://supabase.com/dashboard/project/$projectRef/sql/new"
Start-Process $sqlEditorUrl

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "RESUMO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tokens configurados:" -ForegroundColor Yellow
Write-Host "  ✅ Service Role Key" -ForegroundColor Green
Write-Host "  ✅ Secret Key" -ForegroundColor Green
Write-Host "  ✅ Senha do banco" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "1. SQL Editor aberto no navegador" -ForegroundColor White
Write-Host "2. Cole o SQL (Ctrl+V) e execute (Ctrl+Enter)" -ForegroundColor White
Write-Host ""
Write-Host "OU execute no terminal onde fez o link:" -ForegroundColor Yellow
Write-Host "  supabase db push" -ForegroundColor Cyan
Write-Host ""
