@echo off
setlocal enableextensions enabledelayedexpansion

REM Detect Node and npm
where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH. Instale Node 18+ e tente novamente.
  pause
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERRO] npm nao encontrado no PATH.
  pause
  exit /b 1
)

REM Go to project dir (this script should be at project root)
pushd "%~dp0"

REM Optional: install deps if node_modules vazio
if not exist node_modules ( 
  echo Instalando dependencias...
  call npm ci || call npm install
)

REM Run dev server on port 8080
set PORT=8080
call npm run dev

popd
endlocal
