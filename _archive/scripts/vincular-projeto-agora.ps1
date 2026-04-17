# Script para vincular o projeto Supabase
# Fornece instruções e comando exato para executar

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "VINCULAR PROJETO SUPABASE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$projectRef = "wabefmgfsatlusevxyfo"
$dbPassword = "pFgNQxhpdCkmxED1"  # Senha encontrada nos arquivos

Write-Host "Projeto: $projectRef" -ForegroundColor Yellow
Write-Host "Senha encontrada nos arquivos: SIM" -ForegroundColor Green
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

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "INSTRUCOES PARA VINCULAR" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "PASSO 1: Fazer login no Supabase CLI" -ForegroundColor Yellow
Write-Host "Execute este comando em um terminal interativo:" -ForegroundColor White
Write-Host ""
Write-Host "  supabase login" -ForegroundColor Cyan
Write-Host ""
Write-Host "  (Isso vai abrir o navegador para autenticacao)" -ForegroundColor Gray
Write-Host ""

Write-Host "PASSO 2: Vincular o projeto" -ForegroundColor Yellow
Write-Host "Depois de fazer login, execute:" -ForegroundColor White
Write-Host ""
Write-Host "  supabase link --project-ref $projectRef --password '$dbPassword'" -ForegroundColor Cyan
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "COMANDO COMPLETO (COPIE E EXECUTE)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$comandoCompleto = "supabase link --project-ref $projectRef --password '$dbPassword'"
Write-Host $comandoCompleto -ForegroundColor Green
Write-Host ""

# Tentar copiar para área de transferência
try {
    Set-Clipboard -Value $comandoCompleto
    Write-Host "COMANDO COPIADO PARA AREA DE TRANSFERENCIA!" -ForegroundColor Green
    Write-Host "(Cole no terminal com Ctrl+V)" -ForegroundColor Gray
} catch {
    Write-Host "Nao foi possivel copiar automaticamente." -ForegroundColor Yellow
    Write-Host "Copie o comando acima manualmente." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "ALTERNATIVA: Executar Diretamente" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se ja estiver logado, posso tentar vincular agora:" -ForegroundColor Yellow
$executar = Read-Host "Deseja tentar vincular agora? (S/N) [N]"

if ($executar -eq 'S' -or $executar -eq 's') {
    Write-Host ""
    Write-Host "Tentando vincular..." -ForegroundColor Yellow
    
    try {
        # Tentar vincular diretamente
        $linkOutput = supabase link --project-ref $projectRef --password $dbPassword 2>&1 | Tee-Object -Variable linkResult
        
        Write-Host $linkOutput
        
        if ($LASTEXITCODE -eq 0 -or $linkOutput -match "Linked|linked|success|Success") {
            Write-Host ""
            Write-Host "============================================" -ForegroundColor Green
            Write-Host "SUCESSO! Projeto vinculado!" -ForegroundColor Green
            Write-Host "============================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Agora voce pode aplicar migrations:" -ForegroundColor Yellow
            Write-Host "  supabase db push" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "Nao foi possivel vincular automaticamente." -ForegroundColor Yellow
            Write-Host "Siga os passos acima para fazer login primeiro." -ForegroundColor Yellow
        }
    } catch {
        Write-Host ""
        Write-Host "Erro: $_" -ForegroundColor Red
        Write-Host "Siga os passos acima para fazer login primeiro." -ForegroundColor Yellow
    }
}

Write-Host ""
