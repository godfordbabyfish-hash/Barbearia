-- Create barber_commissions table for storing commission percentages per barber and service
CREATE TABLE IF NOT EXISTS public.barber_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_barber_service_commission UNIQUE (barber_id, service_id)
);

-- Add comment to document the table
COMMENT ON TABLE public.barber_commissions IS 'Comissões de barbeiros por serviço. Armazena o percentual de comissão que cada barbeiro recebe por cada serviço realizado.';

COMMENT ON COLUMN public.barber_commissions.commission_percentage IS 'Percentual de comissão (0-100). Exemplo: 50.00 = 50%';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_barber_commissions_barber ON public.barber_commissions(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_commissions_service ON public.barber_commissions(service_id);
CREATE INDEX IF NOT EXISTS idx_barber_commissions_barber_service ON public.barber_commissions(barber_id, service_id);

-- Enable Row Level Security
ALTER TABLE public.barber_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for barber_commissions
-- Barbers can view their own commissions
CREATE POLICY "Barbers can view their own commissions"
  ON public.barber_commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = barber_commissions.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

-- Admins and gestores can view all commissions
CREATE POLICY "Admins and gestores can view all commissions"
  ON public.barber_commissions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Admins and gestores can insert commissions
CREATE POLICY "Admins and gestores can insert commissions"
  ON public.barber_commissions FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Admins and gestores can update commissions
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

-- Admins and gestores can delete commissions
CREATE POLICY "Admins and gestores can delete commissions"
  ON public.barber_commissions FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_barber_commissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_barber_commissions_updated_at
  BEFORE UPDATE ON public.barber_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_barber_commissions_updated_at();
