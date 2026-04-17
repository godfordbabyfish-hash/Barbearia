# Script para Executar Ajustes Finais do Sistema
# Execute este script após os commits

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AJUSTES FINAIS DO SISTEMA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar status do Git
Write-Host "1. Verificando status do Git..." -ForegroundColor Yellow
git status --short
Write-Host ""

# 2. Tentar push (pode falhar por proxy)
Write-Host "2. Tentando push para GitHub..." -ForegroundColor Yellow
Write-Host "   (Se falhar, use GitHub Desktop)" -ForegroundColor Gray
Write-Host ""

$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "   SUCESSO! Push realizado!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "   AVISO: Push falhou (problema de proxy)" -ForegroundColor Yellow
    Write-Host "   Use GitHub Desktop para fazer push" -ForegroundColor White
}
Write-Host ""

# 3. Deploy Edge Function API
Write-Host "3. Deploy da Edge Function 'api'..." -ForegroundColor Yellow
Write-Host "   (CRITICO - resolve erro 404)" -ForegroundColor Gray
Write-Host ""

try {
    npx supabase functions deploy api
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "   SUCESSO! Funcao 'api' deployada!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "   ERRO: Falha no deploy" -ForegroundColor Red
        Write-Host "   Execute manualmente: npx supabase functions deploy api" -ForegroundColor White
    }
} catch {
    Write-Host ""
    Write-Host "   ERRO: Nao foi possivel fazer deploy" -ForegroundColor Red
    Write-Host "   Execute manualmente: npx supabase functions deploy api" -ForegroundColor White
}
Write-Host ""

# 4. Resumo
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "1. Se push falhou, use GitHub Desktop" -ForegroundColor White
Write-Host "2. Se deploy falhou, execute manualmente:" -ForegroundColor White
Write-Host "   npx supabase functions deploy api" -ForegroundColor Gray
Write-Host "3. Teste o sistema:" -ForegroundColor White
Write-Host "   - Remover experiencia do barbeiro" -ForegroundColor Gray
Write-Host "   - Verificar se nao da mais erro 404" -ForegroundColor Gray
Write-Host ""
Write-Host "Documentacao:" -ForegroundColor Yellow
Write-Host "- CHECKLIST_COMPLETO_SISTEMA.md" -ForegroundColor White
Write-Host "- CORRIGIR_404_API_FUNCTION.md" -ForegroundColor White
Write-Host ""
