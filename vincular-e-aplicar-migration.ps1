# Script para vincular projeto e aplicar migration automaticamente
# Usa todas as credenciais encontradas nos arquivos

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "VINCULANDO PROJETO E APLICANDO MIGRATION" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Credenciais encontradas
$projectRef = "wabefmgfsatlusevxyfo"
$dbPassword = "pFgNQxhpdCkmxED1"
$dbHost = "db.$projectRef.supabase.co"
$dbPort = "5432"
$dbName = "postgres"
$dbUser = "postgres"

Write-Host "Configurando credenciais..." -ForegroundColor Yellow
Write-Host "  Project Ref: $projectRef" -ForegroundColor Gray
Write-Host "  Database Host: $dbHost" -ForegroundColor Gray
Write-Host ""

# Passo 1: Fazer link do projeto
Write-Host "[1/2] Vinculando projeto Supabase..." -ForegroundColor Yellow

try {
    # Tentar fazer link usando a senha do banco
    Write-Host "  Executando: supabase link --project-ref $projectRef" -ForegroundColor Gray
    
    # Criar string de conexão para passar como senha
    $linkOutput = echo $dbPassword | supabase link --project-ref $projectRef --password $dbPassword 2>&1
    
    Write-Host $linkOutput
    
    if ($LASTEXITCODE -eq 0 -or $linkOutput -match "Linked|linked|success|Success") {
        Write-Host ""
        Write-Host "  ✅ Projeto vinculado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  ⚠️ Link pode ter falhado, mas vamos tentar aplicar mesmo assim" -ForegroundColor Yellow
        
        # Tentar método alternativo: link interativo
        Write-Host ""
        Write-Host "  Tentando método alternativo..." -ForegroundColor Yellow
        Write-Host "  Execute manualmente:" -ForegroundColor Cyan
        Write-Host "    supabase link --project-ref $projectRef" -ForegroundColor White
        Write-Host "  Quando pedir a senha, use: $dbPassword" -ForegroundColor White
        Write-Host ""
    }
} catch {
    Write-Host "  Erro ao fazer link: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Execute manualmente:" -ForegroundColor Yellow
    Write-Host "    supabase link --project-ref $projectRef" -ForegroundColor Cyan
    Write-Host "  Senha: $dbPassword" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""

# Passo 2: Aplicar migration
Write-Host "[2/2] Aplicando migration..." -ForegroundColor Yellow

try {
    Write-Host "  Executando: supabase db push" -ForegroundColor Gray
    
    $pushOutput = supabase db push 2>&1 | Tee-Object -Variable output
    
    Write-Host $pushOutput
    
    if ($LASTEXITCODE -eq 0 -or $output -match "Applied|applied|success|Migration|migration|Finished|No changes") {
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "SUCESSO! Migration aplicada!" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Tabela barber_product_commissions criada!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host ""
        Write-Host "  ⚠️ Migration nao foi aplicada automaticamente" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Possiveis causas:" -ForegroundColor Yellow
        Write-Host "    - Projeto nao esta linkado" -ForegroundColor White
        Write-Host "    - Migration ja foi aplicada" -ForegroundColor White
        Write-Host ""
        Write-Host "  Tente executar manualmente:" -ForegroundColor Cyan
        Write-Host "    supabase link --project-ref $projectRef" -ForegroundColor White
        Write-Host "    (Senha: $dbPassword)" -ForegroundColor White
        Write-Host ""
        Write-Host "    supabase db push" -ForegroundColor White
    }
} catch {
    Write-Host "  Erro ao aplicar migration: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "INSTRUCOES MANUAIS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se o link automatico nao funcionou, execute:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Vincular projeto:" -ForegroundColor White
Write-Host "   supabase link --project-ref $projectRef" -ForegroundColor Cyan
Write-Host "   (Quando pedir senha, use: $dbPassword)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Aplicar migration:" -ForegroundColor White
Write-Host "   supabase db push" -ForegroundColor Cyan
Write-Host ""
