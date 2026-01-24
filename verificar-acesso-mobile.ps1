# Script para Verificar e Configurar Acesso Mobile
# Execute este script para diagnosticar problemas de acesso mobile

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VERIFICACAO DE ACESSO MOBILE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Obter IP local
Write-Host "1. Obtendo IP local..." -ForegroundColor Yellow
$ipAddresses = @()
$adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }

foreach ($adapter in $adapters) {
    $ipAddresses += $adapter.IPAddress
    Write-Host "   IP encontrado: $($adapter.IPAddress)" -ForegroundColor Green
}

if ($ipAddresses.Count -eq 0) {
    Write-Host "   ERRO: Nenhum IP encontrado!" -ForegroundColor Red
    Write-Host "   Verifique sua conexao de rede" -ForegroundColor White
    exit 1
}

$mainIP = $ipAddresses[0]
Write-Host ""
Write-Host "   IP principal: $mainIP" -ForegroundColor Cyan
Write-Host ""

# 2. Verificar se porta 8080 está em uso
Write-Host "2. Verificando porta 8080..." -ForegroundColor Yellow
$port8080 = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue

if ($port8080) {
    Write-Host "   Porta 8080 esta em uso" -ForegroundColor Green
    Write-Host "   Processo: $($port8080.OwningProcess)" -ForegroundColor Gray
} else {
    Write-Host "   AVISO: Porta 8080 nao esta em uso" -ForegroundColor Yellow
    Write-Host "   O servidor pode nao estar rodando" -ForegroundColor White
}
Write-Host ""

# 3. Verificar Firewall
Write-Host "3. Verificando Firewall..." -ForegroundColor Yellow
$firewallRules = Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*Node*" -or $_.DisplayName -like "*8080*" }

if ($firewallRules) {
    Write-Host "   Regras encontradas:" -ForegroundColor Green
    foreach ($rule in $firewallRules) {
        Write-Host "   - $($rule.DisplayName)" -ForegroundColor Gray
    }
} else {
    Write-Host "   AVISO: Nenhuma regra de firewall encontrada para Node.js ou porta 8080" -ForegroundColor Yellow
    Write-Host "   Isso pode estar bloqueando conexoes externas" -ForegroundColor White
}
Write-Host ""

# 4. Verificar Vite config
Write-Host "4. Verificando configuracao do Vite..." -ForegroundColor Yellow
if (Test-Path "vite.config.ts") {
    $viteConfig = Get-Content "vite.config.ts" -Raw
    if ($viteConfig -match 'host:\s*["'']0\.0\.0\.0["'']') {
        Write-Host "   Vite configurado corretamente (host: 0.0.0.0)" -ForegroundColor Green
    } else {
        Write-Host "   AVISO: Vite pode nao estar configurado para aceitar conexoes externas" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ERRO: vite.config.ts nao encontrado" -ForegroundColor Red
}
Write-Host ""

# 5. Instrucoes
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTRUCOES PARA ACESSO MOBILE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Certifique-se que o servidor esta rodando:" -ForegroundColor Yellow
Write-Host "   .\iniciar-sistema.bat" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. No mobile, acesse:" -ForegroundColor Yellow
foreach ($ip in $ipAddresses) {
    Write-Host "   http://$ip`:8080" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "3. Se nao funcionar, configure Firewall:" -ForegroundColor Yellow
Write-Host "   - Abra: wf.msc" -ForegroundColor Cyan
Write-Host "   - Permita Node.js ou porta 8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Certifique-se que mobile e PC estao na mesma WiFi" -ForegroundColor Yellow
Write-Host ""

# 6. Criar regra de firewall automaticamente (opcional)
Write-Host "Deseja criar regra de firewall automaticamente? (S/N)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "S" -or $response -eq "s") {
    Write-Host ""
    Write-Host "Criando regra de firewall..." -ForegroundColor Yellow
    
    try {
        # Criar regra para porta 8080
        New-NetFirewallRule -DisplayName "Vite Dev Server - Porta 8080" `
            -Direction Inbound `
            -LocalPort 8080 `
            -Protocol TCP `
            -Action Allow `
            -Profile Any `
            -ErrorAction Stop
        
        Write-Host "   SUCESSO! Regra de firewall criada" -ForegroundColor Green
    } catch {
        Write-Host "   ERRO: Nao foi possivel criar regra (pode precisar de permissoes de admin)" -ForegroundColor Red
        Write-Host "   Crie manualmente: wf.msc -> Regras de Entrada -> Nova Regra" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IP para acessar no mobile:" -ForegroundColor Yellow
foreach ($ip in $ipAddresses) {
    Write-Host "   http://$ip`:8080" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Documentacao completa: ACESSO_MOBILE_SISTEMA.md" -ForegroundColor Gray
Write-Host ""
