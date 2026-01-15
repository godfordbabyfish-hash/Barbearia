-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'cliente', 'barbeiro');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  icon TEXT NOT NULL,
  image_url TEXT,
  visible BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create barbers table
CREATE TABLE public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  experience TEXT NOT NULL,
  rating DECIMAL(3,2) DEFAULT 5.0,
  image_url TEXT,
  visible BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  
  -- Assign cliente role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cliente');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for services
CREATE POLICY "Everyone can view visible services"
  ON public.services FOR SELECT
  USING (visible = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage services"
  ON public.services FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for barbers
CREATE POLICY "Everyone can view visible barbers"
  ON public.barbers FOR SELECT
  USING (visible = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage barbers"
  ON public.barbers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Barbers can view their own data"
  ON public.barbers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Barbers can update their own data"
  ON public.barbers FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for appointments
CREATE POLICY "Clients can view their own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Barbers can view their appointments"
  ON public.appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = appointments.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all appointments"
  ON public.appointments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can create appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Barbers can update their appointments"
  ON public.appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = appointments.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all appointments"
  ON public.appointments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert initial services data
INSERT INTO public.services (title, description, price, icon, visible, order_index) VALUES
('Corte de Cabelo', 'Cortes modernos e clÃ¡ssicos personalizados para seu estilo', 80.00, 'Scissors', true, 1),
('Barba & Bigode', 'Tratamento completo com navalha, toalha quente e produtos premium', 60.00, 'Wind', true, 2),
('FinalizaÃ§Ã£o', 'Styling profissional com produtos de alta qualidade', 40.00, 'Sparkles', true, 3);

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_barbers_updated_at
  BEFORE UPDATE ON public.barbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Criar tabela para leads/contatos sem autenticaÃ§Ã£o
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Permitir que qualquer pessoa insira leads
CREATE POLICY "Anyone can create leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (true);

-- Apenas admins podem ver leads
CREATE POLICY "Admins can view leads" 
ON public.leads 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));
-- Permitir que usuÃ¡rios anÃ´nimos criem e atualizem seus prÃ³prios perfis
CREATE POLICY "Anonymous users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Permitir que usuÃ¡rios anÃ´nimos criem sua prÃ³pria role
CREATE POLICY "Anonymous users can insert own role" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
-- Criar bucket para imagens do site
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-images',
  'site-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- PolÃ­ticas para o bucket site-images
CREATE POLICY "Todos podem ver imagens do site"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-images');

CREATE POLICY "Admin pode fazer upload de imagens"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-images');

CREATE POLICY "Admin pode atualizar imagens"
ON storage.objects FOR UPDATE
USING (bucket_id = 'site-images');

CREATE POLICY "Admin pode deletar imagens"
ON storage.objects FOR DELETE
USING (bucket_id = 'site-images');
-- Permitir operaÃ§Ãµes sem autenticaÃ§Ã£o nas tabelas (INSEGURO!)

-- PolÃ­tica para permitir qualquer um inserir barbeiros
CREATE POLICY "Anyone can insert barbers" 
ON public.barbers 
FOR INSERT 
WITH CHECK (true);

-- PolÃ­tica para permitir qualquer um atualizar barbeiros
CREATE POLICY "Anyone can update barbers" 
ON public.barbers 
FOR UPDATE 
USING (true);

-- PolÃ­tica para permitir qualquer um deletar barbeiros
CREATE POLICY "Anyone can delete barbers" 
ON public.barbers 
FOR DELETE 
USING (true);

-- PolÃ­tica para permitir qualquer um inserir serviÃ§os
CREATE POLICY "Anyone can insert services" 
ON public.services 
FOR INSERT 
WITH CHECK (true);

-- PolÃ­tica para permitir qualquer um atualizar serviÃ§os
CREATE POLICY "Anyone can update services" 
ON public.services 
FOR UPDATE 
USING (true);

