# Script para conectar WhatsApp ao Evolution API no Railway
# Uso: .\conectar-whatsapp.ps1 -RailwayUrl "https://seu-projeto.railway.app"

param(
    [Parameter(Mandatory=$true)]
    [string]$RailwayUrl,
    
    [string]$ApiKey = "testdapi2026",
    [string]$InstanceName = "instance-1"
)

Write-Host "🚀 Configurando WhatsApp no Evolution API..." -ForegroundColor Cyan
Write-Host ""

# 1. Criar instância
Write-Host "📱 Passo 1: Criando instância '$InstanceName'..." -ForegroundColor Yellow
$headers = @{
    "Content-Type" = "application/json"
    "apikey" = $ApiKey
}

$body = @{
    instanceName = $InstanceName
    token = "token-seguro-barbearia-2026"
    qrcode = $true
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$RailwayUrl/instance/create" `
        -Method POST `
        -Headers $headers `
        -Body $body
    
    Write-Host "✅ Instância criada com sucesso!" -ForegroundColor Green
    Write-Host "   Response: $($createResponse | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erro ao criar instância:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    # Verificar se a instância já existe
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "⚠️  A instância já existe. Continuando..." -ForegroundColor Yellow
    } else {
        exit 1
    }
}

Write-Host ""

# 2. Obter QR Code
Write-Host "📱 Passo 2: Obtendo QR Code..." -ForegroundColor Yellow
$qrHeaders = @{
    "apikey" = $ApiKey
}

try {
    $qrResponse = Invoke-RestMethod -Uri "$RailwayUrl/instance/connect/$InstanceName?qrcode=true" `
        -Method GET `
        -Headers $qrHeaders
    
    Write-Host "✅ QR Code obtido!" -ForegroundColor Green
    
    # Tentar exibir QR Code se disponível
    if ($qrResponse.qrcode) {
        if ($qrResponse.qrcode.base64) {
            Write-Host ""
            Write-Host "📱 QR CODE DISPONÍVEL:" -ForegroundColor Cyan
            Write-Host "Acesse este link no navegador para ver o QR Code:" -ForegroundColor White
            Write-Host "$RailwayUrl/instance/connect/$InstanceName?qrcode=true" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "OU copie o base64 abaixo e cole em:" -ForegroundColor White
            Write-Host "https://base64.guru/converter/decode/image" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Base64 QR Code:" -ForegroundColor Cyan
            Write-Host $qrResponse.qrcode.base64 -ForegroundColor Gray
        } else {
            Write-Host "QR Code disponível em: $RailwayUrl/instance/connect/$InstanceName?qrcode=true" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "📲 INSTRUÇÕES:" -ForegroundColor Cyan
    Write-Host "1. Abra o WhatsApp no celular" -ForegroundColor White
    Write-Host "2. Vá em: Configurações → Aparelhos conectados → Conectar um aparelho" -ForegroundColor White
    Write-Host "3. Escaneie o QR Code acima" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "❌ Erro ao obter QR Code:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Tente acessar diretamente no navegador:" -ForegroundColor Yellow
    Write-Host "$RailwayUrl/instance/connect/$InstanceName?qrcode=true" -ForegroundColor Cyan
    Write-Host "(Configure o header 'apikey: $ApiKey' usando extensão ModHeader)" -ForegroundColor Gray
}

Write-Host ""

# 3. Verificar status
Write-Host "📊 Passo 3: Verificando status da instância..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $statusResponse = Invoke-RestMethod -Uri "$RailwayUrl/instance/fetchInstances" `
        -Method GET `
        -Headers $qrHeaders
    
    $instance = $statusResponse | Where-Object { $_.instance.instanceName -eq $InstanceName }
    
    if ($instance) {
        Write-Host "✅ Status da instância:" -ForegroundColor Green
        Write-Host "   Nome: $($instance.instance.instanceName)" -ForegroundColor White
        Write-Host "   Status: $($instance.instance.status)" -ForegroundColor $(if ($instance.instance.status -eq "open") { "Green" } else { "Yellow" })
        
        if ($instance.instance.status -eq "open") {
            Write-Host ""
            Write-Host "🎉 WhatsApp conectado com sucesso!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "⚠️  Aguarde alguns segundos e escaneie o QR Code novamente se necessário." -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠️  Não foi possível verificar o status automaticamente." -ForegroundColor Yellow
    Write-Host "Verifique manualmente em: $RailwayUrl/instance/fetchInstances" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "✅ Configuração concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "1. Configure as variáveis no Supabase:" -ForegroundColor White
Write-Host "   EVOLUTION_API_URL=$RailwayUrl" -ForegroundColor Yellow
Write-Host "   EVOLUTION_API_KEY=$ApiKey" -ForegroundColor Yellow
Write-Host "   EVOLUTION_INSTANCE_NAME=$InstanceName" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Aplique a migration SQL (veja arquivo APLICAR_MIGRATION_WHATSAPP.md)" -ForegroundColor White
Write-Host ""
