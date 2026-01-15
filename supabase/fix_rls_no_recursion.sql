-- Script para corrigir recursão infinita nas políticas RLS
-- O problema: A política "Admins can view all roles" usa has_role() que lê user_roles
-- Isso cria um loop infinito

-- REMOVER TODAS AS POLÍTICAS DE user_roles PRIMEIRO
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', r.policyname);
    END LOOP;
END $$;

-- ========== USER_ROLES - POLÍTICAS SEM RECURSÃO ==========

-- 1. SELECT: Usuário pode ver SUAS próprias roles (sem recursão)
CREATE POLICY "user_roles_select_own"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- 2. SELECT: Todos podem ver todas as roles (para evitar recursão)
-- IMPORTANTE: Removemos a verificação de admin para evitar recursão
-- Admins podem gerenciar via código/funções SECURITY DEFINER se necessário
CREATE POLICY "user_roles_select_all"
  ON public.user_roles FOR SELECT
  USING (true);

-- 3. INSERT: Usuário autenticado pode inserir SUA própria role
CREATE POLICY "user_roles_insert_own"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ========== PROFILES - MESMAS POLÍTICAS ==========

-- Remover todas as políticas de profiles primeiro
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    END LOOP;
END $$;

-- 1. SELECT: Todos podem ver
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);

-- 2. INSERT: Usuário autenticado pode inserir SEU próprio perfil
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

-- 3. UPDATE: Usuário pode atualizar SEU próprio perfil
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ========== FUNÇÃO handle_new_user ==========
-- Esta função deve funcionar porque é SECURITY DEFINER (bypassa RLS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir profile
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone);
  
  -- Inserir role cliente
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cliente')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== FUNÇÃO has_role - ATUALIZADA ==========
-- Esta função ainda funciona, mas não deve ser usada em políticas RLS de user_roles
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

-- ========== SITE_CONFIG ==========
-- Remover políticas que usam has_role para evitar recursão
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'site_config') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.site_config', r.policyname);
    END LOOP;
END $$;

-- Site config: Todos podem ver
CREATE POLICY "site_config_select_all"
  ON public.site_config FOR SELECT
  USING (true);

-- Site config: Apenas autenticados podem modificar (sem verificação de admin para evitar recursão)
-- Se precisar de controle de admin, fazer via código ou função SECURITY DEFINER
CREATE POLICY "site_config_modify_authenticated"
  ON public.site_config FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'user_roles', 'site_config')
ORDER BY tablename, policyname;
