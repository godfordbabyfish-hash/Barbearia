-- Criar tabela barber_commissions para comissões individuais por serviço
-- Versão segura que pode ser executada múltiplas vezes sem erros
-- Execute este script no SQL Editor do Supabase

-- 1. Criar tabela
CREATE TABLE IF NOT EXISTS public.barber_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_barber_service_commission UNIQUE (barber_id, service_id)
);

-- 2. Adicionar comentários
COMMENT ON TABLE public.barber_commissions IS 'Comissões de barbeiros por serviço. Armazena o percentual de comissão que cada barbeiro recebe por cada serviço realizado.';
COMMENT ON COLUMN public.barber_commissions.commission_percentage IS 'Percentual de comissão (0-100). Exemplo: 50.00 = 50%';

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_barber_commissions_barber ON public.barber_commissions(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_commissions_service ON public.barber_commissions(service_id);
CREATE INDEX IF NOT EXISTS idx_barber_commissions_barber_service ON public.barber_commissions(barber_id, service_id);

-- 4. Habilitar Row Level Security
ALTER TABLE public.barber_commissions ENABLE ROW LEVEL SECURITY;

-- 5. Remover políticas existentes (se houver) para evitar duplicação
DROP POLICY IF EXISTS "Barbers can view their own commissions" ON public.barber_commissions;
DROP POLICY IF EXISTS "Admins and gestores can view all commissions" ON public.barber_commissions;
DROP POLICY IF EXISTS "Admins and gestores can insert commissions" ON public.barber_commissions;
DROP POLICY IF EXISTS "Admins and gestores can update commissions" ON public.barber_commissions;
DROP POLICY IF EXISTS "Admins and gestores can delete commissions" ON public.barber_commissions;

-- 6. Criar políticas RLS
-- Barbeiros podem ver suas próprias comissões
CREATE POLICY "Barbers can view their own commissions"
  ON public.barber_commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = barber_commissions.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

-- Admins e gestores podem ver todas as comissões
CREATE POLICY "Admins and gestores can view all commissions"
  ON public.barber_commissions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Admins e gestores podem inserir comissões
CREATE POLICY "Admins and gestores can insert commissions"
  ON public.barber_commissions FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Admins e gestores podem atualizar comissões
CREATE POLICY "Admins and gestores can update commissions"
  ON public.barber_commissions FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Admins e gestores podem deletar comissões
CREATE POLICY "Admins and gestores can delete commissions"
  ON public.barber_commissions FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- 7. Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_barber_commissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_barber_commissions_updated_at ON public.barber_commissions;
CREATE TRIGGER update_barber_commissions_updated_at
  BEFORE UPDATE ON public.barber_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_barber_commissions_updated_at();

-- Verificação: Verificar se a tabela foi criada corretamente
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'barber_commissions') THEN
    RAISE NOTICE 'Tabela barber_commissions criada com sucesso!';
  ELSE
    RAISE EXCEPTION 'Erro ao criar tabela barber_commissions';
  END IF;
END $$;
