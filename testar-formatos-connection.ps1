# Script para testar diferentes formatos de connection string do Supabase

Write-Host "=== TESTAR FORMATOS DE CONNECTION STRING ===" -ForegroundColor Cyan
Write-Host ""

$senha = "pFgNQxhpdCkmxED1"
$projectRef = "wabefmgfsatlusevxyfo"

$formatos = @(
    @{
        Nome = "Formato 1: Com project ref + pooler sa-east-1"
        String = "postgresql://postgres.$projectRef`:$senha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
    },
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
    }
)

Write-Host "Formatos que vamos testar:" -ForegroundColor Yellow
Write-Host ""

foreach ($formato in $formatos) {
    Write-Host "$($formato.Nome):" -ForegroundColor White
    Write-Host $formato.String -ForegroundColor Gray
    Write-Host ""
}

Write-Host "=== CONFIGURAR E TESTAR ===" -ForegroundColor Cyan
Write-Host ""

$escolha = Read-Host "Qual formato deseja testar primeiro? (1-5) [1]"

if ([string]::IsNullOrWhiteSpace($escolha)) {
    $escolha = "1"
}

$indice = [int]$escolha - 1

if ($indice -ge 0 -and $indice -lt $formatos.Count) {
    $formatoEscolhido = $formatos[$indice]
    
    Write-Host ""
    Write-Host "Formatando: $($formatoEscolhido.Nome)" -ForegroundColor Yellow
    Write-Host "String: $($formatoEscolhido.String)" -ForegroundColor Gray
    Write-Host ""
    
    $env:Path += ";$env:USERPROFILE\.fly\bin"
    
    Write-Host "Configurando..." -ForegroundColor Yellow
    fly secrets set DATABASE_ENABLED=true DATABASE_PROVIDER=postgresql DATABASE_CONNECTION_URI=$($formatoEscolhido.String) --app evolution-api-barbearia
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Configurado! Fazendo deploy..." -ForegroundColor Green
        Write-Host ""
        
        fly deploy --app evolution-api-barbearia
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "[OK] DEPLOY INICIADO!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Aguarde 2-3 minutos e verifique os logs:" -ForegroundColor Yellow
            Write-Host "  fly logs --app evolution-api-barbearia" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Se der erro 'Tenant or user not found', tente outro formato." -ForegroundColor Cyan
        }
    } else {
        Write-Host "[ERRO] Falha ao configurar" -ForegroundColor Red
    }
} else {
    Write-Host "[ERRO] Formato invalido!" -ForegroundColor Red
}

Write-Host ""
