# Script para Configurar Firewall para Acesso Mobile
# Execute como Administrador

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CONFIGURAR FIREWALL PARA MOBILE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se esta executando como admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "AVISO: Este script precisa ser executado como Administrador" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para executar como admin:" -ForegroundColor White
    Write-Host "1. Clique com botao direito no arquivo" -ForegroundColor Gray
    Write-Host "2. Selecione 'Executar como administrador'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "OU execute no PowerShell como admin:" -ForegroundColor White
    Write-Host "   .\configurar-firewall-mobile.ps1" -ForegroundColor Cyan
    Write-Host ""
    pause
    exit 1
}

Write-Host "Criando regra de firewall para porta 8080..." -ForegroundColor Yellow
Write-Host ""

try {
    # Verificar se regra ja existe
    $existingRule = Get-NetFirewallRule -DisplayName "Vite Dev Server - Porta 8080" -ErrorAction SilentlyContinue
    
    if ($existingRule) {
        Write-Host "Regra ja existe. Removendo antiga..." -ForegroundColor Gray
        Remove-NetFirewallRule -DisplayName "Vite Dev Server - Porta 8080" -ErrorAction SilentlyContinue
    }
    
    # Criar nova regra
    New-NetFirewallRule -DisplayName "Vite Dev Server - Porta 8080" `
        -Direction Inbound `
        -LocalPort 8080 `
        -Protocol TCP `
        -Action Allow `
        -Profile Domain,Private,Public `
        -Description "Permite acesso ao servidor de desenvolvimento Vite na porta 8080 para acesso mobile" `
        -ErrorAction Stop
    
    Write-Host "SUCESSO! Regra de firewall criada" -ForegroundColor Green
    Write-Host ""
    Write-Host "Agora o sistema deve ser acessivel pelo mobile!" -ForegroundColor Green
    Write-Host ""
    
    # Obter IP
    Write-Host "Obtenha o IP do PC:" -ForegroundColor Yellow
    Write-Host "   .\obter-ip-local.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ou execute: ipconfig | findstr IPv4" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Depois acesse no mobile: http://SEU_IP:8080" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "ERRO: Nao foi possivel criar regra de firewall" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Configure manualmente:" -ForegroundColor Yellow
    Write-Host "1. Abra: wf.msc" -ForegroundColor White
    Write-Host "2. Regras de Entrada -> Nova Regra" -ForegroundColor White
    Write-Host "3. Porta -> TCP -> 8080 -> Permitir" -ForegroundColor White
    Write-Host ""
}

pause
