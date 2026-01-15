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

Write-Host "🌐 Iniciando servidor de desenvolvimento..." -ForegroundColor Green
Write-Host "📍 O servidor estará disponível em: http://localhost:8080" -ForegroundColor Cyan
Write-Host "📊 Logs de debug serão salvos em: .cursor\debug.log" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para parar o servidor, pressione Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Iniciar servidor de desenvolvimento
npm run dev
