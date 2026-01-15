-- Script para corrigir políticas RLS que estão bloqueando signup e operações básicas
-- Execute este script após aplicar as migrations

-- 1. Permitir inserção de profiles durante signup (a função handle_new_user já é SECURITY DEFINER)
-- Mas precisamos garantir que a função possa inserir
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
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone);
  
  -- Assign cliente role by default (se não existir)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cliente')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 2. Permitir que usuários autenticados possam inserir/atualizar seus próprios profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Permitir que usuários vejam suas próprias roles (necessário durante signup)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Permitir inserção de roles para o próprio usuário (se necessário)
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
CREATE POLICY "Users can insert own role"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Permitir que admins vejam todas as roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Garantir que a função has_role funcione corretamente
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

-- 6. Verificar se o trigger está configurado corretamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Políticas adicionais para garantir que signup funcione
-- Permitir leitura pública de algumas coisas necessárias para o signup funcionar
DROP POLICY IF EXISTS "Public can read services for signup" ON public.services;
CREATE POLICY "Public can read services for signup"
  ON public.services FOR SELECT
  USING (visible = true OR auth.role() = 'authenticated');

-- 8. Verificar e corrigir políticas de site_config
DROP POLICY IF EXISTS "Everyone can view site config" ON public.site_config;
CREATE POLICY "Everyone can view site config"
ON public.site_config
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage site config" ON public.site_config;
CREATE POLICY "Admins can manage site config"
ON public.site_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Nota: As funções SECURITY DEFINER podem inserir em tabelas protegidas por RLS
-- mas é importante que as políticas permitam operações básicas para usuários autenticados
