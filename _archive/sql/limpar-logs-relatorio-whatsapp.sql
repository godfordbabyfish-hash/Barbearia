
-- Limpar logs antigos do relatório WhatsApp (mais de 90 dias)
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se a tabela existe antes de continuar
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_report_logs') THEN
    RAISE NOTICE 'Tabela whatsapp_report_logs não existe, pulando limpeza';
    RETURN;
  END IF;

  -- 2. Contar quantos logs serão removidos
  RAISE NOTICE 'Contando logs do relatório WhatsApp...';
  RAISE NOTICE 'Total de logs: %', (SELECT COUNT(*) FROM whatsapp_report_logs);
  RAISE NOTICE 'Logs com mais de 90 dias: %', (SELECT COUNT(*) FROM whatsapp_report_logs WHERE created_at < NOW() - INTERVAL '90 days');

  -- 3. Remover logs antigos
  RAISE NOTICE 'Removendo logs antigos...';
  DELETE FROM whatsapp_report_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  -- 4. Verificar o resultado
  RAISE NOTICE 'Logs restantes: %', (SELECT COUNT(*) FROM whatsapp_report_logs);
  RAISE NOTICE 'Limpeza dos logs do relatório WhatsApp concluída!';
END $$;
