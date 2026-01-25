import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SQL da migration
    const migrationSQL = `
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
DROP POLICY IF EXISTS "Barbers can view their own product commissions" ON public.barber_product_commissions;
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
DROP POLICY IF EXISTS "Admins and gestores can view all product commissions" ON public.barber_product_commissions;
CREATE POLICY "Admins and gestores can view all product commissions"
  ON public.barber_product_commissions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Admins and gestores can insert commissions
DROP POLICY IF EXISTS "Admins and gestores can insert product commissions" ON public.barber_product_commissions;
CREATE POLICY "Admins and gestores can insert product commissions"
  ON public.barber_product_commissions FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

-- Admins and gestores can update commissions
DROP POLICY IF EXISTS "Admins and gestores can update product commissions" ON public.barber_product_commissions;
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
DROP POLICY IF EXISTS "Admins and gestores can delete product commissions" ON public.barber_product_commissions;
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

DROP TRIGGER IF EXISTS update_barber_product_commissions_updated_at ON public.barber_product_commissions;
CREATE TRIGGER update_barber_product_commissions_updated_at
  BEFORE UPDATE ON public.barber_product_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_barber_product_commissions_updated_at();
`;

    // Executar SQL usando RPC (precisa de função exec_sql ou usar pg_net)
    // Como não temos função exec_sql, vamos usar uma abordagem diferente
    
    // Dividir SQL em comandos e executar via supabase.rpc se houver função
    // Ou retornar SQL para execução manual
    
    // Tentar executar via query direto (não funciona via REST)
    // A melhor forma é retornar o SQL para execução manual ou usar Management API
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Edge Functions não podem executar DDL diretamente. Use o método abaixo.',
        method: 'Use Supabase CLI: supabase db push',
        sql: migrationSQL,
        instructions: [
          '1. Execute: supabase db push',
          '2. Ou cole o SQL acima no SQL Editor',
          '3. Ou use o script PowerShell: .\\aplicar-migration-automatico.ps1'
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
