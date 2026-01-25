# Script para vincular projeto desabilitando proxy temporariamente
# E aplicar migration

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "VINCULANDO PROJETO (SEM PROXY)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$projectRef = "wabefmgfsatlusevxyfo"
$dbPassword = "pFgNQxhpdCkmxED1"

# Desabilitar proxy temporariamente
Write-Host "Desabilitando proxy temporariamente..." -ForegroundColor Yellow
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
$env:http_proxy = ""
$env:https_proxy = ""
$env:NO_PROXY = "*"
$env:no_proxy = "*"

Write-Host "  ✅ Proxy desabilitado" -ForegroundColor Green
Write-Host ""

# Tentar fazer link
Write-Host "Fazendo link do projeto..." -ForegroundColor Yellow
Write-Host "  Project Ref: $projectRef" -ForegroundColor Gray
Write-Host "  Senha: $dbPassword" -ForegroundColor Gray
Write-Host ""

# Tentar link com senha via stdin
try {
    # Criar arquivo temporário com senha
    $tempPasswordFile = "$env:TEMP\supabase_password.txt"
    $dbPassword | Out-File -FilePath $tempPasswordFile -Encoding ASCII -NoNewline
    
    Write-Host "Executando: supabase link --project-ref $projectRef" -ForegroundColor Gray
    
    # Tentar passar senha via arquivo
    Get-Content $tempPasswordFile | supabase link --project-ref $projectRef --password $dbPassword 2>&1 | Tee-Object -Variable linkOutput
    
    Remove-Item $tempPasswordFile -ErrorAction SilentlyContinue
    
    Write-Host $linkOutput
    
    if ($LASTEXITCODE -eq 0 -or $linkOutput -match "Linked|linked|Success|success") {
        Write-Host ""
        Write-Host "✅ Projeto vinculado!" -ForegroundColor Green
        Write-Host ""
        
        # Tentar aplicar migration
        Write-Host "Aplicando migration..." -ForegroundColor Yellow
        $pushOutput = supabase db push 2>&1 | Tee-Object -Variable output
        
        Write-Host $pushOutput
        
        if ($LASTEXITCODE -eq 0 -or $output -match "Applied|applied|success|Migration|migration|Finished") {
            Write-Host ""
            Write-Host "============================================" -ForegroundColor Green
            Write-Host "SUCESSO! Migration aplicada!" -ForegroundColor Green
            Write-Host "============================================" -ForegroundColor Green
            exit 0
        }
    } else {
        Write-Host ""
        Write-Host "⚠️ Link pode precisar ser feito manualmente" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "INSTRUCOES MANUAIS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Execute manualmente no terminal:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Vincular projeto:" -ForegroundColor White
Write-Host "   supabase link --project-ref $projectRef" -ForegroundColor Cyan
Write-Host "   (Quando pedir senha, digite: $dbPassword)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Aplicar migration:" -ForegroundColor White
Write-Host "   supabase db push" -ForegroundColor Cyan
Write-Host ""
Write-Host "OU use o SQL Editor:" -ForegroundColor Yellow
Write-Host "   https://supabase.com/dashboard/project/$projectRef/sql/new" -ForegroundColor Cyan
Write-Host ""
