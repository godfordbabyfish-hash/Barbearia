
-- Adicionar jobs cron para limpeza automática de dados antigos
-- Execute este script no SQL Editor do Supabase

-- 1. Garantir que as extensões estão ativadas
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Criar função para limpar fila WhatsApp antiga (se a tabela existir)
CREATE OR REPLACE FUNCTION public.limpar_fila_whatsapp_antiga()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se a tabela existe
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_notifications_queue') THEN
    RAISE NOTICE 'Tabela whatsapp_notifications_queue não existe, pulando limpeza';
    RETURN;
  END IF;

  -- Remover entradas enviadas, falhas ou com mais de 30 dias
  DELETE FROM public.whatsapp_notifications_queue
  WHERE 
    status IN ('sent', 'failed') 
    OR created_at < NOW() - INTERVAL '30 days';
  
  RAISE NOTICE 'Limpeza da fila WhatsApp concluída';
END;
$$;

-- 3. Criar função para limpar logs de relatório WhatsApp antigos (se a tabela existir)
CREATE OR REPLACE FUNCTION public.limpar_logs_relatorio_whatsapp_antigos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se a tabela existe
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_report_logs') THEN
    RAISE NOTICE 'Tabela whatsapp_report_logs não existe, pulando limpeza';
    RETURN;
  END IF;

  -- Remover logs com mais de 90 dias
  DELETE FROM public.whatsapp_report_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE 'Limpeza dos logs de relatório WhatsApp concluída';
END;
$$;

-- 4. Agendar job para limpar fila WhatsApp todos os dias às 03:00 (remover job existente primeiro se existir)
DO $$
BEGIN
  -- Tentar remover o job se existir
  PERFORM cron.unschedule('limpar-fila-whatsapp-diariamente');
EXCEPTION
  WHEN others THEN
    -- Se o job não existir, ignorar o erro
    RAISE NOTICE 'Job limpar-fila-whatsapp-diariamente não existia, ignorando';
END $$;

SELECT cron.schedule(
  'limpar-fila-whatsapp-diariamente',
  '0 3 * * *',
  'SELECT public.limpar_fila_whatsapp_antiga();'
);

-- 5. Agendar job para limpar logs de relatório WhatsApp todos os dias às 03:30 (remover job existente primeiro se existir)
DO $$
BEGIN
  -- Tentar remover o job se existir
  PERFORM cron.unschedule('limpar-logs-relatorio-whatsapp-diariamente');
EXCEPTION
  WHEN others THEN
    -- Se o job não existir, ignorar o erro
    RAISE NOTICE 'Job limpar-logs-relatorio-whatsapp-diariamente não existia, ignorando';
END $$;

SELECT cron.schedule(
  'limpar-logs-relatorio-whatsapp-diariamente',
  '30 3 * * *',
  'SELECT public.limpar_logs_relatorio_whatsapp_antigos();'
);

-- 6. Verificar jobs agendados
SELECT * FROM cron.job;
