Set-Location $PSScriptRoot

Write-Host "Desabilitando proxy..." -ForegroundColor Yellow

$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
$env:http_proxy = ""
$env:https_proxy = ""

git config --local --unset http.proxy 2>$null
git config --local --unset https.proxy 2>$null
git config --local http.proxy "" 2>$null
git config --local https.proxy "" 2>$null

Write-Host "Tentando push..." -ForegroundColor Yellow
Write-Host ""

git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCESSO! Push realizado!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "ERRO: Nao foi possivel fazer push" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solucoes:" -ForegroundColor Cyan
    Write-Host "1. Verifique sua conexao com internet" -ForegroundColor White
    Write-Host "2. Tente usar GitHub Desktop" -ForegroundColor White
    Write-Host "3. Configure SSH (veja CONFIGURAR_GITHUB_COMMITS.md)" -ForegroundColor White
}
