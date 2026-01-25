-- Create barber_product_commissions table for storing commission percentages per barber and product
CREATE TABLE IF NOT EXISTS public.barber_product_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_barber_product_commission UNIQUE (barber_id, product_id)
);

-- Add comment to document the table
COMMENT ON TABLE public.barber_product_commissions IS 'Comissões de barbeiros por produto. Armazena o percentual de comissão que cada barbeiro recebe por cada produto vendido.';

COMMENT ON COLUMN public.barber_product_commissions.commission_percentage IS 'Percentual de comissão (0-100). Exemplo: 30.00 = 30%';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_barber_product_commissions_barber ON public.barber_product_commissions(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_product_commissions_product ON public.barber_product_commissions(product_id);
CREATE INDEX IF NOT EXISTS idx_barber_product_commissions_barber_product ON public.barber_product_commissions(barber_id, product_id);

-- Enable Row Level Security
ALTER TABLE public.barber_product_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for barber_product_commissions
-- Barbers can view their own commissions
CREATE POLICY "Barbers can view their own product commissions"
  ON public.barber_product_commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = barber_product_commissions.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

-- Admins and gestores can view all commissions
CREATE POLICY "Admins and gestores can view all product commissions"
  ON public.barber_product_commissions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Admins and gestores can insert commissions
CREATE POLICY "Admins and gestores can insert product commissions"
  ON public.barber_product_commissions FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Admins and gestores can update commissions
CREATE POLICY "Admins and gestores can update product commissions"
  ON public.barber_product_commissions FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Admins and gestores can delete commissions
CREATE POLICY "Admins and gestores can delete product commissions"
  ON public.barber_product_commissions FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_barber_product_commissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_barber_product_commissions_updated_at
  BEFORE UPDATE ON public.barber_product_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_barber_product_commissions_updated_at();