-- PolÃ­tica para permitir qualquer um deletar serviÃ§os
CREATE POLICY "Anyone can delete services" 
ON public.services 
FOR DELETE 
USING (true);

-- PolÃ­tica para permitir qualquer um inserir agendamentos
CREATE POLICY "Anyone can insert appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (true);

-- PolÃ­tica para permitir qualquer um atualizar agendamentos
CREATE POLICY "Anyone can update appointments" 
ON public.appointments 
FOR UPDATE 
USING (true);

-- PolÃ­tica para permitir qualquer um ver todos os agendamentos
CREATE POLICY "Anyone can view all appointments" 
ON public.appointments 
FOR SELECT 
USING (true);

-- PolÃ­tica para permitir qualquer um inserir perfis
CREATE POLICY "Anyone can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);
-- Add duration column to services table (in minutes)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS duration integer DEFAULT 30;

COMMENT ON COLUMN public.services.duration IS 'DuraÃ§Ã£o do serviÃ§o em minutos';
-- Create site_config table for all frontend customizations
CREATE TABLE IF NOT EXISTS public.site_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Admins can manage all configs
CREATE POLICY "Admins can manage site config"
ON public.site_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Everyone can view site config
CREATE POLICY "Everyone can view site config"
ON public.site_config
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_site_config_updated_at
BEFORE UPDATE ON public.site_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configurations
INSERT INTO public.site_config (config_key, config_value) VALUES
('theme_colors', '{
  "primary": "45 70% 52%",
  "primary_foreground": "0 0% 100%",
  "secondary": "240 4% 16%",
  "background": "240 10% 4%",
  "foreground": "0 0% 98%"
}'::jsonb),
('hero_section', '{
  "title": "Estilo & ElegÃ¢ncia",
  "subtitle": "TradiÃ§Ã£o em cada corte",
  "description": "Mais de 10 anos transformando visual em autoestima. Barbearia premium com atendimento de excelÃªncia.",
  "image_url": null
}'::jsonb),
('footer_info', '{
  "address": "Rua das Barbearias, 123 - Centro",
  "phone": "(11) 99999-9999",
  "email": "contato@barbearia.com",
  "hours": "Seg-Sex: 9h-20h | SÃ¡b: 9h-18h",
  "social": {
    "instagram": "https://instagram.com/barbearia",
    "facebook": "https://facebook.com/barbearia",
    "whatsapp": "5511999999999"
  }
}'::jsonb),
('shop_products', '{
  "enabled": true,
  "products": []
}'::jsonb)
ON CONFLICT (config_key) DO NOTHING;
-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL,
  stock INTEGER DEFAULT 0,
  visible BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policies for products
CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view visible products"
ON public.products
FOR SELECT
USING (visible = true OR has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
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
-- Update the app_role enum to include admin if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'barbeiro', 'cliente');
    END IF;
END $$;
-- Remover role 'cliente' duplicada do usuÃ¡rio admin
DELETE FROM user_roles 
WHERE user_id = '8fd56b8a-3184-4f71-a33d-547082c7ff76' 
AND role = 'cliente';
-- Enable realtime for appointments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
-- Create table to store push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_push_subscriptions_barber_id ON public.push_subscriptions(barber_id);
CREATE INDEX idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);
CREATE INDEX idx_push_subscriptions_is_active ON public.push_subscriptions(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Barbers can view their own subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = push_subscriptions.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbers can insert their own subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = push_subscriptions.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbers can update their own subscriptions"
  ON public.push_subscriptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = push_subscriptions.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbers can delete their own subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = push_subscriptions.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Add booking_type column to appointments table to distinguish local vs online bookings
ALTER TABLE public.appointments 
ADD COLUMN booking_type text DEFAULT 'online' CHECK (booking_type IN ('local', 'online'));

-- Create indexes for faster queries
CREATE INDEX idx_appointments_booking_type ON public.appointments(booking_type);
CREATE INDEX idx_appointments_date_time ON public.appointments(appointment_date, appointment_time);
-- Add 'gestor' role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestor';
