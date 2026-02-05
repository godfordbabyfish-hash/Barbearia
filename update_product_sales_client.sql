-- Add client_id column to product_sales table
ALTER TABLE product_sales 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES auth.users(id);

-- Enable RLS on product_sales if not already enabled
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

-- Policy for clients to view their own product sales
DROP POLICY IF EXISTS "Clients can view their own product sales" ON product_sales;
CREATE POLICY "Clients can view their own product sales"
ON product_sales
FOR SELECT
USING (auth.uid() = client_id);

-- Policy for clients to insert their own product sales (if needed via Shop, though usually Shop uses service role or public if strictly controlled, but here we capture user)
-- Ideally, the insert happens via the user's session in Shop.tsx, so they need insert permission.
-- Let's check if there is an insert policy. If not, we should add one, or rely on existing ones.
-- Safest is to allow insert if auth.uid() matches client_id.
DROP POLICY IF EXISTS "Clients can insert their own product sales" ON product_sales;
CREATE POLICY "Clients can insert their own product sales"
ON product_sales
FOR INSERT
WITH CHECK (auth.uid() = client_id);
