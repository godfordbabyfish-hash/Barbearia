# Script para remover projeto Supabase conectado localmente

Write-Host "🔍 Procurando projetos Supabase conectados..." -ForegroundColor Cyan
Write-Host ""

# Verificar se há arquivo de configuração do Supabase
$configPaths = @(
    "$env:APPDATA\supabase\config.toml",
    "$env:LOCALAPPDATA\supabase\config.toml",
    "$env:USERPROFILE\.supabase\config.toml",
    "$PWD\.supabase\config.toml"
)

$foundConfig = $null
foreach ($path in $configPaths) {
    if (Test-Path $path) {
        Write-Host "✅ Encontrado: $path" -ForegroundColor Green
        $foundConfig = $path
        break
    }
}

if (-not $foundConfig) {
    Write-Host "⚠️ Nenhum arquivo de configuração encontrado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "O Supabase CLI pode estar usando cache em memória." -ForegroundColor Gray
    Write-Host ""
    Write-Host "SOLUÇÃO: Use o comando do Supabase CLI para deslinkar:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  npx supabase unlink" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Depois, linke apenas o projeto desejado:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  npx supabase link --project-ref wabefmgfsatlusevxyfo" -ForegroundColor Yellow
    Write-Host ""
    exit
}

Write-Host ""
Write-Host "📋 Projetos encontrados no Supabase CLI:" -ForegroundColor Cyan
Write-Host ""

# Tentar listar projetos via CLI
try {
    $projects = npx supabase projects list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host $projects
    } else {
        Write-Host "⚠️ Não foi possível listar projetos via CLI" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Erro ao listar projetos: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  REMOVER PROJETO SUPABASE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para remover um projeto conectado:" -ForegroundColor White
Write-Host ""
Write-Host "1. Deslinkar todos os projetos:" -ForegroundColor Yellow
Write-Host "   npx supabase unlink" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Linkar apenas o projeto desejado:" -ForegroundColor Yellow
Write-Host "   npx supabase link --project-ref wabefmgfsatlusevxyfo" -ForegroundColor Cyan
Write-Host ""
Write-Host "OU" -ForegroundColor Gray
Write-Host ""
Write-Host "Se você quiser manter apenas o projeto 'wabefmgfsatlusevxyfo', execute:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   npx supabase link --project-ref wabefmgfsatlusevxyfo" -ForegroundColor Cyan
Write-Host ""
Write-Host "Isso substituirá qualquer projeto anteriormente linkado." -ForegroundColor Gray
Write-Host ""

# Perguntar se quer executar automaticamente
$response = Read-Host "Deseja executar o link agora? (S/N)"
if ($response -eq "S" -or $response -eq "s" -or $response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "🔗 Linkando projeto wabefmgfsatlusevxyfo..." -ForegroundColor Cyan
    npx supabase link --project-ref wabefmgfsatlusevxyfo
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Projeto linkado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Erro ao linkar projeto" -ForegroundColor Red
    }
}
