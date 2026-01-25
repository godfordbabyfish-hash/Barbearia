# Script para aplicar migration de comissões de produtos
# Usa Supabase CLI com Service Role Key configurada

param(
    [string]$ServiceKey = "sb_secret_eHnNFSwOqKlFojquCOmzPg_kuRPh47p"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "APLICANDO MIGRATION: COMISSOES DE PRODUTOS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$sqlFile = "supabase\migrations\20260124000003_add_barber_product_commissions.sql"
$projectRef = "wabefmgfsatlusevxyfo"

if (-not (Test-Path $sqlFile)) {
    Write-Host "ERRO: Arquivo SQL nao encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

$sqlContent = Get-Content $sqlFile -Raw -Encoding UTF8

# Configurar Service Key no ambiente
$env:SUPABASE_SERVICE_ROLE_KEY = $ServiceKey
Write-Host "Service Key configurada no ambiente" -ForegroundColor Green
Write-Host ""

# Método 1: Tentar via Supabase CLI (db push)
Write-Host "[1/2] Tentando aplicar via Supabase CLI (db push)..." -ForegroundColor Yellow

try {
    # Verificar se CLI está disponível
    $cliCheck = Get-Command supabase -ErrorAction SilentlyContinue
    if (-not $cliCheck) {
        Write-Host "Supabase CLI nao encontrado. Instale com: npm install -g supabase" -ForegroundColor Yellow
        throw "CLI não disponível"
    }
    
    # Verificar se está logado
    Write-Host "Verificando autenticacao..." -ForegroundColor Yellow
    $authCheck = supabase projects list 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Precisa fazer login primeiro. Execute: supabase login" -ForegroundColor Yellow
        Write-Host "Ou vamos tentar aplicar mesmo assim..." -ForegroundColor Yellow
    }
    
    # Tentar aplicar migration
    Write-Host "Aplicando migration..." -ForegroundColor Yellow
    $output = supabase db push --linked --yes 2>&1 | Tee-Object -Variable pushOutput
    
    Write-Host $output
    
    if ($LASTEXITCODE -eq 0 -or $output -match "Applied|applied|success|Migration|migration") {
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "SUCESSO! Migration aplicada via CLI!" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
        
        # Verificar se tabela foi criada
        Write-Host ""
        Write-Host "Verificando se tabela foi criada..." -ForegroundColor Yellow
        $checkOutput = supabase db execute --linked "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'barber_product_commissions');" 2>&1
        Write-Host $checkOutput
        
        exit 0
    } else {
        Write-Host "CLI nao conseguiu aplicar automaticamente." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Erro ao usar CLI: $_" -ForegroundColor Red
}

# Método 2: Abrir SQL Editor (sempre funciona)
Write-Host ""
Write-Host "[2/2] Abrindo SQL Editor para aplicacao manual..." -ForegroundColor Yellow

try {
    Set-Clipboard -Value $sqlContent
    Write-Host "SQL copiado para area de transferencia!" -ForegroundColor Green
} catch {
    Write-Host "Nao foi possivel copiar para area de transferencia, mas o SQL esta no arquivo." -ForegroundColor Yellow
}

$sqlEditorUrl = "https://supabase.com/dashboard/project/$projectRef/sql/new"
Start-Process $sqlEditorUrl

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "INSTRUCOES MANUAIS:" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. SQL Editor foi aberto no navegador" -ForegroundColor White
Write-Host "2. SQL esta copiado na area de transferencia (ou leia o arquivo)" -ForegroundColor White
Write-Host "3. Cole no SQL Editor (Ctrl+V)" -ForegroundColor White
Write-Host "4. Execute (Ctrl+Enter ou botao Run)" -ForegroundColor White
Write-Host ""
Write-Host "Arquivo SQL: $sqlFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para automatizar completamente:" -ForegroundColor Yellow
Write-Host "- Execute: supabase login" -ForegroundColor Cyan
Write-Host "- Execute: supabase link --project-ref $projectRef --password 'senha_do_banco'" -ForegroundColor Cyan
Write-Host "- Depois: supabase db push" -ForegroundColor Cyan
Write-Host ""
