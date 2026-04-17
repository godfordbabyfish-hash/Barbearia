# Script para executar o SQL do reminder diretamente via Supabase CLI
# Usa a connection string do banco para executar o SQL

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "EXECUTANDO SQL DO LEMBRETE DE 10 MINUTOS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Obter a service_role_key dos secrets do Supabase
Write-Host "Obtendo service_role_key dos secrets do Supabase..." -ForegroundColor Yellow

# Tentar obter via Supabase CLI usando uma Edge Function temporária ou via API
# Como não podemos obter o valor real do secret, vamos criar um SQL que usa uma função para obter do ambiente

# Ler o arquivo SQL
$sqlContent = Get-Content "EXECUTAR_AGORA_REMINDER.sql" -Raw

# Vamos criar uma versão que obtém a service_role_key de uma tabela de configuração
# ou vamos pedir ao usuário para inserir manualmente via Supabase Dashboard

Write-Host "IMPORTANTE: Para executar o SQL, você precisa:" -ForegroundColor Yellow
Write-Host "1. Obter sua SERVICE_ROLE_KEY em: Supabase Dashboard > Settings > API > service_role key" -ForegroundColor White
Write-Host "2. Substituir 'YOUR_SERVICE_ROLE_KEY' no arquivo EXECUTAR_AGORA_REMINDER.sql" -ForegroundColor White
Write-Host "3. Executar o SQL no Supabase SQL Editor" -ForegroundColor White
Write-Host ""

# Alternativa: tentar usar psql se tiver connection string
$usePsql = Read-Host "Deseja tentar executar via psql? (S/N) [N]"

if ($usePsql -eq 'S' -or $usePsql -eq 's') {
    $connectionString = Read-Host "Digite a connection string do PostgreSQL (postgresql://postgres.[PROJECT]:[PASSWORD]@...)"

    if (-not [string]::IsNullOrWhiteSpace($connectionString)) {
        # Criar SQL temporário sem a service_role_key (vamos pedir depois)
        $tempSql = @"
-- Habilitar extensoes necessarias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Adicionar coluna reminder_sent na tabela appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Criar indice para consultas mais rapidas
CREATE INDEX IF NOT EXISTS idx_appointments_reminder 
ON appointments(appointment_date, appointment_time, status, reminder_sent)
WHERE status IN ('confirmed', 'pending') AND reminder_sent IS FALSE;

-- Adicionar comentario
COMMENT ON COLUMN appointments.reminder_sent IS 'Indica se o lembrete de 10 minutos antes foi enviado';
"@

        $tempFile = "temp-reminder-part1-$(Get-Date -Format 'yyyyMMddHHmmss').sql"
        $tempSql | Out-File -FilePath $tempFile -Encoding UTF8

        Write-Host "Executando primeira parte do SQL..." -ForegroundColor Yellow
        & psql $connectionString -f $tempFile

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Primeira parte executada com sucesso!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Agora você precisa:" -ForegroundColor Yellow
            Write-Host "1. Obter sua SERVICE_ROLE_KEY" -ForegroundColor White
            Write-Host "2. Executar a função e o cron job manualmente no SQL Editor" -ForegroundColor White
        }

        Remove-Item $tempFile -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "Para executar o SQL completo:" -ForegroundColor Cyan
    Write-Host "1. Abra: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new" -ForegroundColor White
    Write-Host "2. Copie o conteúdo de EXECUTAR_AGORA_REMINDER.sql" -ForegroundColor White
    Write-Host "3. Substitua 'YOUR_SERVICE_ROLE_KEY' pela sua chave real" -ForegroundColor White
    Write-Host "4. Execute o SQL" -ForegroundColor White
}
