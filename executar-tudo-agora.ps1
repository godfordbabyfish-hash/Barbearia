# Script para executar o SQL do reminder automaticamente
# Pede a service_role_key uma vez e executa tudo

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "EXECUTAR SQL DO LEMBRETE - AUTOMATICO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Solicitar service_role_key
Write-Host "Para executar o SQL, preciso da sua SERVICE_ROLE_KEY" -ForegroundColor Yellow
Write-Host "Encontre em: Supabase Dashboard > Settings > API > service_role key" -ForegroundColor White
Write-Host ""
$serviceRoleKey = Read-Host "Digite sua SERVICE_ROLE_KEY"

if ([string]::IsNullOrWhiteSpace($serviceRoleKey)) {
    Write-Host "ERRO: Service role key e obrigatoria!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Criando SQL com a service_role_key..." -ForegroundColor Yellow

# Ler o arquivo SQL original
$sqlContent = @"
-- ============================================
-- CONFIGURAR LEMBRETE DE 10 MINUTOS - EXECUTAR AGORA
-- ============================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Adicionar coluna reminder_sent na tabela appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- 3. Criar índice para consultas mais rápidas
CREATE INDEX IF NOT EXISTS idx_appointments_reminder 
ON appointments(appointment_date, appointment_time, status, reminder_sent)
WHERE status IN ('confirmed', 'pending') AND reminder_sent IS FALSE;

-- 4. Adicionar comentário
COMMENT ON COLUMN appointments.reminder_sent IS 'Indica se o lembrete de 10 minutos antes foi enviado';

-- 5. Criar função para chamar a Edge Function
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

-- 6. Remover job existente se houver (para evitar conflitos)
SELECT cron.unschedule('whatsapp-reminder-every-minute');

-- 7. Agendar o cron job para executar a cada minuto
SELECT cron.schedule(
  'whatsapp-reminder-every-minute',
  '* * * * *',
  'SELECT invoke_whatsapp_reminder();'
);

-- 8. Verificar se foi criado
SELECT * FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute';
"@

$tempSqlFile = "temp-reminder-executar-$(Get-Date -Format 'yyyyMMddHHmmss').sql"
$sqlContent | Out-File -FilePath $tempSqlFile -Encoding UTF8

Write-Host "Arquivo SQL criado: $tempSqlFile" -ForegroundColor Green
Write-Host ""

# Tentar executar via psql
$usePsql = Read-Host "Deseja executar via psql agora? (S/N) [S]"

if ($usePsql -ne 'N' -and $usePsql -ne 'n') {
    Write-Host ""
    Write-Host "Para executar via psql, preciso da connection string do PostgreSQL" -ForegroundColor Yellow
    Write-Host "Encontre em: Supabase Dashboard > Settings > Database > Connection string > URI" -ForegroundColor White
    Write-Host ""
    Write-Host "Exemplo: postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" -ForegroundColor Gray
    Write-Host ""
    $connectionString = Read-Host "Digite a connection string"

    if (-not [string]::IsNullOrWhiteSpace($connectionString)) {
        Write-Host ""
        Write-Host "Executando SQL via psql..." -ForegroundColor Yellow
        
        # Verificar se psql está disponível
        $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
        
        if (-not $psqlPath) {
            Write-Host "AVISO: psql nao encontrado no PATH." -ForegroundColor Yellow
            Write-Host "Instale o PostgreSQL ou execute o SQL manualmente no Supabase SQL Editor" -ForegroundColor White
            Write-Host ""
            Write-Host "Arquivo SQL pronto: $tempSqlFile" -ForegroundColor Cyan
            Write-Host "Copie o conteudo e execute em: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new" -ForegroundColor White
        } else {
            & psql $connectionString -f $tempSqlFile
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "SUCESSO! SQL executado com sucesso!" -ForegroundColor Green
                Write-Host "Cron job 'whatsapp-reminder-every-minute' foi criado" -ForegroundColor Green
                Write-Host ""
                Write-Host "Para verificar:" -ForegroundColor Cyan
                Write-Host "SELECT * FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute';" -ForegroundColor White
                
                # Limpar arquivo temporário
                Remove-Item $tempSqlFile -ErrorAction SilentlyContinue
                Write-Host ""
                Write-Host "Arquivo temporario removido" -ForegroundColor Gray
            } else {
                Write-Host ""
                Write-Host "ERRO ao executar SQL (codigo: $LASTEXITCODE)" -ForegroundColor Red
                Write-Host "Verifique a connection string e tente novamente" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "Arquivo SQL mantido: $tempSqlFile" -ForegroundColor Cyan
                Write-Host "Voce pode executar manualmente no Supabase SQL Editor" -ForegroundColor White
            }
        }
    } else {
        Write-Host ""
        Write-Host "Connection string nao fornecida. Arquivo SQL criado: $tempSqlFile" -ForegroundColor Yellow
        Write-Host "Execute manualmente em: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "Arquivo SQL criado: $tempSqlFile" -ForegroundColor Cyan
    Write-Host "Execute manualmente em: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou copie e cole o conteudo do arquivo no SQL Editor do Supabase" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Pronto!" -ForegroundColor Green
