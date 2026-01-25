-- Script SIMPLES para deletar o barbeiro duplicado "Marcelo Barros"
-- ID: 38b5534a-3fed-4b26-82d0-b18ee1e5c165

-- PASSO 1: Verificar se há agendamentos vinculados
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
  status
FROM public.appointments
WHERE barber_id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165'
ORDER BY appointment_date DESC, appointment_time DESC;

-- PASSO 3: Se NÃO houver agendamentos, execute o DELETE abaixo
-- (Descomente a linha abaixo apenas se tiver certeza!)

-- DELETE FROM public.barbers 
-- WHERE id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165'
-- AND user_id IS NULL;

-- PASSO 4: Se HOUVER agendamentos e quiser transferir para o barbeiro correto:
-- ID do barbeiro correto: cf1fed64-974a-4b83-8081-d3faacfb11a2 (Marcelo Barroa)
-- 
-- 1. Primeiro transfira os agendamentos:
-- UPDATE public.appointments
-- SET barber_id = 'cf1fed64-974a-4b83-8081-d3faacfb11a2'
-- WHERE barber_id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165';
-- 
-- 2. Depois execute o DELETE acima
