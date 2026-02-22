-- Função RPC para remoção segura de vales por gestores/admins
-- Esta função contorna as restrições de RLS usando SECURITY DEFINER

CREATE OR REPLACE FUNCTION delete_barber_advance_admin(advance_id UUID)
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
    user_role TEXT;
    advance_exists BOOLEAN;
BEGIN
    -- Log da tentativa de remoção
    RAISE LOG 'delete_barber_advance_admin called with advance_id: %', advance_id;
    
    -- Verificar se o usuário atual é gestor/admin
    -- Usar a tabela user_roles, que armazena os papéis do usuário
    SELECT role INTO user_role 
    FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'gestor');
    
    -- Se não encontrou na tabela profiles, verificar se é o usuário admin padrão
    IF user_role IS NULL THEN
        -- Verificar se é um usuário com email de admin (fallback)
        SELECT CASE 
            WHEN email LIKE '%admin%' OR email LIKE '%gestor%' THEN 'admin'
            ELSE NULL 
        END INTO user_role
        FROM auth.users 
        WHERE id = auth.uid();
    END IF;
    
    -- Log do role encontrado
    RAISE LOG 'User role found: %', COALESCE(user_role, 'NULL');
    
    -- Se ainda não tem permissão, negar acesso
    IF user_role IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Acesso negado: usuário não tem permissões de administrador',
            'user_id', auth.uid()
        );
    END IF;
    
    -- Verificar se o vale existe
    SELECT EXISTS(SELECT 1 FROM barber_advances WHERE id = advance_id) INTO advance_exists;
    
    IF NOT advance_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Vale não encontrado',
            'advance_id', advance_id
        );
    END IF;
    
    -- Log antes da remoção
    RAISE LOG 'Attempting to delete advance with id: %', advance_id;
    
    -- Remover o vale (SECURITY DEFINER permite contornar RLS)
    DELETE FROM barber_advances WHERE id = advance_id;
    
    -- Verificar se a remoção foi bem-sucedida
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Falha ao remover vale - registro não foi deletado',
            'advance_id', advance_id
        );
    END IF;
    
    -- Log de sucesso
    RAISE LOG 'Successfully deleted advance with id: %', advance_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Vale removido com sucesso',
        'advance_id', advance_id,
        'removed_by', auth.uid()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log do erro
        RAISE LOG 'Error in delete_barber_advance_admin: %', SQLERRM;
        
        RETURN json_build_object(
            'success', false,
            'error', 'Erro interno: ' || SQLERRM,
            'advance_id', advance_id
        );
END;
$$;

-- Garantir que a função pode ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION delete_barber_advance_admin(UUID) TO authenticated;

-- Comentário explicativo
COMMENT ON FUNCTION delete_barber_advance_admin(UUID) IS 
'Remove um vale de barbeiro. Apenas usuários com role admin/manager podem executar esta função. Usa SECURITY DEFINER para contornar RLS.';
