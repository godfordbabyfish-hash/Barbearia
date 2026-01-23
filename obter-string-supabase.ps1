# Script para ajudar a obter connection string do Supabase

Write-Host "=== OBTER CONNECTION STRING DO SUPABASE ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "OPCOES PARA OBTER A CONNECTION STRING:" -ForegroundColor Yellow
Write-Host ""

Write-Host "OPCAO 1: Via Dashboard - Connection" -ForegroundColor White
Write-Host "1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database/connection" -ForegroundColor Gray
Write-Host "2. Procure por 'Connection pooling' ou 'Connection string'" -ForegroundColor Gray
Write-Host "3. Copie a string que comeca com 'postgresql://'" -ForegroundColor Gray
Write-Host ""

Write-Host "OPCAO 2: Resetar Senha e Construir Manualmente" -ForegroundColor White
Write-Host "1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database" -ForegroundColor Gray
Write-Host "2. Clique em 'Reset database password'" -ForegroundColor Gray
Write-Host "3. Copie a senha gerada" -ForegroundColor Gray
Write-Host "4. Use o formato abaixo (substitua [SENHA]):" -ForegroundColor Gray
Write-Host ""

$formato = "postgresql://postgres.wabefmgfsatlusevxyfo:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
Write-Host "FORMATO:" -ForegroundColor Yellow
Write-Host $formato -ForegroundColor Cyan
Write-Host ""

Write-Host "OPCAO 3: Via API Settings" -ForegroundColor White
Write-Host "1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/api" -ForegroundColor Gray
Write-Host "2. Procure por 'Database URL' ou 'Connection string'" -ForegroundColor Gray
Write-Host ""

Write-Host "=== DEPOIS DE OBTER A STRING ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Execute:" -ForegroundColor White
Write-Host "  .\configurar-com-supabase-agora.ps1" -ForegroundColor Cyan
Write-Host ""

$escolha = Read-Host "Deseja tentar construir manualmente agora? (S/N)"

if ($escolha -eq 'S' -or $escolha -eq 's') {
    Write-Host ""
    Write-Host "Para construir manualmente, preciso da senha do banco." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database" -ForegroundColor White
    Write-Host "2. Clique em 'Reset database password'" -ForegroundColor White
    Write-Host "3. Copie a senha gerada" -ForegroundColor White
    Write-Host ""
    
    $senha = Read-Host "Cole a senha do banco aqui"
    
    if (-not [string]::IsNullOrWhiteSpace($senha)) {
        # Tentar diferentes regiões
        $regioes = @("sa-east-1", "us-east-1", "eu-west-1", "ap-southeast-1")
        
        Write-Host ""
        Write-Host "Connection strings geradas (tente a primeira):" -ForegroundColor Yellow
        Write-Host ""
        
        foreach ($regiao in $regioes) {
            $connString = "postgresql://postgres.wabefmgfsatlusevxyfo:$senha@aws-0-$regiao.pooler.supabase.com:6543/postgres"
            Write-Host "Regiao $regiao :" -ForegroundColor Gray
            Write-Host $connString -ForegroundColor Cyan
            Write-Host ""
        }
        
        Write-Host "Use a primeira (sa-east-1) ou teste as outras se nao funcionar." -ForegroundColor Yellow
        Write-Host ""
        
        $usar = Read-Host "Deseja configurar agora com a primeira string? (S/N)"
        
        if ($usar -eq 'S' -or $usar -eq 's') {
            $connString = "postgresql://postgres.wabefmgfsatlusevxyfo:$senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
            
            Write-Host ""
            Write-Host "Configurando..." -ForegroundColor Yellow
            
            $env:Path += ";$env:USERPROFILE\.fly\bin"
            
            try {
                fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI=$connString --app evolution-api-barbearia
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "[OK] Configurado! Fazendo deploy..." -ForegroundColor Green
                    fly deploy --app evolution-api-barbearia
                    
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host ""
                        Write-Host "[OK] DEPLOY INICIADO!" -ForegroundColor Green
                        Write-Host "Aguarde 2-3 minutos e teste: https://evolution-api-barbearia.fly.dev/health" -ForegroundColor Cyan
                    }
                }
            } catch {
                Write-Host "[ERRO] Erro ao configurar: $_" -ForegroundColor Red
            }
        }
    }
}

Write-Host ""
