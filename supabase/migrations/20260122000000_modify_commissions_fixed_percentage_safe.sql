-- Modificar sistema de comissões para ter percentual fixo por barbeiro
-- Adicionar suporte a comissão de produtos
-- Versão segura que pode ser executada múltiplas vezes sem erros

-- 1. Criar nova tabela para comissões fixas por barbeiro
CREATE TABLE IF NOT EXISTS public.barber_fixed_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  service_commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (service_commission_percentage >= 0 AND service_commission_percentage <= 100),
  product_commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (product_commission_percentage >= 0 AND product_commission_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.barber_fixed_commissions IS 'Comissões fixas por barbeiro. Armazena o percentual de comissão que cada barbeiro recebe em todos os serviços e produtos.';

COMMENT ON COLUMN public.barber_fixed_commissions.service_commission_percentage IS 'Percentual de comissão fixa para todos os serviços (0-100). Exemplo: 50.00 = 50%';
COMMENT ON COLUMN public.barber_fixed_commissions.product_commission_percentage IS 'Percentual de comissão fixa para todos os produtos (0-100). Exemplo: 30.00 = 30%';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_barber_fixed_commissions_barber ON public.barber_fixed_commissions(barber_id);

-- Enable Row Level Security
ALTER TABLE public.barber_fixed_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for barber_fixed_commissions
-- Drop policies if they exist before creating (para evitar erros de duplicação)
DROP POLICY IF EXISTS "Barbers can view their own fixed commissions" ON public.barber_fixed_commissions;
DROP POLICY IF EXISTS "Admins and gestores can view all fixed commissions" ON public.barber_fixed_commissions;
DROP POLICY IF EXISTS "Admins and gestores can insert fixed commissions" ON public.barber_fixed_commissions;
DROP POLICY IF EXISTS "Admins and gestores can update fixed commissions" ON public.barber_fixed_commissions;
DROP POLICY IF EXISTS "Admins and gestores can delete fixed commissions" ON public.barber_fixed_commissions;

-- Barbers can view their own commissions
CREATE POLICY "Barbers can view their own fixed commissions"
  ON public.barber_fixed_commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = barber_fixed_commissions.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

-- Admins and gestores can view all commissions
CREATE POLICY "Admins and gestores can view all fixed commissions"
  ON public.barber_fixed_commissions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Admins and gestores can insert commissions
CREATE POLICY "Admins and gestores can insert fixed commissions"
  ON public.barber_fixed_commissions FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Admins and gestores can update commissions
CREATE POLICY "Admins and gestores can update fixed commissions"
  ON public.barber_fixed_commissions FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Admins and gestores can delete commissions
CREATE POLICY "Admins and gestores can delete fixed commissions"
  ON public.barber_fixed_commissions FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_barber_fixed_commissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists before creating
DROP TRIGGER IF EXISTS update_barber_fixed_commissions_updated_at ON public.barber_fixed_commissions;

CREATE TRIGGER update_barber_fixed_commissions_updated_at
  BEFORE UPDATE ON public.barber_fixed_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_barber_fixed_commissions_updated_at();

-- Migrar dados existentes (opcional: se houver comissões antigas, criar registros iniciais)
-- Criar registro para cada barbeiro existente com 0% de comissão
INSERT INTO public.barber_fixed_commissions (barber_id, service_commission_percentage, product_commission_percentage)
SELECT id, 0, 0
FROM public.barbers
WHERE NOT EXISTS (
  SELECT 1 FROM public.barber_fixed_commissions 
  WHERE barber_fixed_commissions.barber_id = barbers.id
)
ON CONFLICT (barber_id) DO NOTHING;
