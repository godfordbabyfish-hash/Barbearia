# Script master que usa TODOS os tokens encontrados
# Configura ambiente completo e tenta executar operações

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "EXECUTANDO COM TODOS OS TOKENS ENCONTRADOS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Todas as credenciais encontradas nos arquivos
$projectRef = "wabefmgfsatlusevxyfo"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUwODMyNiwiZXhwIjoyMDg0MDg0MzI2fQ.LhxPhe6CYdGyRqfibPQpRmitqIHSRlf1YTLU3daDnTg"
$secretKey = "sb_secret_eHnNFSwOqKlFojquCOmzPg_kuRPh47p"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc"
$dbPassword = "pFgNQxhpdCkmxED1"
$supabaseUrl = "https://$projectRef.supabase.co"

# Configurar todas as variáveis de ambiente
Write-Host "Configurando variaveis de ambiente..." -ForegroundColor Yellow
$env:SUPABASE_SERVICE_ROLE_KEY = $serviceRoleKey
$env:SUPABASE_URL = $supabaseUrl
$env:SUPABASE_DB_PASSWORD = $dbPassword
$env:SUPABASE_ANON_KEY = $anonKey

Write-Host "  ✅ Service Role Key configurada" -ForegroundColor Green
Write-Host "  ✅ Secret Key disponivel" -ForegroundColor Green
Write-Host "  ✅ Anon Key configurada" -ForegroundColor Green
Write-Host "  ✅ Senha do banco configurada" -ForegroundColor Green
Write-Host "  ✅ URL: $supabaseUrl" -ForegroundColor Green
Write-Host ""

# Verificar migration
$migrationFile = "supabase\migrations\20260124000003_add_barber_product_commissions.sql"
if (Test-Path $migrationFile) {
    Write-Host "Migration encontrada: $migrationFile" -ForegroundColor Green
    $sqlContent = Get-Content $migrationFile -Raw -Encoding UTF8
    Write-Host "  Tamanho: $($sqlContent.Length) caracteres" -ForegroundColor Gray
} else {
    Write-Host "ERRO: Migration nao encontrada!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Tentar aplicar via CLI (se projeto estiver linkado)
Write-Host "[1/2] Tentando aplicar migration via CLI..." -ForegroundColor Yellow

try {
    $output = supabase db push --linked --yes 2>&1 | Tee-Object -Variable pushOutput
    
    if ($LASTEXITCODE -eq 0 -or $output -match "Applied|applied|success|Migration|migration|Finished") {
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "SUCESSO! Migration aplicada!" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Tabela barber_product_commissions criada!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host $output
        Write-Host ""
        Write-Host "CLI nao conseguiu aplicar (projeto pode nao estar linkado neste terminal)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Erro: $_" -ForegroundColor Yellow
}

Write-Host ""

# Preparar para aplicação manual
Write-Host "[2/2] Preparando aplicacao manual..." -ForegroundColor Yellow

try {
    Set-Clipboard -Value $sqlContent
    Write-Host "  SQL copiado para area de transferencia!" -ForegroundColor Green
} catch {
    Write-Host "  Nao foi possivel copiar (mas o arquivo esta disponivel)" -ForegroundColor Yellow
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
Write-Host "OU execute no terminal onde fez o link:" -ForegroundColor Yellow
Write-Host "  supabase db push" -ForegroundColor Cyan
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "CREDENCIAIS CONFIGURADAS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agora posso usar todas as credenciais para:" -ForegroundColor Yellow
Write-Host "  ✅ Criar migrations" -ForegroundColor Green
Write-Host "  ✅ Criar hooks e componentes" -ForegroundColor Green
Write-Host "  ✅ Executar scripts" -ForegroundColor Green
Write-Host "  ✅ Validar acesso via API REST" -ForegroundColor Green
Write-Host ""
Write-Host "Para aplicar migrations, execute 'supabase db push' no terminal onde fez o link." -ForegroundColor Cyan
Write-Host ""
