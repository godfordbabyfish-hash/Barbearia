@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo ========================================
echo   INICIANDO SISTEMA BARBEARIA
echo ========================================
echo.

set TOOLS_DIR=%~dp0tools
set NODE_VERSION=20.19.0
set NODE_ZIP=node-v%NODE_VERSION%-win-x64.zip
set NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/%NODE_ZIP%
set NODE_DIR=%TOOLS_DIR%\node-v%NODE_VERSION%-win-x64
set RAND=%RANDOM%
set NODE_ZIP_BASENAME=node-v%NODE_VERSION%-win-x64
set NODE_ZIP_PATH=%TOOLS_DIR%\%NODE_ZIP_BASENAME%-%RAND%.zip
where node >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%NODE_DIR%\node.exe" (
        set PATH=%NODE_DIR%;%PATH%
    ) else (
        echo [INFO] Node.js nao encontrado. Instalando versao portavel...
        if not exist "%TOOLS_DIR%" mkdir "%TOOLS_DIR%"
        powershell -NoLogo -NoProfile -Command "Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_ZIP_PATH%'" || (
            curl.exe -L "%NODE_URL%" -o "%NODE_ZIP_PATH%" || (
                echo [ERRO] Falha ao baixar Node.js
                pause
                exit /b 1
            )
        )
        powershell -NoLogo -NoProfile -Command "Expand-Archive -Path '%NODE_ZIP_PATH%' -DestinationPath '%TOOLS_DIR%' -Force" || (
            echo [ERRO] Falha ao extrair Node.js
            pause
            exit /b 1
        )
        set PATH=%NODE_DIR%;%PATH%
    )
)
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js ainda nao encontrado
    pause
    exit /b 1
)

set "NPM_CMD="
where npm >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%NODE_DIR%\npm.cmd" (
        set "NPM_CMD=%NODE_DIR%\npm.cmd"
        echo [INFO] Usando npm portavel
    ) else (
        echo [ERRO] npm nao encontrado
        pause
        exit /b 1
    )
)

echo [OK] Ambiente Node.js pronto!
echo.

REM Verificar se node_modules existe
if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    if defined NPM_CMD (
        call %NPM_CMD% install
    ) else (
        call npm install
    )
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependencias!
        pause
        exit /b 1
    )
    echo.
)

REM Verificar se .env existe
if not exist ".env" (
    echo [AVISO] Arquivo .env nao encontrado!
    echo [INFO] Criando .env com configuracoes padrao...
    echo.
    
    (
        echo VITE_SUPABASE_PROJECT_ID=wabefmgfsatlusevxyfo
        echo VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc
        echo VITE_SUPABASE_URL=https://wabefmgfsatlusevxyfo.supabase.co
    ) > .env
    
    echo [OK] Arquivo .env criado!
    echo.
)

echo ========================================
echo   SERVIDOR DE DESENVOLVIMENTO
echo ========================================
echo.

REM Verificar se a porta 8080 está em uso
echo [INFO] Verificando porta 8080...
netstat -ano | findstr :8080 >nul 2>&1
if %errorlevel% equ 0 (
    echo [AVISO] Porta 8080 ja esta em uso!
    echo [INFO] Tentando parar processos na porta 8080...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080') do (
        echo [INFO] Parando processo %%a...
        taskkill /PID %%a /F >nul 2>&1
    )
    timeout /t 2 >nul
    echo.
)

REM Obter IP local
echo [INFO] Obtendo IP local...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set LOCAL_IP=%%a
    set LOCAL_IP=!LOCAL_IP: =!
    goto :found_ip
)
:found_ip

REM Iniciar servidor de desenvolvimento
echo.
echo ========================================
echo   SERVIDOR INICIANDO...
echo ========================================
echo.
echo [INFO] Iniciando servidor de desenvolvimento...
echo [INFO] Aguarde alguns segundos para o servidor iniciar...
echo.
echo O servidor estara disponivel em:
echo   - Local: http://localhost:8080
if defined LOCAL_IP (
    echo   - Rede: http://!LOCAL_IP!:8080
    echo   - Mobile: http://!LOCAL_IP!:8080
) else (
    echo   - Rede: http://SEU_IP_LOCAL:8080
)
echo.
echo ========================================
echo   FUNCIONALIDADES IMPLEMENTADAS:
echo ========================================
echo.
echo [NOVO] Dashboard do Barbeiro:
echo   - Alterar data/hora dos agendamentos
echo   - Notificacoes otimizadas (2-3 segundos)
echo   - Solicitacao de vales no painel financeiro
echo   - Agendamentos manuais sem login automatico
echo.
echo [NOVO] Sistema de Agendamento:
echo   - Verificacao de disponibilidade do barbeiro
echo   - Modal de confirmacao quando barbeiro indisponivel
echo   - Suporte completo a pagamento por cartao
echo.
echo [NOVO] Conectividade WiFi:
echo   - QR Code para conexao automatica
echo   - Suporte para Android e iOS
echo   - Instrucoes especificas por dispositivo
echo.
echo Sistema Completo:
echo   - Agendamentos online e presenciais
echo   - Painel administrativo avancado
echo   - Dashboard do cliente personalizado
echo   - Notificacoes WhatsApp em tempo real
echo   - Gestao de horarios e disponibilidade
echo   - Sistema de comissoes individuais e fixas
echo   - Controle financeiro com graficos
echo   - Gestao de produtos e vendas
echo.
echo Pressione Ctrl+C para parar o servidor
echo.
echo ========================================
echo.

if defined NPM_CMD (
    call %NPM_CMD% run dev
) else (
    npm run dev
)

REM Se chegou aqui, o servidor parou
echo.
echo [INFO] Servidor parado.
pause
