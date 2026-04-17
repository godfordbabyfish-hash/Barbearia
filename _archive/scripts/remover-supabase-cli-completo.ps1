# Script para remover completamente o Supabase CLI e todas as configurações

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "REMOVENDO SUPABASE CLI COMPLETAMENTE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está instalado
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCli) {
    Write-Host "Supabase CLI nao encontrado no PATH." -ForegroundColor Yellow
    Write-Host "Mas vamos remover configuracoes e cache mesmo assim..." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "Supabase CLI encontrado em: $($supabaseCli.Source)" -ForegroundColor Green
    Write-Host ""
}

# 1. Desvincular projetos linkados
Write-Host "[1/5] Desvinculando projetos linkados..." -ForegroundColor Yellow
try {
    # Tentar listar projetos e desvincular
    $projects = supabase projects list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Projetos encontrados. Desvinculando..." -ForegroundColor Yellow
        # Não há comando direto para desvincular, mas podemos remover o arquivo de configuração
    }
} catch {
    Write-Host "Nenhum projeto linkado ou erro ao verificar." -ForegroundColor Yellow
}

# 2. Remover configurações locais do projeto
Write-Host ""
Write-Host "[2/5] Removendo configuracoes locais do projeto..." -ForegroundColor Yellow

$configPaths = @(
    ".\.supabase",
    "supabase\.temp",
    "supabase\.branches"
)

foreach ($path in $configPaths) {
    if (Test-Path $path) {
        Write-Host "Removendo: $path" -ForegroundColor Yellow
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        if (Test-Path $path) {
            Write-Host "  Erro ao remover $path" -ForegroundColor Red
        } else {
            Write-Host "  Removido com sucesso!" -ForegroundColor Green
        }
    }
}

# 3. Remover cache global do Supabase CLI
Write-Host ""
Write-Host "[3/5] Removendo cache global..." -ForegroundColor Yellow

$cachePaths = @(
    "$env:USERPROFILE\.supabase",
    "$env:APPDATA\supabase",
    "$env:LOCALAPPDATA\supabase"
)

foreach ($path in $cachePaths) {
    if (Test-Path $path) {
        Write-Host "Removendo: $path" -ForegroundColor Yellow
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        if (Test-Path $path) {
            Write-Host "  Erro ao remover $path" -ForegroundColor Red
        } else {
            Write-Host "  Removido com sucesso!" -ForegroundColor Green
        }
    } else {
        Write-Host "  Nao encontrado: $path" -ForegroundColor Gray
    }
}

# 4. Remover configurações do Git (se houver)
Write-Host ""
Write-Host "[4/5] Verificando configuracoes do Git..." -ForegroundColor Yellow

if (Test-Path ".git\config") {
    Write-Host "Arquivo .git/config encontrado. Verificando referencias ao Supabase..." -ForegroundColor Yellow
    $gitConfig = Get-Content ".git\config" -Raw
    if ($gitConfig -match "supabase") {
        Write-Host "  Encontradas referencias ao Supabase no Git config." -ForegroundColor Yellow
        Write-Host "  (Nao removemos automaticamente para evitar problemas)" -ForegroundColor Yellow
    }
}

# 5. Desinstalar o CLI (depende de como foi instalado)
Write-Host ""
Write-Host "[5/5] Desinstalando Supabase CLI..." -ForegroundColor Yellow

# Verificar método de instalação
if ($supabaseCli) {
    $cliPath = $supabaseCli.Source
    Write-Host "CLI encontrado em: $cliPath" -ForegroundColor Yellow
    
    # Verificar se foi instalado via npm
    $npmCheck = Get-Command npm -ErrorAction SilentlyContinue
    if ($npmCheck) {
        Write-Host "Desinstalando via npm..." -ForegroundColor Yellow
        npm uninstall -g supabase 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Desinstalado via npm com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "  Erro ao desinstalar via npm" -ForegroundColor Red
        }
    }
    
    # Verificar se foi instalado via Scoop
    $scoopCheck = Get-Command scoop -ErrorAction SilentlyContinue
    if ($scoopCheck) {
        Write-Host "Verificando instalacao via Scoop..." -ForegroundColor Yellow
        scoop uninstall supabase 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Desinstalado via Scoop com sucesso!" -ForegroundColor Green
        }
    }
    
    # Verificar se foi instalado via Chocolatey
    $chocoCheck = Get-Command choco -ErrorAction SilentlyContinue
    if ($chocoCheck) {
        Write-Host "Verificando instalacao via Chocolatey..." -ForegroundColor Yellow
        choco uninstall supabase -y 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Desinstalado via Chocolatey com sucesso!" -ForegroundColor Green
        }
    }
    
    # Se ainda existir, tentar remover manualmente
    if (Test-Path $cliPath) {
        Write-Host "Tentando remover manualmente..." -ForegroundColor Yellow
        try {
            Remove-Item -Path $cliPath -Force -ErrorAction Stop
            Write-Host "  Removido manualmente!" -ForegroundColor Green
        } catch {
            Write-Host "  Nao foi possivel remover manualmente. Pode estar em uso." -ForegroundColor Red
            Write-Host "  Tente fechar todos os terminais e executar novamente." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "CLI nao encontrado no PATH. Pode ja estar desinstalado." -ForegroundColor Yellow
}

# 6. Remover variáveis de ambiente (opcional)
Write-Host ""
Write-Host "[BONUS] Verificando variaveis de ambiente..." -ForegroundColor Yellow

$envVars = @(
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_DB_PASSWORD",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_URL"
)

foreach ($var in $envVars) {
    if ([Environment]::GetEnvironmentVariable($var, "User")) {
        Write-Host "  Encontrada variavel: $var" -ForegroundColor Yellow
        $remove = Read-Host "  Deseja remover? (S/N) [N]"
        if ($remove -eq 'S' -or $remove -eq 's') {
            [Environment]::SetEnvironmentVariable($var, $null, "User")
            Write-Host "  Removida!" -ForegroundColor Green
        }
    }
}

# Verificar se foi removido
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "VERIFICACAO FINAL" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$finalCheck = Get-Command supabase -ErrorAction SilentlyContinue
if ($finalCheck) {
    Write-Host "AVISO: Supabase CLI ainda encontrado em: $($finalCheck.Source)" -ForegroundColor Red
    Write-Host "Pode ser necessario:" -ForegroundColor Yellow
    Write-Host "- Reiniciar o terminal" -ForegroundColor Cyan
    Write-Host "- Verificar instalacao manual em: $($finalCheck.Source)" -ForegroundColor Cyan
    Write-Host "- Remover manualmente do PATH" -ForegroundColor Cyan
} else {
    Write-Host "SUCESSO! Supabase CLI nao encontrado mais no sistema." -ForegroundColor Green
}

Write-Host ""
Write-Host "Limpanca concluida!" -ForegroundColor Green
Write-Host ""
Write-Host "NOTA: Se quiser reinstalar depois:" -ForegroundColor Yellow
Write-Host "  npm install -g supabase" -ForegroundColor Cyan
Write-Host ""
