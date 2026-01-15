-- Fix RLS policies for site_config to allow authenticated users to update
DROP POLICY IF EXISTS "Admins can manage site config" ON public.site_config;

CREATE POLICY "Authenticated users can manage site config"
ON public.site_config
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Fix RLS policies for products to allow authenticated users to manage
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "Authenticated users can manage products"
ON public.products
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Fix RLS policies for services to allow authenticated users to manage
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
DROP POLICY IF EXISTS "Anyone can insert services" ON public.services;
DROP POLICY IF EXISTS "Anyone can update services" ON public.services;
DROP POLICY IF EXISTS "Anyone can delete services" ON public.services;

CREATE POLICY "Authenticated users can manage services"
ON public.services
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Fix RLS policies for barbers to allow authenticated users to manage
DROP POLICY IF EXISTS "Admins can manage barbers" ON public.barbers;
DROP POLICY IF EXISTS "Anyone can insert barbers" ON public.barbers;
DROP POLICY IF EXISTS "Anyone can update barbers" ON public.barbers;
DROP POLICY IF EXISTS "Anyone can delete barbers" ON public.barbers;

CREATE POLICY "Authenticated users can manage barbers"
ON public.barbers
FOR ALL
USING (auth.uid() IS NOT NULL);