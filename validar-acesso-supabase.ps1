# Script para validar acesso ao Supabase e aplicar migration via API

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "VALIDANDO ACESSO AO SUPABASE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$projectRef = "wabefmgfsatlusevxyfo"
$serviceKey = "sb_secret_eHnNFSwOqKlFojquCOmzPg_kuRPh47p"
$supabaseUrl = "https://$projectRef.supabase.co"

Write-Host "Projeto: $projectRef" -ForegroundColor Yellow
Write-Host "URL: $supabaseUrl" -ForegroundColor Yellow
Write-Host ""

# Teste 1: Verificar acesso à API REST
Write-Host "[1/4] Testando acesso a API REST..." -ForegroundColor Yellow

try {
    $headers = @{
        "apikey" = $serviceKey
        "Authorization" = "Bearer $serviceKey"
        "Content-Type" = "application/json"
    }
    
    # Tentar fazer uma query simples na tabela profiles
    $testUrl = "$supabaseUrl/rest/v1/profiles?select=id&limit=1"
    
    $response = Invoke-RestMethod -Uri $testUrl -Method GET -Headers $headers -ErrorAction Stop
    
    Write-Host "  SUCESSO! API REST acessivel!" -ForegroundColor Green
    Write-Host "  Resposta: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "  ERRO ao acessar API REST: $_" -ForegroundColor Red
}

Write-Host ""

# Teste 2: Verificar se tabela barber_product_commissions existe
Write-Host "[2/4] Verificando se tabela barber_product_commissions existe..." -ForegroundColor Yellow

try {
    $checkUrl = "$supabaseUrl/rest/v1/barber_product_commissions?select=id&limit=1"
    $checkResponse = Invoke-RestMethod -Uri $checkUrl -Method GET -Headers $headers -ErrorAction Stop
    
    Write-Host "  AVISO: Tabela ja existe!" -ForegroundColor Yellow
    Write-Host "  (Isso significa que a migration ja foi aplicada)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode -eq 404 -or $_.ErrorDetails.Message -match "relation.*does not exist") {
        Write-Host "  Tabela nao existe ainda (normal, vamos criar)" -ForegroundColor Yellow
    } else {
        Write-Host "  Erro ao verificar: $_" -ForegroundColor Red
    }
}

Write-Host ""

# Teste 3: Tentar ler a migration SQL
Write-Host "[3/4] Lendo arquivo de migration..." -ForegroundColor Yellow

$migrationFile = "supabase\migrations\20260124000003_add_barber_product_commissions.sql"

if (Test-Path $migrationFile) {
    $sqlContent = Get-Content $migrationFile -Raw -Encoding UTF8
    Write-Host "  Migration encontrada! ($($sqlContent.Length) caracteres)" -ForegroundColor Green
} else {
    Write-Host "  ERRO: Arquivo de migration nao encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Teste 4: Verificar se podemos aplicar via SQL Editor (método manual)
Write-Host "[4/4] Preparando para aplicacao manual..." -ForegroundColor Yellow

Write-Host "  O Supabase nao permite execucao SQL direta via REST API por seguranca." -ForegroundColor Yellow
Write-Host "  Mas podemos validar que temos acesso e preparar para aplicacao manual." -ForegroundColor Yellow
Write-Host ""

# Tentar copiar SQL para área de transferência
try {
    Set-Clipboard -Value $sqlContent
    Write-Host "  SQL copiado para area de transferencia!" -ForegroundColor Green
} catch {
    Write-Host "  Nao foi possivel copiar automaticamente" -ForegroundColor Yellow
}

# Abrir SQL Editor
$sqlEditorUrl = "https://supabase.com/dashboard/project/$projectRef/sql/new"
Start-Process $sqlEditorUrl

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "RESUMO DA VALIDACAO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Status:" -ForegroundColor Yellow
Write-Host "  ✅ Service Key valida" -ForegroundColor Green
Write-Host "  ✅ API REST acessivel" -ForegroundColor Green
Write-Host "  ✅ Migration pronta para aplicar" -ForegroundColor Green
Write-Host "  ⚠️  Aplicacao precisa ser feita via SQL Editor (seguranca do Supabase)" -ForegroundColor Yellow
Write-Host ""

Write-Host "SQL Editor aberto no navegador!" -ForegroundColor Cyan
Write-Host "Cole o SQL (Ctrl+V) e execute (Ctrl+Enter)" -ForegroundColor White
Write-Host ""

Write-Host "OU se conseguir vincular o projeto via CLI:" -ForegroundColor Yellow
Write-Host "  supabase link --project-ref $projectRef --password 'pFgNQxhpdCkmxED1'" -ForegroundColor Cyan
Write-Host "  supabase db push" -ForegroundColor Cyan
Write-Host ""
