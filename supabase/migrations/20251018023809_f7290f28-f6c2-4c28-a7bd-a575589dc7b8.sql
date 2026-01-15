-- Criar tabela para leads/contatos sem autenticação
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Permitir que qualquer pessoa insira leads
CREATE POLICY "Anyone can create leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (true);

-- Apenas admins podem ver leads
CREATE POLICY "Admins can view leads" 
ON public.leads 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));