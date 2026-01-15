# Script para monitorar logs de debug em tempo real
param(
    [int]$Interval = 2
)

$logFile = ".cursor\debug.log"

Write-Host "📊 Monitor de Logs de Debug" -ForegroundColor Green
Write-Host "📍 Arquivo: $logFile" -ForegroundColor Cyan
Write-Host "⏱️  Intervalo: $Interval segundos" -ForegroundColor Cyan
Write-Host "Para parar, pressione Ctrl+C" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path $logFile)) {
    Write-Host "⏳ Aguardando criação do arquivo de log..." -ForegroundColor Yellow
}

$lastPosition = 0

while ($true) {
    if (Test-Path $logFile) {
        $file = Get-Item $logFile
        $currentLength = $file.Length
        
        if ($currentLength -gt $lastPosition) {
            $stream = [System.IO.File]::OpenRead($logFile)
            $stream.Position = $lastPosition
            
            $reader = New-Object System.IO.StreamReader($stream)
            
            while (-not $reader.EndOfStream) {
                $line = $reader.ReadLine()
                if ($line) {
                    try {
                        $logEntry = $line | ConvertFrom-Json
                        $timestamp = Get-Date -Date (([DateTimeOffset]::FromUnixTimeMilliseconds($logEntry.timestamp)).DateTime) -Format "HH:mm:ss"
                        
                        $hypothesisColor = switch ($logEntry.hypothesisId) {
                            "A" { "Red" }
                            "B" { "Yellow" }
                            "C" { "Green" }
                            "D" { "Cyan" }
                            "E" { "Magenta" }
                            default { "White" }
                        }
                        
                        Write-Host "[$timestamp]" -NoNewline -ForegroundColor Gray
                        Write-Host " [H$($logEntry.hypothesisId)]" -NoNewline -ForegroundColor $hypothesisColor
                        Write-Host " $($logEntry.location)" -NoNewline -ForegroundColor White
                        Write-Host " - $($logEntry.message)" -ForegroundColor White
                        
                        if ($logEntry.data) {
                            $dataJson = $logEntry.data | ConvertTo-Json -Compress
                            Write-Host "    Data: $dataJson" -ForegroundColor DarkGray
                        }
                    } catch {
                        Write-Host "  [RAW] $line" -ForegroundColor DarkGray
                    }
                }
            }
            
            $reader.Close()
            $stream.Close()
            $lastPosition = $currentLength
        }
    }
    
    Start-Sleep -Seconds $Interval
}
