-- Script para verificar e corrigir a role do usuário admin
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se o usuário admin existe na tabela auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'admin@admin.com';

-- 2. Verificar se o usuário tem role na tabela user_roles
SELECT 
  ur.user_id,
  ur.role,
  u.email
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'admin@admin.com';

-- 3. Se o usuário existir mas não tiver role admin, adicionar
-- Substitua 'USER_ID_AQUI' pelo ID do usuário encontrado na consulta acima
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Buscar ID do usuário admin
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@admin.com'
  LIMIT 1;

  -- Se encontrou o usuário
  IF admin_user_id IS NOT NULL THEN
    -- Deletar roles antigas do admin (se houver)
    DELETE FROM public.user_roles
    WHERE user_id = admin_user_id;

    -- Inserir role admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Role admin atribuída ao usuário: %', admin_user_id;
  ELSE
    RAISE NOTICE 'Usuário admin@admin.com não encontrado!';
  END IF;
END $$;

-- 4. Verificar novamente se a role foi atribuída
SELECT 
  ur.user_id,
  ur.role,
  u.email,
  u.email_confirmed_at
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'admin@admin.com';

-- 5. Se precisar confirmar o email também:
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW()
-- WHERE email = 'admin@admin.com';
