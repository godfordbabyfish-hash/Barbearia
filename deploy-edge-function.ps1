# Script para fazer deploy da Edge Function whatsapp-manager

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY EDGE FUNCTION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Navegar para o diretório do projeto
$projectPath = "C:\Users\thiag\Downloads\Barbearia"
Write-Host "1. Navegando para: $projectPath" -ForegroundColor Yellow
Set-Location $projectPath

# 2. Verificar se o arquivo existe
Write-Host "2. Verificando se a Edge Function existe..." -ForegroundColor Yellow
$functionPath = "supabase\functions\whatsapp-manager\index.ts"
if (Test-Path $functionPath) {
    Write-Host "   ✓ Arquivo encontrado!" -ForegroundColor Green
} else {
    Write-Host "   ✗ Arquivo não encontrado: $functionPath" -ForegroundColor Red
    Write-Host "   Caminho atual: $(Get-Location)" -ForegroundColor Gray
    exit 1
}

# 3. Verificar se está no diretório correto
Write-Host ""
Write-Host "3. Verificando estrutura do projeto..." -ForegroundColor Yellow
if (Test-Path "supabase\functions\whatsapp-manager") {
    Write-Host "   ✓ Diretório da função encontrado!" -ForegroundColor Green
} else {
    Write-Host "   ✗ Diretório não encontrado!" -ForegroundColor Red
    Write-Host "   Caminho atual: $(Get-Location)" -ForegroundColor Gray
    exit 1
}

# 4. Fazer login (se necessário)
Write-Host ""
Write-Host "4. Verificando login no Supabase..." -ForegroundColor Yellow
Write-Host "   (Se pedir login, faça login no navegador)" -ForegroundColor Gray
Write-Host ""

$loginResult = npx supabase login 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ⚠ Erro ao fazer login. Tente manualmente:" -ForegroundColor Yellow
    Write-Host "   npx supabase login" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "   Continuar mesmo assim? (S/N)"
    if ($continue -ne 'S' -and $continue -ne 's') {
        exit 1
    }
}

# 5. Linkar projeto (se necessário)
Write-Host ""
Write-Host "5. Linkando projeto..." -ForegroundColor Yellow
Write-Host "   Project ID: wabefmgfsatlusevxyfo" -ForegroundColor Gray
Write-Host ""

$linkResult = npx supabase link --project-ref wabefmgfsatlusevxyfo 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ⚠ Erro ao linkar projeto. Verifique se:" -ForegroundColor Yellow
    Write-Host "   - Você está logado no Supabase" -ForegroundColor White
    Write-Host "   - Você tem acesso ao projeto" -ForegroundColor White
    Write-Host "   - O project-ref está correto" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "   Continuar mesmo assim? (S/N)"
    if ($continue -ne 'S' -and $continue -ne 's') {
        exit 1
    }
} else {
    Write-Host "   ✓ Projeto linkado!" -ForegroundColor Green
}

# 6. Fazer deploy
Write-Host ""
Write-Host "6. Fazendo deploy da Edge Function..." -ForegroundColor Yellow
Write-Host "   Função: whatsapp-manager" -ForegroundColor Gray
Write-Host "   Aguarde..." -ForegroundColor Gray
Write-Host ""

# Desabilitar proxy se estiver configurado (pode causar problemas)
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""

npx supabase functions deploy whatsapp-manager

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✓ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Cyan
    Write-Host "1. Verifique no Dashboard: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions/whatsapp-manager" -ForegroundColor White
    Write-Host "2. Acesse o painel admin → WhatsApp" -ForegroundColor White
    Write-Host "3. Clique em 'Gerar Novo QR'" -ForegroundColor White
    Write-Host "4. Escaneie o QR code com o WhatsApp" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ✗ ERRO NO DEPLOY" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possíveis soluções:" -ForegroundColor Yellow
    Write-Host "1. Verifique se está logado: npx supabase login" -ForegroundColor White
    Write-Host "2. Verifique se o projeto está linkado: npx supabase link --project-ref wabefmgfsatlusevxyfo" -ForegroundColor White
    Write-Host "3. Verifique sua conexão com a internet" -ForegroundColor White
    Write-Host "4. Tente usar o Supabase Dashboard como alternativa" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou execute manualmente:" -ForegroundColor Cyan
    Write-Host "  npx supabase functions deploy whatsapp-manager" -ForegroundColor White
    Write-Host ""
}
