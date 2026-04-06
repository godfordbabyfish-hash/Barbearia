-- Fix RLS policies for barber_schedules
-- Execute no SQL Editor do Supabase: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql

-- 1. Remover políticas antigas conflitantes
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.barber_schedules;
DROP POLICY IF EXISTS "Permitir leitura pública" ON public.barber_schedules;
DROP POLICY IF EXISTS "Barbers can manage their own schedules" ON public.barber_schedules;
DROP POLICY IF EXISTS "Admins can manage all schedules" ON public.barber_schedules;

-- 2. Garantir que RLS está ativo
ALTER TABLE public.barber_schedules ENABLE ROW LEVEL SECURITY;

-- 3. Leitura pública (necessário para o booking funcionar)
CREATE POLICY "Public can read barber_schedules"
  ON public.barber_schedules FOR SELECT
  USING (true);

-- 4. Barbeiro pode inserir/atualizar/deletar os próprios horários
CREATE POLICY "Barbers can insert own schedules"
  ON public.barber_schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = barber_schedules.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbers can update own schedules"
  ON public.barber_schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = barber_schedules.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbers can delete own schedules"
  ON public.barber_schedules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = barber_schedules.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

-- 5. Admin e gestor podem gerenciar todos os horários
CREATE POLICY "Admins can manage all barber_schedules"
  ON public.barber_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'gestor')
    )
  );
