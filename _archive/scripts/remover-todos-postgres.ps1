# Script para remover todos os PostgreSQL e começar do zero

Write-Host "=== REMOVENDO TODOS OS POSTGRESQL ===" -ForegroundColor Cyan
Write-Host ""

$env:Path += ";$env:USERPROFILE\.fly\bin"

Write-Host "1. Listando todos os apps PostgreSQL..." -ForegroundColor Yellow
$allApps = fly apps list 2>&1
Write-Host $allApps

Write-Host ""
Write-Host "2. Procurando apps PostgreSQL para deletar..." -ForegroundColor Yellow

# Procurar por apps que contenham "postgres" no nome
$postgresApps = $allApps | Select-String -Pattern "postgres|Postgres" -CaseSensitive:$false

if ($postgresApps) {
    Write-Host ""
    Write-Host "Apps PostgreSQL encontrados:" -ForegroundColor Cyan
    foreach ($app in $postgresApps) {
        $appName = ($app -split '\s+')[0]
        Write-Host "  - $appName" -ForegroundColor White
    }
    
    Write-Host ""
    $confirm = Read-Host "Deseja deletar TODOS esses apps? (S/N)"
    
    if ($confirm -eq "S" -or $confirm -eq "s") {
        foreach ($app in $postgresApps) {
            $appName = ($app -split '\s+')[0]
            Write-Host ""
            Write-Host "Deletando $appName..." -ForegroundColor Yellow
            
            # Tentar deletar via CLI (pode precisar de confirmação manual)
            fly apps destroy $appName --yes 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "OK $appName deletado!" -ForegroundColor Green
            } else {
                Write-Host "AVISO: $appName pode precisar ser deletado manualmente no dashboard" -ForegroundColor Yellow
                Write-Host "   Acesse: https://dashboard.fly.io/apps/$appName" -ForegroundColor Gray
                Write-Host "   Settings -> Delete App" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host ""
        Write-Host "Operacao cancelada." -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Host ""
    Write-Host "OK Nenhum app PostgreSQL encontrado!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== PROXIMO PASSO: CRIAR NOVO POSTGRESQL ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agora vamos criar um novo PostgreSQL do zero:" -ForegroundColor Yellow
Write-Host "  1. Acesse: https://dashboard.fly.io" -ForegroundColor White
Write-Host "  2. Clique em New -> Postgres" -ForegroundColor White
Write-Host "  3. Escolha Unmanaged Postgres (gratuito)" -ForegroundColor White
Write-Host "  4. Configure:" -ForegroundColor White
Write-Host "     - App Name: evolution-db" -ForegroundColor Gray
Write-Host "     - Region: gru (Sao Paulo)" -ForegroundColor Gray
Write-Host "     - VM Size: shared-cpu-1x" -ForegroundColor Gray
Write-Host "     - Volume: 1 GB" -ForegroundColor Gray
Write-Host "  5. Clique em Create" -ForegroundColor White
Write-Host ""
Write-Host "Depois de criar, execute:" -ForegroundColor Yellow
Write-Host "  .\configurar-novo-postgres.ps1" -ForegroundColor Cyan
