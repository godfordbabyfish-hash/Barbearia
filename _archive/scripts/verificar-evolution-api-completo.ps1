# Script Completo de Verificacao da Evolution API
# Verifica tudo relacionado a inicializacao da API

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VERIFICACAO COMPLETA EVOLUTION API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar URL da API
Write-Host "1. Verificando URL da Evolution API..." -ForegroundColor Yellow
$apiUrl = "https://whatsapp-bot-barbearia-production.up.railway.app"
Write-Host "   URL: $apiUrl" -ForegroundColor Gray
Write-Host ""

# 2. Testar conexao com a API
Write-Host "2. Testando conexao com a API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 10 -Method GET -ErrorAction Stop
    Write-Host "   SUCESSO! API esta respondendo" -ForegroundColor Green
    Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Gray
    Write-Host "   Status Description: $($response.StatusDescription)" -ForegroundColor Gray
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 502) {
        Write-Host "   ERRO: API retornou 502 Bad Gateway" -ForegroundColor Red
        Write-Host "   A API pode estar inicializando ou reiniciando" -ForegroundColor Yellow
    } elseif ($statusCode -eq 404) {
        Write-Host "   ERRO: API retornou 404 Not Found" -ForegroundColor Red
        Write-Host "   Verifique se a URL esta correta" -ForegroundColor Yellow
    } elseif ($_.Exception.Message -like "*timeout*" -or $_.Exception.Message -like "*tempo limite*") {
        Write-Host "   ERRO: Timeout ao conectar" -ForegroundColor Red
        Write-Host "   A API pode estar muito lenta ou indisponivel" -ForegroundColor Yellow
    } else {
        Write-Host "   ERRO: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# 3. Verificar variaveis do Supabase
Write-Host "3. Verificando variaveis do Supabase..." -ForegroundColor Yellow
try {
    $secrets = npx supabase secrets list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Variaveis encontradas:" -ForegroundColor Green
        
        $hasUrl = $secrets -match "EVOLUTION_API_URL"
        $hasKey = $secrets -match "EVOLUTION_API_KEY"
        $hasInstance = $secrets -match "EVOLUTION_INSTANCE_NAME"
        
        if ($hasUrl) {
            Write-Host "   [OK] EVOLUTION_API_URL configurada" -ForegroundColor Green
            $urlLine = ($secrets | Select-String "EVOLUTION_API_URL").Line
            Write-Host "        $urlLine" -ForegroundColor Gray
        } else {
            Write-Host "   [ERRO] EVOLUTION_API_URL nao encontrada" -ForegroundColor Red
        }
        
        if ($hasKey) {
            Write-Host "   [OK] EVOLUTION_API_KEY configurada" -ForegroundColor Green
        } else {
            Write-Host "   [ERRO] EVOLUTION_API_KEY nao encontrada" -ForegroundColor Red
        }
        
        if ($hasInstance) {
            Write-Host "   [OK] EVOLUTION_INSTANCE_NAME configurada" -ForegroundColor Green
        } else {
            Write-Host "   [AVISO] EVOLUTION_INSTANCE_NAME nao encontrada (opcional)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ERRO: Nao foi possivel listar secrets" -ForegroundColor Red
        Write-Host "   Execute: npx supabase login" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ERRO: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 4. Testar endpoint de instancias
Write-Host "4. Testando endpoint de instancias..." -ForegroundColor Yellow
try {
    $instancesUrl = "$apiUrl/instance/fetchInstances"
    Write-Host "   URL: $instancesUrl" -ForegroundColor Gray
    
    $headers = @{
        "apikey" = "testdaapi2026"
    }
    
    $response = Invoke-WebRequest -Uri $instancesUrl -Headers $headers -TimeoutSec 10 -Method GET -ErrorAction Stop
    Write-Host "   SUCESSO! Endpoint de instancias esta funcionando" -ForegroundColor Green
    Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Gray
    
    try {
        $data = $response.Content | ConvertFrom-Json
        if ($data -is [Array]) {
            Write-Host "   Instancias encontradas: $($data.Count)" -ForegroundColor Green
        } elseif ($data.data -is [Array]) {
            Write-Host "   Instancias encontradas: $($data.data.Count)" -ForegroundColor Green
        } else {
            Write-Host "   Resposta recebida (formato desconhecido)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "   Resposta recebida (nao e JSON)" -ForegroundColor Gray
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 502) {
        Write-Host "   ERRO: 502 Bad Gateway - API nao esta respondendo" -ForegroundColor Red
        Write-Host "   A API esta inicializando ou reiniciando" -ForegroundColor Yellow
    } elseif ($statusCode -eq 403) {
        Write-Host "   ERRO: 403 Forbidden - API Key pode estar incorreta" -ForegroundColor Red
        Write-Host "   Verifique EVOLUTION_API_KEY no Supabase" -ForegroundColor Yellow
    } elseif ($statusCode -eq 401) {
        Write-Host "   ERRO: 401 Unauthorized - Autenticacao falhou" -ForegroundColor Red
    } else {
        Write-Host "   ERRO: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# 5. Verificar codigo do frontend
Write-Host "5. Verificando codigo do frontend..." -ForegroundColor Yellow
$whatsappManagerPath = "src/components/admin/WhatsAppManager.tsx"
if (Test-Path $whatsappManagerPath) {
    $content = Get-Content $whatsappManagerPath -Raw
    
    $hasCache = $content -match "localStorage" -or $content -match "CACHE_KEYS"
    $hasWasWorking = $content -match "wasApiWorkingRecently"
    $hasMarkSuccess = $content -match "markApiSuccess"
    
    if ($hasCache) {
        Write-Host "   [OK] Sistema de cache implementado" -ForegroundColor Green
    } else {
        Write-Host "   [AVISO] Sistema de cache nao encontrado" -ForegroundColor Yellow
    }
    
    if ($hasWasWorking) {
        Write-Host "   [OK] Funcao de verificacao de historico implementada" -ForegroundColor Green
    } else {
        Write-Host "   [AVISO] Funcao de verificacao nao encontrada" -ForegroundColor Yellow
    }
    
    if ($hasMarkSuccess) {
        Write-Host "   [OK] Funcao de marcacao de sucesso implementada" -ForegroundColor Green
    } else {
        Write-Host "   [AVISO] Funcao de marcacao nao encontrada" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [ERRO] Arquivo WhatsAppManager.tsx nao encontrado" -ForegroundColor Red
}
Write-Host ""

# 6. Resumo e recomendacoes
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO E RECOMENDACOES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Se a API retornou 502:" -ForegroundColor Yellow
Write-Host "1. Aguarde 2-3 minutos (Railway pode estar reiniciando)" -ForegroundColor White
Write-Host "2. Tente novamente: Invoke-WebRequest -Uri $apiUrl -TimeoutSec 10" -ForegroundColor Gray
Write-Host "3. Verifique logs no Railway dashboard" -ForegroundColor White
Write-Host ""

Write-Host "Se as variaveis do Supabase estao faltando:" -ForegroundColor Yellow
Write-Host "1. Execute: npx supabase login" -ForegroundColor White
Write-Host "2. Execute: npx supabase link --project-ref wabefmgfsatlusevxyfo" -ForegroundColor White
Write-Host "3. Configure as variaveis:" -ForegroundColor White
Write-Host "   npx supabase secrets set EVOLUTION_API_URL=$apiUrl" -ForegroundColor Gray
Write-Host "   npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026" -ForegroundColor Gray
Write-Host ""

Write-Host "Se o codigo nao tem cache:" -ForegroundColor Yellow
Write-Host "1. Verifique se o commit foi feito: git log --oneline -5" -ForegroundColor White
Write-Host "2. Recarregue a pagina do painel WhatsApp" -ForegroundColor White
Write-Host "3. Limpe o cache do navegador (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host ""

Write-Host "Documentacao:" -ForegroundColor Yellow
Write-Host "- SOLUCAO_INICIALIZACAO_API.md" -ForegroundColor White
Write-Host ""
