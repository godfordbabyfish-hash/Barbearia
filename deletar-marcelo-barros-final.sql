-- Script FINAL para deletar o barbeiro duplicado "Marcelo Barros"
-- ID: 38b5534a-3fed-4b26-82d0-b18ee1e5c165
-- 
-- ✅ VERIFICAÇÃO: 0 agendamentos vinculados (seguro para deletar)

-- Deletar o barbeiro duplicado "Marcelo Barros"
DELETE FROM public.barbers 
WHERE id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165'
AND user_id IS NULL;

-- Verificar se foi deletado
SELECT 
  id,
  name,
  user_id,
  visible
FROM public.barbers
WHERE LOWER(name) LIKE '%marcelo%'
ORDER BY name;

-- Deve aparecer apenas "Marcelo Barroa" agora
