# Script para aplicar migration de comissões de produtos automaticamente
# Tenta usar Supabase CLI, se não disponível, abre SQL Editor

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "APLICANDO MIGRATION: COMISSOES DE PRODUTOS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Caminho do arquivo SQL
$sqlFile = "supabase\migrations\20260124000003_add_barber_product_commissions.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "ERRO: Arquivo SQL nao encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "Lendo arquivo SQL..." -ForegroundColor Yellow
$sqlContent = Get-Content $sqlFile -Raw -Encoding UTF8

# Tentar usar Supabase CLI
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue

if ($supabaseCli) {
    Write-Host "Supabase CLI encontrado! Tentando aplicar migration..." -ForegroundColor Green
    Write-Host ""
    
    # Verificar se está logado
    $projectId = "wabefmgfsatlusevxyfo"
    
    try {
        # Tentar aplicar via CLI
        Write-Host "Aplicando migration via Supabase CLI..." -ForegroundColor Yellow
        $sqlContent | supabase db execute --project-id $projectId
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "============================================" -ForegroundColor Green
            Write-Host "SUCESSO! Migration aplicada automaticamente!" -ForegroundColor Green
            Write-Host "============================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Verificando se a tabela foi criada..." -ForegroundColor Yellow
            
            # Verificar se a tabela existe
            $checkSql = "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'barber_product_commissions');"
            $checkSql | supabase db execute --project-id $projectId
            
            exit 0
        }
    } catch {
        Write-Host "Erro ao aplicar via CLI: $_" -ForegroundColor Red
        Write-Host "Tentando metodo alternativo..." -ForegroundColor Yellow
    }
}

# Método alternativo: Copiar para área de transferência e abrir SQL Editor
Write-Host "Supabase CLI nao disponivel ou nao logado." -ForegroundColor Yellow
Write-Host "Usando metodo alternativo: SQL Editor..." -ForegroundColor Yellow
Write-Host ""

# Copiar para área de transferência
Write-Host "Copiando SQL para area de transferencia..." -ForegroundColor Yellow
Set-Clipboard -Value $sqlContent
Write-Host "SQL copiado com sucesso!" -ForegroundColor Green
Write-Host ""

# Abrir SQL Editor no navegador
$projectId = "wabefmgfsatlusevxyfo"
$sqlEditorUrl = "https://supabase.com/dashboard/project/$projectId/sql/new"
Write-Host "Abrindo SQL Editor no navegador..." -ForegroundColor Yellow
Start-Process $sqlEditorUrl

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "INSTRUCOES:" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. O SQL Editor foi aberto no navegador" -ForegroundColor White
Write-Host "2. O SQL ja esta copiado na area de transferencia" -ForegroundColor White
Write-Host "3. Cole no SQL Editor (Ctrl+V)" -ForegroundColor White
Write-Host "4. Clique em 'Run' ou pressione Ctrl+Enter" -ForegroundColor White
Write-Host "5. Aguarde a execucao e verifique se nao houve erros" -ForegroundColor White
Write-Host ""
Write-Host "Para aplicar automaticamente no futuro:" -ForegroundColor Yellow
Write-Host "- Instale o Supabase CLI: npm install -g supabase" -ForegroundColor Cyan
Write-Host "- Faca login: supabase login" -ForegroundColor Cyan
Write-Host "- Link o projeto: supabase link --project-ref $projectId" -ForegroundColor Cyan
Write-Host ""
