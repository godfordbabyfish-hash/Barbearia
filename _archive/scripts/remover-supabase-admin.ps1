# Script para remover Supabase CLI com permissões de administrador
# Execute este script como Administrador

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "REMOVENDO SUPABASE CLI (ADMIN)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está executando como admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "AVISO: Este script precisa ser executado como Administrador!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Opcoes:" -ForegroundColor Yellow
    Write-Host "1. Clique com botao direito no PowerShell e escolha 'Executar como Administrador'" -ForegroundColor Cyan
    Write-Host "2. Ou execute manualmente:" -ForegroundColor Cyan
    Write-Host "   Remove-Item 'C:\WINDOWS\system32\supabase.exe' -Force" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "Executando como Administrador - OK!" -ForegroundColor Green
Write-Host ""

# Localizações possíveis do Supabase CLI
$cliPaths = @(
    "C:\WINDOWS\system32\supabase.exe",
    "C:\Program Files\Supabase\supabase.exe",
    "C:\Program Files (x86)\Supabase\supabase.exe",
    "$env:USERPROFILE\AppData\Local\Programs\supabase\supabase.exe",
    "$env:ProgramFiles\nodejs\node_modules\supabase\bin\supabase.exe"
)

foreach ($path in $cliPaths) {
    if (Test-Path $path) {
        Write-Host "Removendo: $path" -ForegroundColor Yellow
        try {
            Remove-Item -Path $path -Force -ErrorAction Stop
            Write-Host "  Removido com sucesso!" -ForegroundColor Green
        } catch {
            Write-Host "  Erro ao remover: $_" -ForegroundColor Red
            Write-Host "  Tente fechar todos os terminais e processos relacionados." -ForegroundColor Yellow
        }
    }
}

# Remover do PATH (se estiver lá)
Write-Host ""
Write-Host "Verificando PATH do sistema..." -ForegroundColor Yellow

$systemPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")

$pathsToCheck = @($systemPath, $userPath)
$modified = $false

foreach ($path in $pathsToCheck) {
    if ($path -match "supabase") {
        Write-Host "Encontrada referencia ao Supabase no PATH" -ForegroundColor Yellow
        $newPath = $path -replace "[^;]*supabase[^;]*;?", ""
        Write-Host "Deseja remover do PATH? (S/N) [N]" -ForegroundColor Yellow
        $remove = Read-Host
        if ($remove -eq 'S' -or $remove -eq 's') {
            if ($path -eq $systemPath) {
                [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
                Write-Host "Removido do PATH do sistema!" -ForegroundColor Green
            } else {
                [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
                Write-Host "Removido do PATH do usuario!" -ForegroundColor Green
            }
            $modified = $true
        }
    }
}

if ($modified) {
    Write-Host ""
    Write-Host "IMPORTANTE: Reinicie o terminal para que as mudancas no PATH tenham efeito!" -ForegroundColor Yellow
}

# Verificação final
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "VERIFICACAO FINAL" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$finalCheck = Get-Command supabase -ErrorAction SilentlyContinue
if ($finalCheck) {
    Write-Host "AVISO: Supabase CLI ainda encontrado em: $($finalCheck.Source)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tente:" -ForegroundColor Yellow
    Write-Host "1. Fechar TODOS os terminais PowerShell/CMD" -ForegroundColor Cyan
    Write-Host "2. Reiniciar o computador" -ForegroundColor Cyan
    Write-Host "3. Depois executar novamente este script" -ForegroundColor Cyan
} else {
    Write-Host "SUCESSO! Supabase CLI removido completamente!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Limpanca concluida!" -ForegroundColor Green
Write-Host ""
