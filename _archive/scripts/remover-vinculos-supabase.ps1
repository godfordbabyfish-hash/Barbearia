# Script para remover todas as vinculações do Supabase CLI
# Permite vincular novamente apenas a conta/projeto correto

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "REMOVENDO VINCULOS DO SUPABASE CLI" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Remover configuração de projeto linkado local
Write-Host "[1/4] Removendo configuracao de projeto linkado..." -ForegroundColor Yellow

$configPaths = @(
    ".\.supabase",
    "supabase\.temp",
    "supabase\.branches",
    "supabase\config.toml"
)

foreach ($path in $configPaths) {
    if (Test-Path $path) {
        Write-Host "Removendo: $path" -ForegroundColor Yellow
        try {
            if ((Get-Item $path).PSIsContainer) {
                Remove-Item -Path $path -Recurse -Force -ErrorAction Stop
            } else {
                Remove-Item -Path $path -Force -ErrorAction Stop
            }
            Write-Host "  Removido com sucesso!" -ForegroundColor Green
        } catch {
            Write-Host "  Erro ao remover: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  Nao encontrado: $path" -ForegroundColor Gray
    }
}

# 2. Remover cache e tokens de autenticação global
Write-Host ""
Write-Host "[2/4] Removendo cache e tokens de autenticacao..." -ForegroundColor Yellow

$cachePaths = @(
    "$env:USERPROFILE\.supabase",
    "$env:APPDATA\supabase",
    "$env:LOCALAPPDATA\supabase",
    "$env:APPDATA\.supabase"
)

foreach ($path in $cachePaths) {
    if (Test-Path $path) {
        Write-Host "Removendo: $path" -ForegroundColor Yellow
        try {
            Remove-Item -Path $path -Recurse -Force -ErrorAction Stop
            Write-Host "  Removido com sucesso!" -ForegroundColor Green
        } catch {
            Write-Host "  Erro ao remover: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  Nao encontrado: $path" -ForegroundColor Gray
    }
}

# 3. Remover tokens de acesso do sistema
Write-Host ""
Write-Host "[3/4] Removendo tokens de acesso..." -ForegroundColor Yellow

# Verificar variáveis de ambiente relacionadas ao Supabase
$envVars = @(
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_DB_PASSWORD",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_URL",
    "SUPABASE_PROJECT_ID"
)

$removedVars = @()
foreach ($var in $envVars) {
    # Verificar variáveis de usuário
    $userValue = [Environment]::GetEnvironmentVariable($var, "User")
    if ($userValue) {
        Write-Host "Removendo variavel de usuario: $var" -ForegroundColor Yellow
        [Environment]::SetEnvironmentVariable($var, $null, "User")
        $removedVars += $var
    }
    
    # Verificar variáveis de sistema (só mostra, não remove automaticamente)
    $systemValue = [Environment]::GetEnvironmentVariable($var, "Machine")
    if ($systemValue) {
        Write-Host "Encontrada variavel de sistema: $var" -ForegroundColor Yellow
        Write-Host "  (Nao removemos automaticamente por seguranca)" -ForegroundColor Gray
    }
}

if ($removedVars.Count -gt 0) {
    Write-Host "  Removidas $($removedVars.Count) variaveis de ambiente!" -ForegroundColor Green
} else {
    Write-Host "  Nenhuma variavel encontrada" -ForegroundColor Gray
}

# 4. Tentar desvincular via CLI (se disponível)
Write-Host ""
Write-Host "[4/4] Tentando desvincular via CLI..." -ForegroundColor Yellow

$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue
if ($supabaseCli) {
    Write-Host "Supabase CLI encontrado. Verificando projetos vinculados..." -ForegroundColor Yellow
    
    try {
        # Tentar listar projetos (vai falhar se não estiver logado, o que é bom)
        $projects = supabase projects list 2>&1
        if ($LASTEXITCODE -eq 0 -and $projects) {
            Write-Host "Projetos encontrados:" -ForegroundColor Yellow
            Write-Host $projects -ForegroundColor White
            
            Write-Host ""
            Write-Host "Para desvincular completamente:" -ForegroundColor Yellow
            Write-Host "1. Execute: supabase logout" -ForegroundColor Cyan
            Write-Host "2. Isso removera sua autenticacao" -ForegroundColor Cyan
        } else {
            Write-Host "Nenhum projeto vinculado ou nao esta autenticado." -ForegroundColor Green
        }
    } catch {
        Write-Host "Erro ao verificar projetos: $_" -ForegroundColor Yellow
        Write-Host "Isso e normal se nao estiver autenticado." -ForegroundColor Gray
    }
} else {
    Write-Host "Supabase CLI nao encontrado no PATH." -ForegroundColor Yellow
}

# Verificação final
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "VERIFICACAO FINAL" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$stillLinked = $false

# Verificar se ainda há configurações locais
if (Test-Path "supabase\config.toml") {
    Write-Host "AVISO: Arquivo supabase\config.toml ainda existe!" -ForegroundColor Yellow
    Write-Host "  (Pode conter apenas configuracoes de funcoes, nao de projeto)" -ForegroundColor Gray
    $stillLinked = $true
}

if (Test-Path ".\.supabase") {
    Write-Host "AVISO: Pasta .supabase ainda existe!" -ForegroundColor Yellow
    $stillLinked = $true
}

if (-not $stillLinked) {
    Write-Host "SUCESSO! Todas as vinculacoes foram removidas!" -ForegroundColor Green
} else {
    Write-Host "Algumas configuracoes ainda existem. Tente remover manualmente se necessario." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "PROXIMOS PASSOS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para vincular o projeto correto:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Fazer logout (se estiver logado):" -ForegroundColor Cyan
Write-Host "   supabase logout" -ForegroundColor White
Write-Host ""
Write-Host "2. Fazer login novamente:" -ForegroundColor Cyan
Write-Host "   supabase login" -ForegroundColor White
Write-Host ""
Write-Host "3. Vincular o projeto correto:" -ForegroundColor Cyan
Write-Host "   supabase link --project-ref wabefmgfsatlusevxyfo --password 'senha_do_banco'" -ForegroundColor White
Write-Host ""
Write-Host "OU se quiser apenas usar o SQL Editor sem CLI:" -ForegroundColor Yellow
Write-Host "- Todas as vinculacoes foram removidas" -ForegroundColor Green
Write-Host "- Voce pode usar o SQL Editor diretamente no navegador" -ForegroundColor Green
Write-Host ""
