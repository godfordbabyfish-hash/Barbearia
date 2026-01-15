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
  "title": "Estilo & Elegância",
  "subtitle": "Tradição em cada corte",
  "description": "Mais de 10 anos transformando visual em autoestima. Barbearia premium com atendimento de excelência.",
  "image_url": null
}'::jsonb),
('footer_info', '{
  "address": "Rua das Barbearias, 123 - Centro",
  "phone": "(11) 99999-9999",
  "email": "contato@barbearia.com",
  "hours": "Seg-Sex: 9h-20h | Sáb: 9h-18h",
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