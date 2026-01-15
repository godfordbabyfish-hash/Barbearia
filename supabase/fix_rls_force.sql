-- Script FORÇADO para corrigir RLS - Aplicar novamente
-- Este script força a remoção de todas as políticas antigas e recria

-- REMOVER TODAS AS POLÍTICAS EXISTENTES PRIMEIRO
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Remover todas as políticas de profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    END LOOP;
    
    -- Remover todas as políticas de user_roles
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', r.policyname);
    END LOOP;
END $$;

-- AGORA CRIAR AS POLÍTICAS CORRETAS (ordem importa!)

-- ========== PROFILES ==========

-- 1. SELECT: Todos podem ver
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);

-- 2. INSERT: Usuário autenticado pode inserir SEU próprio perfil
-- IMPORTANTE: Para INSERT, usamos WITH CHECK (não USING)
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

-- 3. UPDATE: Usuário pode atualizar SEU próprio perfil
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ========== USER_ROLES ==========

-- 1. SELECT: Usuário pode ver SUAS próprias roles
CREATE POLICY "user_roles_select_own"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- 2. SELECT: Admins podem ver todas as roles
CREATE POLICY "user_roles_select_admin"
  ON public.user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- 3. INSERT: Usuário autenticado pode inserir SUA própria role
-- IMPORTANTE: Para INSERT, usamos WITH CHECK
CREATE POLICY "user_roles_insert_own"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ========== FUNÇÃO handle_new_user ==========
-- Esta função deve funcionar porque é SECURITY DEFINER
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

-- Verificar se has_role está correto
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

-- Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'user_roles')
ORDER BY tablename, policyname;
