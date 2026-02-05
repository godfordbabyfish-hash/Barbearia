-- Migration: Add INSERT policy to product_sales so clients can insert their own sales
-- Prerequisite: client_id column exists on public.product_sales
-- This allows inserts only when the session user matches the client_id
DROP POLICY IF EXISTS "Clients can insert their own product sales" ON public.product_sales;
CREATE POLICY "Clients can insert their own product sales"
  ON public.product_sales FOR INSERT
  WITH CHECK (auth.uid() = client_id);
