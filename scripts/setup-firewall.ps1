# Script para configurar o Firewall do Windows para permitir acesso à porta 8080
Write-Host "🔧 Configurando Firewall do Windows para porta 8080..." -ForegroundColor Yellow

# Verificar se está executando como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Este script requer privilégios de Administrador!" -ForegroundColor Red
    Write-Host "   Por favor, execute o PowerShell como Administrador e tente novamente." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Ou execute manualmente:" -ForegroundColor Cyan
    Write-Host "   New-NetFirewallRule -DisplayName 'Vite Dev Server 8080' -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow" -ForegroundColor White
    exit 1
}

# Verificar se a regra já existe
$existingRule = Get-NetFirewallRule -DisplayName "Vite Dev Server 8080" -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "✅ Regra de firewall já existe para a porta 8080" -ForegroundColor Green
    Write-Host "   Regra: $($existingRule.DisplayName)" -ForegroundColor Cyan
} else {
    try {
        # Criar regra de firewall
        New-NetFirewallRule -DisplayName "Vite Dev Server 8080" `
            -Direction Inbound `
            -LocalPort 8080 `
            -Protocol TCP `
            -Action Allow `
            -Description "Permite acesso ao servidor de desenvolvimento Vite na porta 8080"
        
        Write-Host "✅ Regra de firewall criada com sucesso!" -ForegroundColor Green
        Write-Host "   Agora você pode acessar o servidor do celular na mesma rede Wi-Fi" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Erro ao criar regra de firewall: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📱 Para acessar do celular:" -ForegroundColor Yellow
Write-Host "   1. Certifique-se que o celular está na mesma rede Wi-Fi" -ForegroundColor White
Write-Host "   2. Use o IP mostrado quando o servidor iniciar" -ForegroundColor White
Write-Host "   3. Formato: http://[IP]:8080" -ForegroundColor White
Write-Host ""
