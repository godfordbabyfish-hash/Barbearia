-- Script para verificar barbeiros duplicados
-- Execute no SQL Editor do Supabase

-- 1. Verificar todos os barbeiros com o nome "Marcelo"
SELECT 
  id,
  name,
  user_id,
  specialty,
  visible,
  order_index,
  created_at,
  CASE 
    WHEN user_id IS NULL THEN 'Sem usuário vinculado'
    ELSE 'Com usuário vinculado'
  END as status_usuario
FROM public.barbers
WHERE LOWER(name) LIKE '%marcelo%'
ORDER BY created_at;

-- 2. Verificar se há barbeiros com mesmo nome mas IDs diferentes
SELECT 
  name,
  COUNT(*) as quantidade,
  STRING_AGG(id::text, ', ') as ids,
  STRING_AGG(COALESCE(user_id::text, 'NULL'), ', ') as user_ids
FROM public.barbers
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY quantidade DESC;

-- 3. Verificar relação entre barbeiros e usuários
SELECT 
  b.id as barber_id,
  b.name as barber_name,
  b.user_id,
  p.name as profile_name,
  p.id as profile_id,
  ur.role
FROM public.barbers b
LEFT JOIN public.profiles p ON b.user_id = p.id
LEFT JOIN public.user_roles ur ON b.user_id = ur.user_id
WHERE LOWER(b.name) LIKE '%marcelo%'
ORDER BY b.created_at;

-- 4. Listar TODOS os barbeiros com suas informações completas
SELECT 
  b.id,
  b.name,
  b.user_id,
  b.specialty,
  b.visible,
  b.order_index,
  p.name as profile_name,
  p.phone as profile_phone,
  ur.role,
  b.created_at
FROM public.barbers b
LEFT JOIN public.profiles p ON b.user_id = p.id
LEFT JOIN public.user_roles ur ON b.user_id = ur.user_id AND ur.role = 'barbeiro'
ORDER BY b.order_index, b.name;
