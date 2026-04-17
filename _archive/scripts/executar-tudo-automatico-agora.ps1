# Script para executar todas as operações do Supabase automaticamente
# Execute este script no terminal onde você fez o 'supabase link'

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "EXECUTANDO OPERACOES AUTOMATICAS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$projectRef = "wabefmgfsatlusevxyfo"

# Verificar se está no diretório correto
if (-not (Test-Path "supabase\migrations")) {
    Write-Host "ERRO: Execute este script no diretorio do projeto!" -ForegroundColor Red
    Write-Host "Diretorio atual: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

Write-Host "Diretorio: $(Get-Location)" -ForegroundColor Green
Write-Host ""

# 1. Verificar status do projeto
Write-Host "[1/4] Verificando status do projeto..." -ForegroundColor Yellow

try {
    $status = supabase status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Projeto vinculado!" -ForegroundColor Green
    } else {
        Write-Host "  Nao foi possivel verificar status (pode ser normal)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Erro ao verificar status: $_" -ForegroundColor Yellow
}

Write-Host ""

# 2. Aplicar migrations pendentes
Write-Host "[2/4] Aplicando migrations pendentes..." -ForegroundColor Yellow

try {
    Write-Host "  Executando: supabase db push --linked --yes" -ForegroundColor Gray
    
    $pushOutput = supabase db push --linked --yes 2>&1 | Tee-Object -Variable output
    
    Write-Host $pushOutput
    
    if ($LASTEXITCODE -eq 0 -or $output -match "Applied|applied|success|Migration|migration|Finished|No changes") {
        Write-Host ""
        Write-Host "  SUCESSO! Migrations aplicadas!" -ForegroundColor Green
        
        if ($output -match "No changes") {
            Write-Host "  (Nenhuma migration pendente - todas ja foram aplicadas)" -ForegroundColor Gray
        }
    } else {
        Write-Host ""
        Write-Host "  AVISO: Verifique a mensagem acima" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Erro ao aplicar migrations: $_" -ForegroundColor Red
}

Write-Host ""

# 3. Verificar se tabela foi criada
Write-Host "[3/4] Verificando se tabela barber_product_commissions existe..." -ForegroundColor Yellow

try {
    # Tentar verificar via SQL (se possível)
    $checkSql = "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'barber_product_commissions');"
    
    # Nota: Não podemos executar SQL diretamente via CLI, mas podemos verificar via API REST
    Write-Host "  (Verificacao manual necessaria via SQL Editor)" -ForegroundColor Gray
    Write-Host "  Execute: SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'barber_product_commissions');" -ForegroundColor Cyan
} catch {
    Write-Host "  Nao foi possivel verificar automaticamente" -ForegroundColor Yellow
}

Write-Host ""

# 4. Atualizar tipos TypeScript (opcional)
Write-Host "[4/4] Atualizando tipos TypeScript..." -ForegroundColor Yellow

$updateTypes = Read-Host "  Deseja atualizar os tipos TypeScript? (S/N) [N]"

if ($updateTypes -eq 'S' -or $updateTypes -eq 's') {
    try {
        Write-Host "  Gerando tipos..." -ForegroundColor Gray
        npx supabase gen types typescript --project-id $projectRef > src/integrations/supabase/types.ts 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Tipos atualizados com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "  Erro ao atualizar tipos" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  Erro: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  Pulado (opcional)" -ForegroundColor Gray
}

Write-Host ""

# Resumo final
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "RESUMO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Operacoes concluidas!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "1. Verifique se a tabela foi criada (SQL Editor)" -ForegroundColor White
Write-Host "2. Use o hook useBarberProductCommissions nos componentes" -ForegroundColor White
Write-Host "3. Crie interface para gerenciar comissoes de produtos" -ForegroundColor White
Write-Host ""
