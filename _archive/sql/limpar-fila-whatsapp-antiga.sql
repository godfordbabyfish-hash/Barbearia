
-- Limpar entradas antigas da fila WhatsApp (processadas ou com mais de 30 dias)
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se a tabela existe antes de continuar
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_notifications_queue') THEN
    RAISE NOTICE 'Tabela whatsapp_notifications_queue não existe, pulando limpeza';
    RETURN;
  END IF;

  -- 2. Contar quantas entradas serão removidas
  RAISE NOTICE 'Contando entradas da fila WhatsApp...';
  RAISE NOTICE 'Total de entradas: %', (SELECT COUNT(*) FROM whatsapp_notifications_queue);
  RAISE NOTICE 'Entradas processadas/falhas: %', (SELECT COUNT(*) FROM whatsapp_notifications_queue WHERE status IN ('sent', 'failed'));
  RAISE NOTICE 'Entradas com mais de 30 dias: %', (SELECT COUNT(*) FROM whatsapp_notifications_queue WHERE created_at < NOW() - INTERVAL '30 days');

  -- 3. Remover entradas que já foram enviadas ou falharam, e/ou têm mais de 30 dias
  RAISE NOTICE 'Removendo entradas antigas...';
  DELETE FROM whatsapp_notifications_queue
  WHERE 
    status IN ('sent', 'failed') 
    OR created_at < NOW() - INTERVAL '30 days';

  -- 4. Verificar o resultado
  RAISE NOTICE 'Entradas restantes: %', (SELECT COUNT(*) FROM whatsapp_notifications_queue);
  RAISE NOTICE 'Limpeza da fila WhatsApp concluída!';
END $$;
