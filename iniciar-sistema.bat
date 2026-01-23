@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   INICIANDO SISTEMA BARBEARIA
echo ========================================
echo.

REM Verificar se Node.js está instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo [INFO] Por favor, instale o Node.js de https://nodejs.org
    pause
    exit /b 1
)

REM Verificar se npm está instalado
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] npm nao encontrado!
    echo [INFO] Por favor, instale o Node.js que inclui o npm
    pause
    exit /b 1
)

echo [OK] Node.js e npm encontrados!
echo.

REM Verificar se node_modules existe
if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    call npm install
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
echo O servidor estara disponivel em:
echo   - Local: http://localhost:8080
echo.
echo Pressione Ctrl+C para parar o servidor
echo.
echo ========================================
echo.

REM Iniciar servidor de desenvolvimento
echo.
echo [INFO] Iniciando servidor de desenvolvimento...
echo.
npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao iniciar o servidor!
    echo [INFO] Verifique se todas as dependencias foram instaladas corretamente
    pause
    exit /b 1
)
