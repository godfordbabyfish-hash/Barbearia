# Script para aplicar migration de comissões de produtos
# Tenta métodos automáticos, se falhar, abre SQL Editor

param(
    [string]$DatabasePassword = ""
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

# Método 1: Tentar via Supabase CLI (db push)
Write-Host "[1/3] Tentando aplicar via Supabase CLI (db push)..." -ForegroundColor Yellow

try {
    # Verificar se está linkado
    $linkCheck = supabase projects list 2>&1
    if ($LASTEXITCODE -eq 0) {
        # Tentar linkar se necessário
        if ($DatabasePassword) {
            Write-Host "Linkando projeto..." -ForegroundColor Yellow
            supabase link --project-ref $projectRef --password $DatabasePassword --yes 2>&1 | Out-Null
        }
        
        # Aplicar migration
        Write-Host "Aplicando migration..." -ForegroundColor Yellow
        supabase db push --linked --yes 2>&1 | Tee-Object -Variable pushOutput
        
        if ($LASTEXITCODE -eq 0 -or $pushOutput -match "Applied|applied|success") {
            Write-Host ""
            Write-Host "============================================" -ForegroundColor Green
            Write-Host "SUCESSO! Migration aplicada via CLI!" -ForegroundColor Green
            Write-Host "============================================" -ForegroundColor Green
            exit 0
        }
    }
} catch {
    Write-Host "CLI nao disponivel ou erro: $_" -ForegroundColor Yellow
}

# Método 2: Tentar via API REST do Supabase (se tiver service key)
Write-Host ""
Write-Host "[2/3] Tentando via API REST..." -ForegroundColor Yellow

$serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY
if ($serviceKey) {
    try {
        $supabaseUrl = "https://$projectRef.supabase.co"
        $headers = @{
            "apikey" = $serviceKey
            "Authorization" = "Bearer $serviceKey"
            "Content-Type" = "application/json"
        }
        
        # Supabase não tem endpoint REST direto para SQL, mas podemos tentar via RPC se existir função
        Write-Host "API REST requer funcao customizada (nao disponivel)" -ForegroundColor Yellow
    } catch {
        Write-Host "Erro na API: $_" -ForegroundColor Yellow
    }
}

# Método 3: Abrir SQL Editor (sempre funciona)
Write-Host ""
Write-Host "[3/3] Abrindo SQL Editor (metodo manual)..." -ForegroundColor Yellow

Set-Clipboard -Value $sqlContent
$sqlEditorUrl = "https://supabase.com/dashboard/project/$projectRef/sql/new"
Start-Process $sqlEditorUrl

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "INSTRUCOES MANUAIS:" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. SQL Editor aberto no navegador" -ForegroundColor White
Write-Host "2. SQL copiado para area de transferencia" -ForegroundColor White
Write-Host "3. Cole (Ctrl+V) e execute (Ctrl+Enter)" -ForegroundColor White
Write-Host ""
Write-Host "Para automatizar completamente no futuro:" -ForegroundColor Yellow
Write-Host "- Configure SUPABASE_SERVICE_ROLE_KEY no ambiente" -ForegroundColor Cyan
Write-Host "- Ou forneca senha do banco: .\aplicar-migration-automatico.ps1 -DatabasePassword 'sua_senha'" -ForegroundColor Cyan
Write-Host ""
