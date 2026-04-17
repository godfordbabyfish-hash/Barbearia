# Script para configurar o lembrete de 10 minutos via CLI
# Este script executa o SQL diretamente no banco Supabase usando psql

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "CONFIGURAR LEMBRETE DE 10 MINUTOS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Solicitar a service_role_key
Write-Host "Voce precisa de duas informacoes:" -ForegroundColor Yellow
Write-Host "   1. SERVICE_ROLE_KEY (encontre em: Supabase Dashboard > Settings > API > service_role key)" -ForegroundColor White
Write-Host "   2. Connection String do PostgreSQL (encontre em: Supabase Dashboard > Settings > Database > Connection string > URI)" -ForegroundColor White
Write-Host ""

$serviceRoleKey = Read-Host "Digite sua SERVICE_ROLE_KEY"

if ([string]::IsNullOrWhiteSpace($serviceRoleKey)) {
    Write-Host "ERRO: Service role key e obrigatoria!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Exemplo de connection string:" -ForegroundColor Yellow
Write-Host "   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" -ForegroundColor Gray
Write-Host ""

$connectionString = Read-Host "Digite a connection string completa do PostgreSQL"

if ([string]::IsNullOrWhiteSpace($connectionString)) {
    Write-Host "ERRO: Connection string e obrigatoria!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Criando arquivo SQL temporario..." -ForegroundColor Yellow

# Criar SQL temporário - usando here-string com escape correto
$sqlContent = @"
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

-- Criar funcao para chamar a Edge Function
CREATE OR REPLACE FUNCTION invoke_whatsapp_reminder()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS `$`$`$
DECLARE
  supabase_url TEXT := 'https://wabefmgfsatlusevxyfo.supabase.co';
  function_url TEXT;
  service_role_key TEXT := '$serviceRoleKey';
BEGIN
  function_url := supabase_url || '/functions/v1/whatsapp-reminder';
  
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error invoking reminder function: %', SQLERRM;
END;
`$`$`$;

-- Remover job existente se houver
SELECT cron.unschedule('whatsapp-reminder-every-minute');

-- Agendar o cron job para executar a cada minuto
SELECT cron.schedule(
  'whatsapp-reminder-every-minute',
  '* * * * *',
  'SELECT invoke_whatsapp_reminder();'
);

-- Verificar se foi criado
SELECT * FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute';
"@

$tempSqlFile = "temp-reminder-setup-$(Get-Date -Format 'yyyyMMddHHmmss').sql"
$sqlContent | Out-File -FilePath $tempSqlFile -Encoding UTF8

Write-Host "Arquivo SQL criado: $tempSqlFile" -ForegroundColor Green
Write-Host ""
Write-Host "Executando SQL no Supabase via psql..." -ForegroundColor Yellow
Write-Host ""

# Verificar se psql está disponível
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "AVISO: psql nao encontrado no PATH." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Voce pode:" -ForegroundColor Yellow
    Write-Host "   1. Instalar PostgreSQL (que inclui o psql)" -ForegroundColor White
    Write-Host "   2. Ou executar o SQL manualmente no Supabase SQL Editor" -ForegroundColor White
    Write-Host ""
    Write-Host "Arquivo SQL criado: $tempSqlFile" -ForegroundColor Cyan
    Write-Host "Copie o conteudo e execute no Supabase Dashboard > SQL Editor" -ForegroundColor White
    Write-Host ""
    $keepFile = Read-Host "Deseja abrir o arquivo SQL? (S/N) [N]"
    if ($keepFile -eq 'S' -or $keepFile -eq 's') {
        notepad $tempSqlFile
    }
    exit 0
}

# Executar SQL usando psql
try {
    & psql $connectionString -f $tempSqlFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "SUCESSO: Configuracao concluida!" -ForegroundColor Green
        Write-Host "SUCESSO: Cron job 'whatsapp-reminder-every-minute' foi criado" -ForegroundColor Green
        Write-Host ""
        Write-Host "Para verificar, execute no SQL Editor:" -ForegroundColor Cyan
        Write-Host "   SELECT * FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute';" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "ERRO ao executar SQL (codigo: $LASTEXITCODE)" -ForegroundColor Red
        Write-Host "Verifique:" -ForegroundColor Yellow
        Write-Host "   - Se a connection string esta correta" -ForegroundColor White
        Write-Host "   - Se a service_role_key esta correta" -ForegroundColor White
        Write-Host ""
        Write-Host "Arquivo SQL criado: $tempSqlFile" -ForegroundColor Cyan
        Write-Host "Voce pode executar manualmente no Supabase SQL Editor" -ForegroundColor White
    }
} catch {
    Write-Host ""
    Write-Host "ERRO ao executar psql: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Arquivo SQL criado: $tempSqlFile" -ForegroundColor Cyan
    Write-Host "Copie o conteudo e execute no Supabase Dashboard > SQL Editor" -ForegroundColor White
}

# Limpar arquivo temporário
Write-Host ""
$cleanup = Read-Host "Deseja manter o arquivo SQL temporario? (S/N) [N]"
if ($cleanup -ne 'S' -and $cleanup -ne 's') {
    Start-Sleep -Seconds 1
    Remove-Item $tempSqlFile -ErrorAction SilentlyContinue
    Write-Host "Arquivo temporario removido" -ForegroundColor Gray
} else {
    Write-Host "Arquivo mantido: $tempSqlFile" -ForegroundColor Green
}

Write-Host ""
Write-Host "Pronto!" -ForegroundColor Green
