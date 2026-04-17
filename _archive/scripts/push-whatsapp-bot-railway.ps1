# Script para fazer push do WhatsApp Bot para Railway
# Este script encontra automaticamente o diretório correto

Write-Host "Procurando diretorio whatsapp-bot-railway..." -ForegroundColor Cyan
Write-Host ""

# Possiveis locais onde o diretorio pode estar
$possiblePaths = @(
    "$PSScriptRoot\whatsapp-bot-railway",
    "$PSScriptRoot\brk\whatsapp-bot-railway",
    "$env:USERPROFILE\Downloads\Barbearia\whatsapp-bot-railway",
    "$env:USERPROFILE\Downloads\Barbearia\brk\whatsapp-bot-railway",
    "$env:USERPROFILE\.cursor\worktrees\Barbearia__Workspace_\brk\whatsapp-bot-railway"
)

$foundPath = $null

foreach ($path in $possiblePaths) {
    if (Test-Path $path -PathType Container) {
        if (Test-Path "$path\index.js") {
            $foundPath = $path
            Write-Host "Diretorio encontrado: $path" -ForegroundColor Green
            break
        }
    }
}

# Se nao encontrou, tentar procurar recursivamente
if (-not $foundPath) {
    Write-Host "Procurando recursivamente..." -ForegroundColor Yellow
    $searchRoots = @(
        "$PSScriptRoot",
        "$env:USERPROFILE\Downloads\Barbearia",
        "$env:USERPROFILE\.cursor\worktrees"
    )
    
    foreach ($root in $searchRoots) {
        if (Test-Path $root) {
            $result = Get-ChildItem -Path $root -Recurse -Directory -Filter "whatsapp-bot-railway" -ErrorAction SilentlyContinue | 
                     Where-Object { Test-Path "$($_.FullName)\index.js" } | 
                     Select-Object -First 1
            
            if ($result) {
                $foundPath = $result.FullName
                Write-Host "Diretorio encontrado: $foundPath" -ForegroundColor Green
                break
            }
        }
    }
}

if (-not $foundPath) {
    Write-Host "ERRO: Diretorio whatsapp-bot-railway nao encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, navegue manualmente para o diretorio e execute:" -ForegroundColor Yellow
    Write-Host "  git add index.js" -ForegroundColor Cyan
    Write-Host "  git commit -m 'Fix: Reorganize middlewares, add better error handling and logging'" -ForegroundColor Cyan
    Write-Host "  git push --set-upstream origin main" -ForegroundColor Cyan
    exit 1
}

# Navegar para o diretorio encontrado
Write-Host ""
Write-Host "Navegando para: $foundPath" -ForegroundColor Yellow
Set-Location $foundPath

Write-Host ""
Write-Host "Verificando status do Git..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "Adicionando arquivos..." -ForegroundColor Yellow
git add index.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "AVISO: git add retornou codigo $LASTEXITCODE" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Fazendo commit..." -ForegroundColor Yellow
git commit -m "Fix: Reorganize middlewares, add better error handling and logging"

if ($LASTEXITCODE -ne 0) {
    Write-Host "AVISO: git commit retornou codigo $LASTEXITCODE" -ForegroundColor Yellow
    Write-Host "   Isso pode ser normal se nao houver mudancas para commitar." -ForegroundColor Gray
}

Write-Host ""
Write-Host "Fazendo push para o repositorio..." -ForegroundColor Yellow

# Verificar se o upstream ja esta configurado
$upstream = git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Configurando upstream branch..." -ForegroundColor Yellow
    git push --set-upstream origin main
} else {
    git push
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Push realizado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Aguarde o Railway fazer o deploy automaticamente (2-3 minutos)" -ForegroundColor Cyan
    Write-Host "   Acompanhe em: https://railway.app" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Teste os endpoints apos o deploy:" -ForegroundColor Cyan
    Write-Host "   - https://whatsapp-bot-barbearia-production.up.railway.app/" -ForegroundColor Gray
    Write-Host "   - https://whatsapp-bot-barbearia-production.up.railway.app/health" -ForegroundColor Gray
    Write-Host "   - https://whatsapp-bot-barbearia-production.up.railway.app/ready" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Erro ao fazer push!" -ForegroundColor Red
    Write-Host "   Codigo de saida: $LASTEXITCODE" -ForegroundColor Yellow
    Write-Host "   Verifique sua conexao e configuracao do Git" -ForegroundColor Yellow
}
