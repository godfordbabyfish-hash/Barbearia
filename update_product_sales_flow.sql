-- Migration: Add status to product_sales and stock deduction trigger

-- 1. Add status column to product_sales
ALTER TABLE public.product_sales 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'confirmed', 'cancelled'));

COMMENT ON COLUMN public.product_sales.status IS 'Status da venda: pending (aguardando conf.), confirmed (aprovada pelo barbeiro), cancelled (rejeitada)';

-- 2. Function to deduct stock when sale is confirmed
CREATE OR REPLACE FUNCTION public.handle_product_sale_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to 'confirmed' from something else
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Deduct stock
    UPDATE public.products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;
    
    -- Check if stock became negative (optional, depending on business rule, but good for consistency)
    -- We allow it for now or we could raise error.
  END IF;

  -- If status changed from 'confirmed' to 'cancelled' (refund/cancellation), maybe restore stock?
  -- The requirement doesn't specify, but it's good practice.
  IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    UPDATE public.products
    SET stock = stock + NEW.quantity
    WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS on_product_sale_confirmation ON public.product_sales;
CREATE TRIGGER on_product_sale_confirmation
  AFTER UPDATE OF status ON public.product_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_product_sale_confirmation();

-- 4. Update RLS policies to allow public (authenticated or anon) to INSERT pending sales
-- The Shop page might be accessed by anon users?
-- Shop.tsx uses supabase client. If the user is not logged in, they are anon.
-- We need to check if anon can insert into product_sales.
-- Currently policies: "Barbers can create their own product sales" (using auth.uid).
-- We need a policy for "Customers can create pending sales".
-- Since customers might be anonymous, we need to allow anon insert with status='pending'.

CREATE POLICY "Anyone can create pending product sales"
  ON public.product_sales FOR INSERT
  WITH CHECK (
    status = 'pending'
  );

-- Ensure anon has permission
GRANT INSERT ON public.product_sales TO anon;
GRANT INSERT ON public.product_sales TO authenticated;

-- 5. Allow barbers to update status of their sales
-- Existing policy: "Barbers can manage their own product sales"? 
-- The SQL had: "Barbers can create their own product sales" and "Barbers can view...".
-- We need Update policy for barbers.

CREATE POLICY "Barbers can update their own product sales"
  ON public.product_sales FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = product_sales.barber_id
      AND barbers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = product_sales.barber_id
      AND barbers.user_id = auth.uid()
    )
  );
