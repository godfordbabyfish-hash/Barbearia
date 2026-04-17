# Script para fazer logout do Supabase CLI automaticamente

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "FAZENDO LOGOUT DO SUPABASE CLI" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCli) {
    Write-Host "Supabase CLI nao encontrado. Nada para fazer logout." -ForegroundColor Yellow
    exit 0
}

Write-Host "Fazendo logout do Supabase CLI..." -ForegroundColor Yellow
Write-Host ""

# Fazer logout com confirmação automática
echo "y" | supabase logout 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCESSO! Logout realizado!" -ForegroundColor Green
} else {
    Write-Host "Logout concluido ou nao havia sessao ativa." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Status atual:" -ForegroundColor Cyan
Write-Host "- Nenhuma sessao ativa" -ForegroundColor Green
Write-Host "- Nenhum projeto vinculado" -ForegroundColor Green
Write-Host "- Pronto para vincular o projeto correto!" -ForegroundColor Green
Write-Host ""
