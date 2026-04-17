# Script simples para obter IP local
# Nao precisa de permissoes de admin

Write-Host "Obtendo IP local..." -ForegroundColor Yellow
Write-Host ""

# Usar ipconfig (nao precisa admin)
$ipconfig = ipconfig
$ipv4Lines = $ipconfig | Select-String "IPv4"

if ($ipv4Lines) {
    Write-Host "IPs encontrados:" -ForegroundColor Green
    Write-Host ""
    foreach ($line in $ipv4Lines) {
        $ip = ($line -split ":")[1].Trim()
        if ($ip -notlike "127.*" -and $ip -notlike "169.254.*") {
            Write-Host "   http://$ip`:8080" -ForegroundColor Cyan
        }
    }
    Write-Host ""
    Write-Host "Use um desses IPs no mobile para acessar o sistema" -ForegroundColor White
} else {
    Write-Host "Nenhum IP encontrado. Execute: ipconfig" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Certifique-se que:" -ForegroundColor Yellow
Write-Host "1. Servidor esta rodando (.\iniciar-sistema.bat)" -ForegroundColor White
Write-Host "2. Mobile e PC estao na mesma WiFi" -ForegroundColor White
Write-Host "3. Firewall permite conexoes na porta 8080" -ForegroundColor White
Write-Host ""
