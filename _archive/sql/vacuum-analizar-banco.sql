
-- VACUUM e ANALYZE para recuperar espaço e atualizar estatísticas
-- Execute ESTES COMANDOS DEVEM SER EXECUTADOS SEPARADAMENTE NO SQL EDITOR DO SUPABASE (NÃO COMO UM BLOCO ÚNICO!)
-- Isso porque o VACUUM não pode ser executado dentro de uma transação!

-- 1. PRIMEIRO, EXECUTE ESTE COMANDO:
-- VACUUM FULL ANALYZE;
-- (Aviso: VACUUM FULL bloqueia as tabelas durante a execução!)

-- 2. DEPOIS QUE TERMINAR, EXECUTE ESTE PARA VERIFICAR O TAMANHO:
SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size_apos_vacuum;
