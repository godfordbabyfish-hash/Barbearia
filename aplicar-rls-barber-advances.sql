-- Adicionar política RLS para permitir barbeiros solicitarem vales
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
