# Script para vincular o projeto Supabase usando a senha encontrada nos arquivos

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "VINCULANDO PROJETO SUPABASE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$projectRef = "wabefmgfsatlusevxyfo"
$dbPassword = "pFgNQxhpdCkmxED1"  # Senha encontrada nos arquivos do projeto

Write-Host "Projeto: $projectRef" -ForegroundColor Yellow
Write-Host "Senha do banco: [OCULTA POR SEGURANCA]" -ForegroundColor Yellow
Write-Host ""

# Verificar se Supabase CLI está disponível
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCli) {
    Write-Host "ERRO: Supabase CLI nao encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale com:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor Cyan
    exit 1
}

Write-Host "Supabase CLI encontrado!" -ForegroundColor Green
Write-Host ""

# Verificar se está logado
Write-Host "[1/3] Verificando autenticacao..." -ForegroundColor Yellow

try {
    $projects = supabase projects list 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Nao esta logado. Fazendo login..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Siga as instrucoes na janela do navegador que vai abrir." -ForegroundColor Cyan
        Write-Host ""
        
        supabase login
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERRO: Falha ao fazer login" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "Login realizado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "Ja esta autenticado!" -ForegroundColor Green
    }
} catch {
    Write-Host "Erro ao verificar autenticacao: $_" -ForegroundColor Red
    Write-Host "Tentando fazer login mesmo assim..." -ForegroundColor Yellow
    supabase login
}

Write-Host ""
Write-Host "[2/3] Vinculando projeto..." -ForegroundColor Yellow

try {
    Write-Host "Executando: supabase link --project-ref $projectRef --password [OCULTA]" -ForegroundColor Gray
    
    # Vincular projeto
    $linkOutput = supabase link --project-ref $projectRef --password $dbPassword 2>&1 | Tee-Object -Variable linkResult
    
    Write-Host $linkOutput
    
    if ($LASTEXITCODE -eq 0 -or $linkOutput -match "Linked|linked|success|Success") {
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "SUCESSO! Projeto vinculado!" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "AVISO: Pode ter havido um problema ao vincular." -ForegroundColor Yellow
        Write-Host "Verifique a mensagem acima." -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "ERRO ao vincular: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tente manualmente:" -ForegroundColor Yellow
    Write-Host "  supabase link --project-ref $projectRef --password '$dbPassword'" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "[3/3] Verificando vinculacao..." -ForegroundColor Yellow

try {
    $status = supabase status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Status do projeto:" -ForegroundColor Green
        Write-Host $status
    } else {
        Write-Host "Nao foi possivel verificar status (pode ser normal se nao houver banco local)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Nao foi possivel verificar status" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "PROXIMOS PASSOS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agora voce pode:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Aplicar migrations:" -ForegroundColor Cyan
Write-Host "   supabase db push" -ForegroundColor White
Write-Host ""
Write-Host "2. Verificar migrations pendentes:" -ForegroundColor Cyan
Write-Host "   supabase db diff" -ForegroundColor White
Write-Host ""
Write-Host "3. Aplicar migration especifica:" -ForegroundColor Cyan
Write-Host "   .\aplicar-migration-agora.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Projeto vinculado com sucesso!" -ForegroundColor Green
Write-Host ""
