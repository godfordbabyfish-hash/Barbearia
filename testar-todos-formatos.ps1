# Script para testar TODOS os formatos sequencialmente

Write-Host "=== TESTANDO TODOS OS FORMATOS ===" -ForegroundColor Cyan
Write-Host ""

$senha = "pFgNQxhpdCkmxED1"
$projectRef = "wabefmgfsatlusevxyfo"

$formatos = @(
    @{
        Nome = "Formato 2: Usuario simples + pooler sa-east-1"
        String = "postgresql://postgres:$senha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
    },
    @{
        Nome = "Formato 3: Sem pooler (db direto)"
        String = "postgresql://postgres:$senha@db.$projectRef.supabase.co:5432/postgres"
    },
    @{
        Nome = "Formato 4: Com project ref + pooler us-east-1"
        String = "postgresql://postgres.$projectRef`:$senha@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
    },
    @{
        Nome = "Formato 5: Com project ref + pooler eu-west-1"
        String = "postgresql://postgres.$projectRef`:$senha@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
    },
    @{
        Nome = "Formato 6: Usuario simples + pooler us-east-1"
        String = "postgresql://postgres:$senha@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
    },
    @{
        Nome = "Formato 7: Usuario simples + pooler eu-west-1"
        String = "postgresql://postgres:$senha@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
    }
)

$env:Path += ";$env:USERPROFILE\.fly\bin"

foreach ($formato in $formatos) {
    Write-Host ""
    Write-Host "=== TESTANDO: $($formato.Nome) ===" -ForegroundColor Yellow
    Write-Host "String: $($formato.String)" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Configurando..." -ForegroundColor Cyan
    fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI=$($formato.String) --app evolution-api-barbearia | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Configurado! Aguardando 30 segundos..." -ForegroundColor Green
        Start-Sleep -Seconds 30
        
        Write-Host "Verificando logs..." -ForegroundColor Cyan
        $logs = fly logs --app evolution-api-barbearia --no-tail 2>&1 | Select-Object -Last 20
        
        if ($logs -match "Tenant or user not found") {
            Write-Host "[FALHOU] Ainda com erro 'Tenant or user not found'" -ForegroundColor Red
            Write-Host "Tentando proximo formato..." -ForegroundColor Yellow
            continue
        } elseif ($logs -match "PrismaClientInitializationError") {
            Write-Host "[FALHOU] Erro de inicializacao do Prisma" -ForegroundColor Red
            Write-Host "Tentando proximo formato..." -ForegroundColor Yellow
            continue
        } else {
            Write-Host ""
            Write-Host "[SUCESSO!] Este formato funcionou!" -ForegroundColor Green
            Write-Host "Connection string correta: $($formato.String)" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Fazendo deploy final..." -ForegroundColor Yellow
            fly deploy --app evolution-api-barbearia | Out-Null
            Write-Host "[OK] Deploy concluido!" -ForegroundColor Green
            exit 0
        }
    } else {
        Write-Host "[ERRO] Falha ao configurar" -ForegroundColor Red
        continue
    }
}

Write-Host ""
Write-Host "[AVISO] Nenhum formato funcionou automaticamente." -ForegroundColor Yellow
Write-Host "Pode ser necessario descobrir o host correto via SQL Editor." -ForegroundColor Cyan
Write-Host ""
