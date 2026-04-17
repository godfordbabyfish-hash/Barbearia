# Script para atualizar EVOLUTION_API_URL no Supabase após migração para Render
# Execute este script DEPOIS de ter a URL do Render pronta

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ATUALIZAR EVOLUTION_API_URL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Solicitar a nova URL do Render
$novaUrl = Read-Host "Digite a URL completa da Evolution API no Render (ex: https://evolution-api-barbearia.onrender.com)"

if ([string]::IsNullOrWhiteSpace($novaUrl)) {
    Write-Host "❌ URL não pode estar vazia!" -ForegroundColor Red
    exit 1
}

# Remover barra final se houver
$novaUrl = $novaUrl.TrimEnd('/')

Write-Host ""
Write-Host "Nova URL: $novaUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  ATENÇÃO: Você precisa atualizar manualmente no Supabase:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/functions" -ForegroundColor Cyan
Write-Host "2. Vá em 'Edge Functions' → 'Secrets' (ou 'Environment Variables')" -ForegroundColor Cyan
Write-Host "3. Encontre a variável: EVOLUTION_API_URL" -ForegroundColor Cyan
Write-Host "4. Atualize o valor para: $novaUrl" -ForegroundColor Green
Write-Host "5. Salve as alterações" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ou use o Supabase CLI:" -ForegroundColor Yellow
Write-Host "  supabase secrets set EVOLUTION_API_URL=$novaUrl" -ForegroundColor Green
Write-Host ""

# Verificar se Supabase CLI está disponível
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue
if ($supabaseCli) {
    $usarCli = Read-Host "Deseja atualizar via Supabase CLI agora? (s/n)"
    if ($usarCli -eq 's' -or $usarCli -eq 'S') {
        Write-Host ""
        Write-Host "Executando: supabase secrets set EVOLUTION_API_URL=$novaUrl" -ForegroundColor Yellow
        supabase secrets set "EVOLUTION_API_URL=$novaUrl"
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Variável atualizada com sucesso!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "❌ Erro ao atualizar. Faça manualmente no painel do Supabase." -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
