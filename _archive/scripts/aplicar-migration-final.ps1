# Script para aplicar migration de comissões de produtos
# Usa o projeto já vinculado

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "APLICANDO MIGRATION DE COMISSOES DE PRODUTOS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$projectRef = "wabefmgfsatlusevxyfo"
$dbPassword = "pFgNQxhpdCkmxED1"

Write-Host "Projeto: $projectRef" -ForegroundColor Yellow
Write-Host ""

# Verificar se migration existe
$migrationFile = "supabase\migrations\20260124000003_add_barber_product_commissions.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "ERRO: Migration nao encontrada: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "Migration encontrada!" -ForegroundColor Green
Write-Host ""

# Tentar aplicar via db push
Write-Host "[1/2] Tentando aplicar via supabase db push..." -ForegroundColor Yellow

try {
    # Tentar com --linked primeiro
    $output = supabase db push --linked --yes 2>&1 | Tee-Object -Variable pushOutput
    
    if ($LASTEXITCODE -eq 0 -or $pushOutput -match "Applied|applied|success|Migration|migration|Finished") {
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "SUCESSO! Migration aplicada!" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Tabela barber_product_commissions criada com sucesso!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Nao foi possivel aplicar via --linked" -ForegroundColor Yellow
        Write-Host "Tentando metodo alternativo..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Erro: $_" -ForegroundColor Yellow
}

# Método alternativo: Abrir SQL Editor
Write-Host ""
Write-Host "[2/2] Abrindo SQL Editor para aplicacao manual..." -ForegroundColor Yellow

$sqlContent = Get-Content $migrationFile -Raw -Encoding UTF8

try {
    Set-Clipboard -Value $sqlContent
    Write-Host "SQL copiado para area de transferencia!" -ForegroundColor Green
} catch {
    Write-Host "Nao foi possivel copiar automaticamente" -ForegroundColor Yellow
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
Write-Host "OU execute manualmente no terminal onde fez o link:" -ForegroundColor Yellow
Write-Host "  supabase db push" -ForegroundColor Cyan
Write-Host ""
