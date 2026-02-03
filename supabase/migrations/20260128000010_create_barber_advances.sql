-- Tabela de vales / adiantamentos de comissão para barbeiros
CREATE TABLE IF NOT EXISTS public.barber_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  digital_signature JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.barber_advances ENABLE ROW LEVEL SECURITY;

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_barber_advances_barber
  ON public.barber_advances (barber_id);

CREATE INDEX IF NOT EXISTS idx_barber_advances_status
  ON public.barber_advances (status);

CREATE INDEX IF NOT EXISTS idx_barber_advances_effective_date
  ON public.barber_advances (effective_date);

-- Políticas RLS

-- 1) Admins e gestores podem ver todos os vales
DROP POLICY IF EXISTS "Admins and gestores can view all advances" ON public.barber_advances;
CREATE POLICY "Admins and gestores can view all advances"
  ON public.barber_advances
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
  );

-- 2) Barbeiros podem ver somente seus próprios vales
DROP POLICY IF EXISTS "Barbers can view own advances" ON public.barber_advances;
CREATE POLICY "Barbers can view own advances"
  ON public.barber_advances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.barbers b
      WHERE b.id = barber_advances.barber_id
        AND b.user_id = auth.uid()
    )
  );

-- 3) Admins e gestores podem criar vales para qualquer barbeiro
DROP POLICY IF EXISTS "Admins and gestores can insert advances" ON public.barber_advances;
CREATE POLICY "Admins and gestores can insert advances"
  ON public.barber_advances
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
  );

-- 3b) Barbeiros podem solicitar vales para si mesmos
DROP POLICY IF EXISTS "Barbers can request own advances" ON public.barber_advances;
CREATE POLICY "Barbers can request own advances"
  ON public.barber_advances
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.barbers b
      WHERE b.id = barber_advances.barber_id
        AND b.user_id = auth.uid()
    )
  );

-- 4) Admins e gestores podem atualizar qualquer vale (ajustar valor, descrição, status)
DROP POLICY IF EXISTS "Admins and gestores can update advances" ON public.barber_advances;
CREATE POLICY "Admins and gestores can update advances"
  ON public.barber_advances
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
  );

-- 5) Barbeiros podem aprovar ou rejeitar seus próprios vales pendentes
DROP POLICY IF EXISTS "Barbers can approve own advances" ON public.barber_advances;
CREATE POLICY "Barbers can approve own advances"
  ON public.barber_advances
  FOR UPDATE
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.barbers b
      WHERE b.id = barber_advances.barber_id
        AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    barber_id = barber_advances.barber_id
    AND EXISTS (
      SELECT 1
      FROM public.barbers b
      WHERE b.id = barber_advances.barber_id
        AND b.user_id = auth.uid()
    )
  );

-- 6) Atualizar automaticamente updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_barber_advances()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_barber_advances ON public.barber_advances;
CREATE TRIGGER set_timestamp_barber_advances
BEFORE UPDATE ON public.barber_advances
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_barber_advances();

