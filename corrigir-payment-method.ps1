#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CORRIGINDO PAYMENT_METHOD" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se supabase CLI está instalado
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "[ERRO] Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host "[INFO] Instale com: npm install -g supabase" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Executando correção via Edge Function..." -ForegroundColor Yellow
    
    # Tentar via Edge Function
    try {
        $response = Invoke-RestMethod -Uri "https://wabefmgfsatlusevxyfo.supabase.co/functions/v1/api" -Method POST -Headers @{
            "Content-Type" = "application/json"
            "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc"
        } -Body (@{
            action = "execute-sql"
            sql = Get-Content "corrigir-payment-method.sql" -Raw
        } | ConvertTo-Json)
        
        Write-Host "[OK] Correção aplicada via Edge Function!" -ForegroundColor Green
        Write-Host "Resposta: $($response | ConvertTo-Json)" -ForegroundColor Gray
    }
    catch {
        Write-Host "[ERRO] Falha na correção via Edge Function: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "SOLUÇÃO MANUAL:" -ForegroundColor Yellow
        Write-Host "1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql" -ForegroundColor Cyan
        Write-Host "2. Execute o conteúdo do arquivo: corrigir-payment-method.sql" -ForegroundColor Cyan
        Write-Host "3. Teste novamente a conclusão de agendamento" -ForegroundColor Cyan
    }
    
    pause
    exit
}

Write-Host "[INFO] Supabase CLI encontrado!" -ForegroundColor Green
Write-Host ""

# Verificar se está logado
Write-Host "[INFO] Verificando login no Supabase..." -ForegroundColor Yellow
$loginStatus = supabase status 2>&1
if ($loginStatus -match "Not logged in") {
    Write-Host "[AVISO] Não está logado no Supabase" -ForegroundColor Yellow
    Write-Host "[INFO] Fazendo login..." -ForegroundColor Yellow
    supabase login
}

# Verificar se projeto está linkado
Write-Host "[INFO] Verificando projeto linkado..." -ForegroundColor Yellow
$projectStatus = supabase status 2>&1
if ($projectStatus -match "Not linked") {
    Write-Host "[INFO] Linkando projeto..." -ForegroundColor Yellow
    supabase link --project-ref wabefmgfsatlusevxyfo
}

# Executar correção
Write-Host ""
Write-Host "[INFO] Executando correção do payment_method..." -ForegroundColor Yellow
Write-Host ""

try {
    # Executar SQL via Supabase CLI
    $result = Get-Content "corrigir-payment-method.sql" | supabase db query
    
    Write-Host "[OK] Correção executada com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resultado:" -ForegroundColor Gray
    Write-Host $result -ForegroundColor Gray
    Write-Host ""
    Write-Host "[INFO] Agora teste novamente a conclusão de agendamento no painel do barbeiro" -ForegroundColor Cyan
}
catch {
    Write-Host "[ERRO] Falha na execução: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUÇÃO MANUAL:" -ForegroundColor Yellow
    Write-Host "1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql" -ForegroundColor Cyan
    Write-Host "2. Execute o conteúdo do arquivo: corrigir-payment-method.sql" -ForegroundColor Cyan
    Write-Host "3. Teste novamente a conclusão de agendamento" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
pause