# Script para executar o SQL do reminder automaticamente
# Usa a service_role_key dos secrets do Supabase

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "EXECUTANDO SQL DO LEMBRETE AUTOMATICAMENTE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Ler o arquivo SQL
$sqlFile = "EXECUTAR_AGORA_REMINDER.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "ERRO: Arquivo $sqlFile nao encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host "Lendo arquivo SQL..." -ForegroundColor Yellow
$sqlContent = Get-Content $sqlFile -Raw

# Obter a service_role_key via Supabase CLI
Write-Host "Obtendo service_role_key dos secrets..." -ForegroundColor Yellow

# Infelizmente, o Supabase CLI não permite obter o valor real dos secrets
# Apenas os hashes. Vamos criar uma solução alternativa:

# Opção 1: Usar uma Edge Function que executa o SQL
Write-Host ""
Write-Host "OPCAO 1: Executar via Edge Function (recomendado)" -ForegroundColor Cyan
Write-Host "1. Deploy da Edge Function setup-reminder-cron" -ForegroundColor White
Write-Host "2. Chamar a função via HTTP" -ForegroundColor White
Write-Host ""

$deployFunction = Read-Host "Deseja fazer deploy da Edge Function e executar? (S/N) [S]"

if ($deployFunction -ne 'N' -and $deployFunction -ne 'n') {
    Write-Host "Fazendo deploy da Edge Function..." -ForegroundColor Yellow
    npx supabase functions deploy setup-reminder-cron --no-verify-jwt
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Edge Function deployada com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Chamando a função..." -ForegroundColor Yellow
        
        $supabaseUrl = "https://wabefmgfsatlusevxyfo.supabase.co"
        $functionUrl = "$supabaseUrl/functions/v1/setup-reminder-cron"
        
        # Obter anon key para autenticação
        $anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc"
        
        $response = Invoke-RestMethod -Uri $functionUrl -Method POST -Headers @{
            "Content-Type" = "application/json"
            "apikey" = $anonKey
            "Authorization" = "Bearer $anonKey"
        }
        
        Write-Host "Resposta: $($response | ConvertTo-Json)" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "OPCAO 2: Executar manualmente no SQL Editor" -ForegroundColor Cyan
    Write-Host "1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new" -ForegroundColor White
    Write-Host "2. Obtenha sua SERVICE_ROLE_KEY em: Settings > API > service_role key" -ForegroundColor White
    Write-Host "3. Abra o arquivo EXECUTAR_AGORA_REMINDER.sql" -ForegroundColor White
    Write-Host "4. Substitua 'YOUR_SERVICE_ROLE_KEY' pela sua chave real" -ForegroundColor White
    Write-Host "5. Cole e execute no SQL Editor" -ForegroundColor White
}

Write-Host ""
Write-Host "Pronto!" -ForegroundColor Green
