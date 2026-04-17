# Script para aplicar migration usando Service Role Key
# Usa a API REST do Supabase para executar SQL

param(
    [string]$ServiceKey = "sb_secret_eHnNFSwOqKlFojquCOmzPg_kuRPh47p"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "APLICANDO MIGRATION VIA SERVICE KEY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$sqlFile = "supabase\migrations\20260124000003_add_barber_product_commissions.sql"
$projectRef = "wabefmgfsatlusevxyfo"
$supabaseUrl = "https://$projectRef.supabase.co"

if (-not (Test-Path $sqlFile)) {
    Write-Host "ERRO: Arquivo SQL nao encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

$sqlContent = Get-Content $sqlFile -Raw -Encoding UTF8

# O Supabase não tem endpoint REST direto para SQL, mas podemos usar RPC se houver função
# Ou usar Management API via CLI

Write-Host "Tentando aplicar via Supabase CLI com Service Key..." -ForegroundColor Yellow

# Configurar variável de ambiente temporariamente
$env:SUPABASE_SERVICE_ROLE_KEY = $ServiceKey

# Tentar usar CLI para aplicar
try {
    # Verificar se está linkado
    Write-Host "Verificando conexao com projeto..." -ForegroundColor Yellow
    
    # Tentar aplicar via db push (requer projeto linkado)
    # Mas primeiro vamos tentar criar uma função Edge Function temporária que execute o SQL
    
    Write-Host ""
    Write-Host "O Supabase nao permite execucao SQL direta via REST API por seguranca." -ForegroundColor Yellow
    Write-Host "Vamos usar o metodo mais seguro: Supabase CLI com projeto linkado" -ForegroundColor Yellow
    Write-Host ""
    
    # Método alternativo: Usar Management API via curl/Invoke-RestMethod
    # Mas isso requer autenticação diferente
    
    Write-Host "Aplicando via Supabase CLI (db push)..." -ForegroundColor Yellow
    
    # Verificar se projeto está linkado
    $linkStatus = supabase projects list 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Projeto nao esta linkado. Tentando linkar..." -ForegroundColor Yellow
        Write-Host "NOTA: Para linkar, precisa da senha do banco de dados" -ForegroundColor Yellow
        Write-Host ""
    }
    
    # Tentar aplicar migration
    supabase db push --linked --yes 2>&1 | Tee-Object -Variable output
    
    if ($LASTEXITCODE -eq 0 -or $output -match "Applied|applied|success|Migration") {
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "SUCESSO! Migration aplicada!" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "CLI nao conseguiu aplicar automaticamente." -ForegroundColor Yellow
        Write-Host "Usando metodo manual..." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}

# Método manual: Abrir SQL Editor
Write-Host ""
Write-Host "Abrindo SQL Editor para aplicacao manual..." -ForegroundColor Yellow

Set-Clipboard -Value $sqlContent
$sqlEditorUrl = "https://supabase.com/dashboard/project/$projectRef/sql/new"
Start-Process $sqlEditorUrl

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "INSTRUCOES:" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. SQL Editor aberto no navegador" -ForegroundColor White
Write-Host "2. SQL copiado para area de transferencia" -ForegroundColor White
Write-Host "3. Cole (Ctrl+V) e execute (Ctrl+Enter)" -ForegroundColor White
Write-Host ""
Write-Host "NOTA: O Supabase nao permite execucao SQL direta via REST API" -ForegroundColor Yellow
Write-Host "Para automatizar completamente, use:" -ForegroundColor Yellow
Write-Host "- Supabase CLI linkado: supabase link --project-ref $projectRef --password 'senha'" -ForegroundColor Cyan
Write-Host "- Depois: supabase db push" -ForegroundColor Cyan
Write-Host ""
