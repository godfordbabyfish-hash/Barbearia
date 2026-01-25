-- Criar tabela product_sales para registrar vendas de produtos pelos barbeiros
-- Versão segura que pode ser executada múltiplas vezes sem erros
-- Execute este script no SQL Editor do Supabase

-- 1. Criar tabela
CREATE TABLE IF NOT EXISTS public.product_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  commission_value DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (commission_value >= 0),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sale_time TIME NOT NULL DEFAULT CURRENT_TIME,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Adicionar comentários
COMMENT ON TABLE public.product_sales IS 'Vendas de produtos realizadas pelos barbeiros. Registra cada venda com informações de comissão.';
COMMENT ON COLUMN public.product_sales.unit_price IS 'Preço unitário do produto no momento da venda';
COMMENT ON COLUMN public.product_sales.total_price IS 'Preço total (unit_price * quantity)';
COMMENT ON COLUMN public.product_sales.commission_percentage IS 'Percentual de comissão aplicado na venda';
COMMENT ON COLUMN public.product_sales.commission_value IS 'Valor da comissão calculada (total_price * commission_percentage / 100)';

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_product_sales_barber ON public.product_sales(barber_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_product ON public.product_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_date ON public.product_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_product_sales_barber_date ON public.product_sales(barber_id, sale_date);

-- 4. Habilitar Row Level Security
ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;

-- 5. Remover políticas existentes (se houver) para evitar duplicação
DROP POLICY IF EXISTS "Barbers can view their own product sales" ON public.product_sales;
DROP POLICY IF EXISTS "Barbers can create their own product sales" ON public.product_sales;
DROP POLICY IF EXISTS "Admins and gestores can view all product sales" ON public.product_sales;
DROP POLICY IF EXISTS "Admins and gestores can manage all product sales" ON public.product_sales;

-- 6. Criar políticas RLS
-- Barbeiros podem ver suas próprias vendas
CREATE POLICY "Barbers can view their own product sales"
  ON public.product_sales FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = product_sales.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

-- Barbeiros podem criar suas próprias vendas
CREATE POLICY "Barbers can create their own product sales"
  ON public.product_sales FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = product_sales.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

-- Admins e gestores podem ver todas as vendas
CREATE POLICY "Admins and gestores can view all product sales"
  ON public.product_sales FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Admins e gestores podem gerenciar todas as vendas
CREATE POLICY "Admins and gestores can manage all product sales"
  ON public.product_sales FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- 7. Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_product_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_product_sales_updated_at ON public.product_sales;
CREATE TRIGGER update_product_sales_updated_at
  BEFORE UPDATE ON public.product_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_product_sales_updated_at();

-- Verificação: Verificar se a tabela foi criada corretamente
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_sales') THEN
    RAISE NOTICE 'Tabela product_sales criada com sucesso!';
  ELSE
    RAISE EXCEPTION 'Erro ao criar tabela product_sales';
  END IF;
END $$;
