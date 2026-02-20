$root = $PSScriptRoot

Start-Process powershell -WorkingDirectory "$root\whatsapp-bot-barbearia" -ArgumentList '-NoExit','-Command','cmd /c iniciar-bot.bat'
Start-Process powershell -WorkingDirectory "$root\whatsapp-bot-barbearia" -ArgumentList '-NoExit','-Command','cmd /c subir-cloudflared-quick.bat'
Start-Process powershell -WorkingDirectory $root -ArgumentList '-NoExit','-Command','npm run dev'
