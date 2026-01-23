# Script para Desabilitar Proxy e Fazer Push para GitHub
# Execute este script como Administrador se necessário

Write-Host "🔧 Desabilitando Proxy e Configurações que Impedem Push" -ForegroundColor Cyan
Write-Host ""

# 1. Desabilitar variáveis de ambiente de proxy
Write-Host "1️⃣ Desabilitando variáveis de proxy..." -ForegroundColor Yellow
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
$env:http_proxy = ""
$env:https_proxy = ""
$env:NO_PROXY = "*"
$env:no_proxy = "*"
Write-Host "   ✅ Variáveis de proxy desabilitadas" -ForegroundColor Green

# 2. Remover proxy do Git (local e global)
Write-Host ""
Write-Host "2️⃣ Removendo proxy do Git..." -ForegroundColor Yellow
try {
    git config --local --unset http.proxy 2>$null
    git config --local --unset https.proxy 2>$null
    git config --global --unset http.proxy 2>$null
    git config --global --unset https.proxy 2>$null
    Write-Host "   ✅ Proxy removido do Git" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Erro ao remover proxy (pode não existir)" -ForegroundColor Yellow
}

# 3. Configurar Git para não usar proxy
Write-Host ""
Write-Host "3️⃣ Configurando Git..." -ForegroundColor Yellow
try {
    git config --local http.proxy ""
    git config --local https.proxy ""
    git config --local http.sslVerify true
    git config --local http.postBuffer 524288000
    Write-Host "   ✅ Git configurado" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Erro ao configurar Git (pode precisar de permissões)" -ForegroundColor Yellow
}

# 4. Verificar configurações
Write-Host ""
Write-Host "4️⃣ Verificando configurações..." -ForegroundColor Yellow
Write-Host "   HTTP_PROXY: $env:HTTP_PROXY"
Write-Host "   HTTPS_PROXY: $env:HTTPS_PROXY"
$gitProxy = git config --local http.proxy 2>$null
Write-Host "   Git http.proxy: $gitProxy"

# 5. Tentar push com todas as opções
Write-Host ""
Write-Host "5️⃣ Tentando fazer push..." -ForegroundColor Yellow
Write-Host ""

# Tentativa 1: Push normal
Write-Host "   Tentativa 1: Push normal..." -ForegroundColor Gray
$result = git push origin main 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Push realizado com sucesso!" -ForegroundColor Green
    exit 0
}

# Tentativa 2: Push forçando sem proxy
Write-Host "   Tentativa 2: Push forçando sem proxy..." -ForegroundColor Gray
$result = git -c http.proxy= -c https.proxy= push origin main 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Push realizado com sucesso!" -ForegroundColor Green
    exit 0
}

# Tentativa 3: Push usando GIT_SSL_NO_VERIFY (não recomendado, mas pode funcionar)
Write-Host "   Tentativa 3: Push com SSL relaxado..." -ForegroundColor Gray
$env:GIT_SSL_NO_VERIFY = "1"
$result = git -c http.proxy= -c https.proxy= push origin main 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Push realizado com sucesso!" -ForegroundColor Green
    $env:GIT_SSL_NO_VERIFY = ""
    exit 0
}
$env:GIT_SSL_NO_VERIFY = ""

# Se todas falharam
Write-Host ""
Write-Host "❌ Não foi possível fazer push automaticamente" -ForegroundColor Red
Write-Host ""
Write-Host "📋 Próximos Passos:" -ForegroundColor Cyan
Write-Host "   1. Verifique sua conexão com a internet" -ForegroundColor White
Write-Host "   2. Verifique se há firewall/antivírus bloqueando" -ForegroundColor White
Write-Host "   3. Tente usar SSH em vez de HTTPS:" -ForegroundColor White
Write-Host "      git remote set-url origin git@github.com:godfordbabyfish-hash/Barbearia.git" -ForegroundColor Gray
Write-Host "   4. Ou use GitHub Desktop para fazer push" -ForegroundColor White
Write-Host "   5. Ou faça push manualmente quando a conexão melhorar" -ForegroundColor White
Write-Host ""
Write-Host "Consulte: CONFIGURAR_GITHUB_COMMITS.md para mais solucoes" -ForegroundColor Cyan
