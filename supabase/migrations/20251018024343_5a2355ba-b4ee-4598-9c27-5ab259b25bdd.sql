-- Permitir que usuários anônimos criem e atualizem seus próprios perfis
CREATE POLICY "Anonymous users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Permitir que usuários anônimos criem sua própria role
CREATE POLICY "Anonymous users can insert own role" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);