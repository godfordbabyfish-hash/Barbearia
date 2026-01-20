# Script para iniciar ambiente de desenvolvimento com monitoramento de erros
Write-Host "🚀 Iniciando ambiente de desenvolvimento..." -ForegroundColor Green

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
    npm install
}

# Verificar se .env existe
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "📝 Criando .env com configurações padrão..." -ForegroundColor Yellow
    
    @"
VITE_SUPABASE_PROJECT_ID=wabefmgfsatlusevxyfo
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc
VITE_SUPABASE_URL=https://wabefmgfsatlusevxyfo.supabase.co
"@ | Out-File -FilePath .env -Encoding utf8
    
    Write-Host "✅ Arquivo .env criado!" -ForegroundColor Green
}

# Limpar log de debug anterior
if (Test-Path ".cursor\debug.log") {
    Remove-Item ".cursor\debug.log" -Force -ErrorAction SilentlyContinue
    Write-Host "🗑️  Log anterior limpo" -ForegroundColor Yellow
}

# Descobrir IP do computador para acesso via celular
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
    ($_.InterfaceAlias -like "*Wi-Fi*" -or 
     $_.InterfaceAlias -like "*Ethernet*") -and
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*"
} | Select-Object -First 1 -ExpandProperty IPAddress

# Verificar regra de firewall
$firewallRule = Get-NetFirewallRule -DisplayName "Vite Dev Server 8080" -ErrorAction SilentlyContinue
if (-not $firewallRule) {
    Write-Host "⚠️  Firewall pode estar bloqueando a porta 8080" -ForegroundColor Yellow
    Write-Host "   Execute como Administrador: .\scripts\setup-firewall.ps1" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "🌐 Iniciando servidor de desenvolvimento..." -ForegroundColor Green
Write-Host "📍 O servidor estará disponível em:" -ForegroundColor Cyan
Write-Host "   - Local: http://localhost:8080" -ForegroundColor White
if ($ipAddresses) {
    Write-Host "   - Rede local: http://$ipAddresses:8080" -ForegroundColor Green
    Write-Host "   📱 Use este IP no celular (mesma rede Wi-Fi):" -ForegroundColor Yellow
    Write-Host "      http://$ipAddresses:8080" -ForegroundColor Green -BackgroundColor Black
    Write-Host ""
    Write-Host "💡 Se não conseguir acessar do celular:" -ForegroundColor Yellow
    Write-Host "   1. Execute: .\scripts\setup-firewall.ps1 (como Admin)" -ForegroundColor Cyan
    Write-Host "   2. Verifique se o celular está na mesma rede Wi-Fi" -ForegroundColor Cyan
    Write-Host "   3. Teste manualmente digitando a URL no navegador do celular" -ForegroundColor Cyan
} else {
    Write-Host "   ⚠️  Execute .\descobrir-ip.ps1 para descobrir o IP da rede local" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "📊 Logs de debug serão salvos em: .cursor\debug.log" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para parar o servidor, pressione Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Iniciar servidor de desenvolvimento
npm run dev
