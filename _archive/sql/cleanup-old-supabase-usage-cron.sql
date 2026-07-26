
-- Script para limpar cron jobs antigos relacionados ao relatório de uso do Supabase
-- Use este script para remover qualquer job que estava enviando a mensagem quebrada

-- Primeiro, liste todos os jobs para confirmar
SELECT jobid, jobname, schedule, command, active FROM cron.job;

-- Para remover jobs antigos (descomente e ajuste o nome do job se precisar)
-- DO $$
-- BEGIN
--   PERFORM cron.unschedule('nome-do-job-antigo'); -- Substitua pelo nome do job que você quer remover
-- EXCEPTION
--   WHEN OTHERS THEN
--     RAISE NOTICE 'Job não existia ou não pode ser removido: %', SQLERRM;
-- END $$;
