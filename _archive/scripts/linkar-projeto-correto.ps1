# Script para linkar apenas o projeto correto do Supabase

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LINKAR PROJETO SUPABASE CORRETO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script vai linkar apenas o projeto 'wabefmgfsatlusevxyfo'" -ForegroundColor White
Write-Host "Isso substituira qualquer projeto anteriormente linkado." -ForegroundColor Gray
Write-Host ""

# Verificar se ja esta linkado
Write-Host "Verificando projeto atual..." -ForegroundColor Yellow
$currentProject = Get-Content "supabase\config.toml" -ErrorAction SilentlyContinue | Select-String "project_id"
if ($currentProject) {
    Write-Host "Projeto atual: $currentProject" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Linkando projeto wabefmgfsatlusevxyfo..." -ForegroundColor Cyan
Write-Host ""

# Executar link
npx supabase link --project-ref wabefmgfsatlusevxyfo

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Projeto linkado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Agora voce pode fazer deploy:" -ForegroundColor Cyan
    Write-Host "  npx supabase functions deploy whatsapp-manager" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "Erro ao linkar projeto" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tente executar manualmente:" -ForegroundColor Yellow
    Write-Host "  npx supabase link --project-ref wabefmgfsatlusevxyfo" -ForegroundColor Cyan
}
