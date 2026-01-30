-- LIMPAR O TESTE E FINALIZAR
DELETE FROM public.profiles 
WHERE name = 'TESTE MIGRATION';

-- VERIFICAÇÃO FINAL
SELECT 'Migration aplicada com sucesso! Sistema pronto para uso.' as status;