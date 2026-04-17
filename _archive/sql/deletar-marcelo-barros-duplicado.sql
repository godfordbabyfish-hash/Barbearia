-- Script para deletar o barbeiro duplicado "Marcelo Barros"
-- ID: 38b5534a-3fed-4b26-82d0-b18ee1e5c165

-- PASSO 1: Verificar se há agendamentos vinculados a este barbeiro
SELECT 
  COUNT(*) as total_agendamentos,
  COUNT(CASE WHEN status != 'cancelled' THEN 1 END) as agendamentos_ativos
FROM public.appointments
WHERE barber_id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165';

-- PASSO 2: Ver detalhes dos agendamentos (se houver)
SELECT 
  id,
  appointment_date,
  appointment_time,
  status,
  client_id,
  service_id
FROM public.appointments
WHERE barber_id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165'
ORDER BY appointment_date DESC, appointment_time DESC;

-- PASSO 3: Verificar outros dados vinculados
-- Execute cada query separadamente para evitar erros se alguma tabela não existir

-- 3.1: Agendamentos (sempre existe)
SELECT 
  'appointments' as tabela,
  COUNT(*) as quantidade
FROM public.appointments
WHERE barber_id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165';

-- 3.2: Comissões de serviços (execute apenas se a tabela existir)
-- SELECT 
--   'barber_commissions' as tabela,
--   COUNT(*) as quantidade
-- FROM public.barber_commissions
-- WHERE barber_id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165';

-- 3.3: Comissões de produtos (execute apenas se a tabela existir)
-- SELECT 
--   'barber_product_commissions' as tabela,
--   COUNT(*) as quantidade
-- FROM public.barber_product_commissions
-- WHERE barber_id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165';

-- 3.4: Comissões fixas (execute apenas se a tabela existir)
-- SELECT 
--   'barber_fixed_commissions' as tabela,
--   COUNT(*) as quantidade
-- FROM public.barber_fixed_commissions
-- WHERE barber_id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165';

-- 3.5: Breaks (execute apenas se a tabela existir)
-- SELECT 
--   'barber_breaks' as tabela,
--   COUNT(*) as quantidade
-- FROM public.barber_breaks
-- WHERE barber_id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165';

-- 3.6: Disponibilidade (execute apenas se a tabela existir)
-- SELECT 
--   'barber_availability' as tabela,
--   COUNT(*) as quantidade
-- FROM public.barber_availability
-- WHERE barber_id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165';

-- PASSO 4: Se NÃO houver agendamentos importantes, execute o DELETE abaixo
-- (Descomente apenas se tiver certeza!)

-- DELETE FROM public.barbers 
-- WHERE id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165'
-- AND user_id IS NULL;

-- PASSO 5: Se HOUVER agendamentos e quiser transferir para o barbeiro correto:
-- ID do barbeiro correto: cf1fed64-974a-4b83-8081-d3faacfb11a2 (Marcelo Barroa)
-- 
-- UPDATE public.appointments
-- SET barber_id = 'cf1fed64-974a-4b83-8081-d3faacfb11a2'
-- WHERE barber_id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165';
-- 
-- Depois execute o DELETE acima
