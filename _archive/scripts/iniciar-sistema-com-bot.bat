@echo off
setlocal
cd /d "%~dp0"

powershell -ExecutionPolicy Bypass -File ".\iniciar-sistema-com-bot.ps1"

endlocal
