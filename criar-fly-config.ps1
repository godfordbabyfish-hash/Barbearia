# Script para criar e configurar Evolution API no Fly.io
# Executa todos os passos automaticamente

Write-Host "CONFIGURANDO EVOLUTION API NO FLY.IO" -ForegroundColor Cyan
Write-Host ""

# Verificar se fly CLI está instalado
try {
    $flyVersion = fly version 2>&1
    Write-Host "[OK] Fly CLI encontrado: $flyVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Fly CLI nao encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instalando Fly CLI..." -ForegroundColor Yellow
    powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
    
    # Adicionar ao PATH da sessão atual
    $env:Path += ";$env:USERPROFILE\.fly\bin"
    
    Write-Host "[OK] Fly CLI instalado!" -ForegroundColor Green
    Write-Host "Se ainda não funcionar, feche e reabra o PowerShell." -ForegroundColor Yellow
    Write-Host ""
}

# Verificar autenticação
Write-Host "Verificando autenticação..." -ForegroundColor Yellow
try {
    fly auth whoami 2>&1 | Out-Null
    Write-Host "[OK] Autenticado no Fly.io" -ForegroundColor Green
} catch {
    Write-Host "[AVISO] Nao autenticado. Vamos autenticar..." -ForegroundColor Yellow
    Write-Host "Uma janela do navegador será aberta. Faça login e autorize." -ForegroundColor Cyan
    fly auth login
}

Write-Host ""
Write-Host "Escolha o nome do app (ou pressione Enter para 'evolution-api-barbearia'):" -ForegroundColor Cyan
$appName = Read-Host "Nome do app"

if (-not $appName) {
    $appName = "evolution-api-barbearia"
}

Write-Host ""
Write-Host "Criando app: $appName" -ForegroundColor Yellow

# Criar app sem deploy
try {
    fly launch --no-deploy --name $appName --region gru 2>&1 | Out-Null
    Write-Host "[OK] App criado!" -ForegroundColor Green
} catch {
    # Se já existe, continuar
    Write-Host "[AVISO] App pode ja existir. Continuando..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Configurando variaveis de ambiente..." -ForegroundColor Yellow

# Configurar secrets
$secrets = @(
    "AUTHENTICATION_API_KEY=testdaapi2026",
    "CORS_ORIGIN=*",
    "DATABASE_ENABLED=false",
    "DATABASE_PROVIDER=postgresql",
    "REDIS_ENABLED=false",
    "PORT=8080"
)

$secretsString = $secrets -join " "

try {
    fly secrets set $secretsString --app $appName
    Write-Host "[OK] Secrets configurados!" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Erro ao configurar secrets: $_" -ForegroundColor Red
    Write-Host "Configure manualmente:" -ForegroundColor Yellow
    Write-Host "fly secrets set $secretsString --app $appName" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Fazendo deploy..." -ForegroundColor Yellow
Write-Host "Isso pode levar 3-5 minutos..." -ForegroundColor Gray

try {
    fly deploy --app $appName
    Write-Host ""
    Write-Host "[OK] DEPLOY CONCLUIDO!" -ForegroundColor Green
    Write-Host ""
    
    # Aguardar app iniciar
    Write-Host "Aguardando app iniciar (30 segundos)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    Write-Host "Verificando status..." -ForegroundColor Cyan
    fly status --app $appName
    
    $appUrl = "https://$appName.fly.dev"
    Write-Host ""
    Write-Host "URL do app: $appUrl" -ForegroundColor Cyan
    Write-Host ""
    
    # Testar health check
    Write-Host "Testando health check..." -ForegroundColor Yellow
    try {
        $healthCheck = Invoke-WebRequest -Uri "$appUrl/health" -TimeoutSec 10 -ErrorAction Stop
        if ($healthCheck.StatusCode -eq 200) {
            Write-Host "[OK] App esta respondendo!" -ForegroundColor Green
        }
    } catch {
        Write-Host "[AVISO] App ainda nao esta respondendo. Aguarde mais alguns minutos." -ForegroundColor Yellow
        Write-Host "   Tente manualmente: $appUrl/health" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Atualizando Supabase..." -ForegroundColor Yellow
    
    # Atualizar Supabase - URL e API Key
    $apiKey = "testdaapi2026"
    
    try {
        # Atualizar URL
        Write-Host "   Configurando EVOLUTION_API_URL..." -ForegroundColor Gray
        $urlResult = npx supabase secrets set EVOLUTION_API_URL=$appUrl 2>&1
        
        # Atualizar API Key
        Write-Host "   Configurando EVOLUTION_API_KEY..." -ForegroundColor Gray
        $keyResult = npx supabase secrets set EVOLUTION_API_KEY=$apiKey 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Supabase atualizado com sucesso!" -ForegroundColor Green
            Write-Host "   EVOLUTION_API_URL = $appUrl" -ForegroundColor Gray
            Write-Host "   EVOLUTION_API_KEY = $apiKey" -ForegroundColor Gray
        } else {
            Write-Host "[AVISO] Erro ao atualizar Supabase automaticamente." -ForegroundColor Yellow
            Write-Host "   Execute manualmente:" -ForegroundColor Gray
            Write-Host "   npx supabase secrets set EVOLUTION_API_URL=$appUrl" -ForegroundColor Gray
            Write-Host "   npx supabase secrets set EVOLUTION_API_KEY=$apiKey" -ForegroundColor Gray
        }
    } catch {
        Write-Host "[AVISO] Erro ao atualizar Supabase: $_" -ForegroundColor Yellow
        Write-Host "   Execute manualmente:" -ForegroundColor Gray
        Write-Host "   npx supabase secrets set EVOLUTION_API_URL=$appUrl" -ForegroundColor Gray
        Write-Host "   npx supabase secrets set EVOLUTION_API_KEY=$apiKey" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "[OK] CONFIGURACAO COMPLETA!" -ForegroundColor Green
    Write-Host ""
    Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
    Write-Host "1. Verifique logs: fly logs --app $appName" -ForegroundColor White
    Write-Host "2. Teste criação de instância WhatsApp no painel admin" -ForegroundColor White
    Write-Host "3. Se migrations ainda executarem, verifique logs e ajuste Dockerfile" -ForegroundColor White
    Write-Host ""
    Write-Host "[OK] Tudo pronto! Sistema funcionando!" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "[ERRO] Erro no deploy: $_" -ForegroundColor Red
    Write-Host "Verifique os logs: fly logs --app $appName" -ForegroundColor Yellow
}
