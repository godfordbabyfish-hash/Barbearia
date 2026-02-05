-- Migration: Add client_id to product_sales and update policies

-- 1. Add client_id column to product_sales
ALTER TABLE public.product_sales 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES auth.users(id);

-- 2. Policy for clients to view their own sales
-- Drop policy if exists to avoid errors on re-run
DROP POLICY IF EXISTS "Clients can view their own product sales" ON public.product_sales;

CREATE POLICY "Clients can view their own product sales"
  ON public.product_sales FOR SELECT
  USING (
    auth.uid() = client_id
  );
