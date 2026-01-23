# Script para rodar o frontend localmente

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RODAR FRONTEND LOCALMENTE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Verificar se existe arquivo .env
if (-not (Test-Path ".env")) {
    Write-Host "AVISO: Arquivo .env nao encontrado!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Criando .env com valores padrao..." -ForegroundColor Gray
    
    $envContent = @"
VITE_SUPABASE_URL=https://wabefmgfsatlusevxyfo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<REMOVIDO_ROTACIONAR_CHAVE_SUPABASE>
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding utf8
    Write-Host "OK Arquivo .env criado" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANTE: Verifique se as variaveis estao corretas!" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Iniciando servidor de desenvolvimento..." -ForegroundColor Yellow
Write-Host ""
Write-Host "O frontend estara disponivel em:" -ForegroundColor Cyan
Write-Host "  http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Gray
Write-Host ""

# Rodar o servidor
npm run dev
