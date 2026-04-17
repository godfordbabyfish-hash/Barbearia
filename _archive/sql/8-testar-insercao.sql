-- 8. TESTAR INSERÇÃO DE PERFIL TEMPORÁRIO
INSERT INTO public.profiles (id, name, phone, is_temp_user) 
VALUES (gen_random_uuid(), 'TESTE MIGRATION', '+55 11 99999-9999', true)
RETURNING id, name, is_temp_user;