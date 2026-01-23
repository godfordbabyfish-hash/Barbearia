# Script para configurar Render automaticamente via API
# Nota: O Render CLI pode não ter todas as funcionalidades necessárias
# Este script tenta usar a API do Render se disponível

Write-Host "🚀 Configurando Render Evolution API..." -ForegroundColor Cyan
Write-Host ""

# Verificar se o Render CLI está instalado
$renderPath = Get-Command render -ErrorAction SilentlyContinue

if (-not $renderPath) {
    Write-Host "⚠️  Render CLI não encontrado." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📥 Tentando instalar Render CLI..." -ForegroundColor Yellow
    
    # Tentar baixar do GitHub
    $tempPath = "$env:TEMP\render.exe"
    $downloadUrl = "https://github.com/renderinc/cli/releases/latest/download/render-windows-x86_64.exe"
    
    try {
        Write-Host "   Baixando de: $downloadUrl" -ForegroundColor Gray
        Invoke-WebRequest -Uri $downloadUrl -OutFile $tempPath -UseBasicParsing
        Write-Host "✅ Download concluído!" -ForegroundColor Green
        
        # Mover para pasta no PATH
        $localBin = "$env:USERPROFILE\bin"
        if (-not (Test-Path $localBin)) {
            New-Item -ItemType Directory -Path $localBin -Force | Out-Null
        }
        
        Copy-Item $tempPath "$localBin\render.exe" -Force
        Write-Host "✅ Render CLI instalado em: $localBin\render.exe" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  IMPORTANTE: Adicione ao PATH ou use o caminho completo:" -ForegroundColor Yellow
        Write-Host "   $localBin\render.exe" -ForegroundColor Gray
        Write-Host ""
        
        $renderExe = "$localBin\render.exe"
    } catch {
        Write-Host "❌ Erro ao baixar Render CLI: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "📝 SOLUÇÃO MANUAL:" -ForegroundColor Yellow
        Write-Host "   1. Acesse: https://render.com/docs/cli" -ForegroundColor Gray
        Write-Host "   2. Baixe o executável para Windows" -ForegroundColor Gray
        Write-Host "   3. Adicione ao PATH ou use o caminho completo" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   OU siga o guia: EXECUTAR_AGORA_RENDER.md" -ForegroundColor Yellow
        exit 1
    }
} else {
    $renderExe = "render"
    Write-Host "✅ Render CLI encontrado!" -ForegroundColor Green
    Write-Host ""
}

# Verificar se está autenticado
Write-Host "🔐 Verificando autenticação..." -ForegroundColor Yellow
try {
    $authCheck = & $renderExe whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Não autenticado. Fazendo login..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📝 Você precisa fazer login manualmente:" -ForegroundColor Yellow
        Write-Host "   Execute: $renderExe login" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   OU configure a API key:" -ForegroundColor Yellow
        Write-Host "   \$env:RENDER_API_KEY = 'sua-api-key'" -ForegroundColor Gray
        Write-Host ""
        exit 1
    } else {
        Write-Host "✅ Autenticado!" -ForegroundColor Green
        Write-Host "   $authCheck" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erro ao verificar autenticação: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "📝 Execute manualmente: $renderExe login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "⚠️  LIMITAÇÃO DO RENDER CLI:" -ForegroundColor Yellow
Write-Host "   O Render CLI não suporta modificar 'Docker Command' diretamente." -ForegroundColor Gray
Write-Host "   Essa configuração precisa ser feita manualmente no dashboard." -ForegroundColor Gray
Write-Host ""

# Tentar atualizar variáveis de ambiente (se o serviço ID for conhecido)
Write-Host "📝 Para configurar via CLI, você precisa:" -ForegroundColor Yellow
Write-Host "   1. Obter o Service ID do Render" -ForegroundColor Gray
Write-Host "   2. Usar: $renderExe env set <SERVICE_ID> KEY=value" -ForegroundColor Gray
Write-Host ""

# Solicitar Service ID
$serviceId = Read-Host "Digite o Service ID do evolution-api (ou pressione Enter para pular)"

if ($serviceId) {
    Write-Host ""
    Write-Host "🔧 Configurando variáveis de ambiente..." -ForegroundColor Yellow
    
    $envVars = @{
        "AUTHENTICATION_API_KEY" = "testdaapi2026"
        "CORS_ORIGIN" = "*"
        "DATABASE_ENABLED" = "false"
        "DATABASE_PROVIDER" = "postgresql"
        "REDIS_ENABLED" = "false"
        "PORT" = "8080"
    }
    
    foreach ($key in $envVars.Keys) {
        $value = $envVars[$key]
        Write-Host "   Configurando: $key=$value" -ForegroundColor Gray
        try {
            & $renderExe env set $serviceId "$key=$value" 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ $key configurado" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  Erro ao configurar $key" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   ❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "✅ Variáveis de ambiente configuradas!" -ForegroundColor Green
} else {
    Write-Host "⏭️  Pulando configuração de variáveis via CLI" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS MANUAIS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Acesse: https://dashboard.render.com" -ForegroundColor White
Write-Host "2. Vá em Settings → Build & Deploy → Docker Command" -ForegroundColor White
Write-Host "3. Adicione: npm start" -ForegroundColor White
Write-Host "4. Verifique Pre-Deploy Command (deve estar vazio)" -ForegroundColor White
Write-Host "5. Aguarde o redeploy" -ForegroundColor White
Write-Host ""
Write-Host "📄 Veja o guia completo: EXECUTAR_AGORA_RENDER.md" -ForegroundColor Cyan
Write-Host ""
