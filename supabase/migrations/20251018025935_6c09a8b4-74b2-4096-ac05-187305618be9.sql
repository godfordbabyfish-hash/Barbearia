-- Permitir operações sem autenticação nas tabelas (INSEGURO!)

-- Política para permitir qualquer um inserir barbeiros
CREATE POLICY "Anyone can insert barbers" 
ON public.barbers 
FOR INSERT 
WITH CHECK (true);

-- Política para permitir qualquer um atualizar barbeiros
CREATE POLICY "Anyone can update barbers" 
ON public.barbers 
FOR UPDATE 
USING (true);

-- Política para permitir qualquer um deletar barbeiros
CREATE POLICY "Anyone can delete barbers" 
ON public.barbers 
FOR DELETE 
USING (true);

-- Política para permitir qualquer um inserir serviços
CREATE POLICY "Anyone can insert services" 
ON public.services 
FOR INSERT 
WITH CHECK (true);

-- Política para permitir qualquer um atualizar serviços
CREATE POLICY "Anyone can update services" 
ON public.services 
FOR UPDATE 
USING (true);

-- Política para permitir qualquer um deletar serviços
CREATE POLICY "Anyone can delete services" 
ON public.services 
FOR DELETE 
USING (true);

-- Política para permitir qualquer um inserir agendamentos
CREATE POLICY "Anyone can insert appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (true);

-- Política para permitir qualquer um atualizar agendamentos
CREATE POLICY "Anyone can update appointments" 
ON public.appointments 
FOR UPDATE 
USING (true);

-- Política para permitir qualquer um ver todos os agendamentos
CREATE POLICY "Anyone can view all appointments" 
ON public.appointments 
FOR SELECT 
USING (true);

-- Política para permitir qualquer um inserir perfis
CREATE POLICY "Anyone can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);