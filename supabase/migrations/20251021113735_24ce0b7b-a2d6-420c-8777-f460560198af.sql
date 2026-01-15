-- Remover role 'cliente' duplicada do usuário admin
DELETE FROM user_roles 
WHERE user_id = '8fd56b8a-3184-4f71-a33d-547082c7ff76' 
AND role = 'cliente';