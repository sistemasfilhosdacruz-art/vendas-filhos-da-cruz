
-- 1) Enum de papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2) Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3) User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4) has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 5) Retiros
CREATE TABLE public.retiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retiros TO authenticated;
GRANT ALL ON public.retiros TO service_role;
ALTER TABLE public.retiros ENABLE ROW LEVEL SECURITY;

-- 6) Membros do retiro
CREATE TABLE public.retiro_membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retiro_id UUID NOT NULL REFERENCES public.retiros(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(retiro_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retiro_membros TO authenticated;
GRANT ALL ON public.retiro_membros TO service_role;
ALTER TABLE public.retiro_membros ENABLE ROW LEVEL SECURITY;

-- 7) Função helper: usuário tem acesso ao retiro?
CREATE OR REPLACE FUNCTION public.can_access_retiro(_user_id UUID, _retiro_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR EXISTS (SELECT 1 FROM public.retiro_membros WHERE user_id = _user_id AND retiro_id = _retiro_id)
$$;

-- 8) Policies: profiles
-- Todos os usuários autenticados podem ler perfis (para mostrar nomes)
CREATE POLICY "profiles select all auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles admin all" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 9) Policies: user_roles
CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles admin write" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 10) Policies: retiros
CREATE POLICY "retiros read membros ou admin" ON public.retiros FOR SELECT TO authenticated
  USING (public.can_access_retiro(auth.uid(), id));
CREATE POLICY "retiros admin write" ON public.retiros FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 11) Policies: retiro_membros
CREATE POLICY "membros leitura propria ou admin" ON public.retiro_membros FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "membros admin write" ON public.retiro_membros FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 12) Seed do admin (usuario: admin, senha: IVFmanancial123)
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@cantinho.local';
  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      'admin@cantinho.local',
      crypt('IVFmanancial123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"admin","full_name":"Administrador"}'::jsonb,
      '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id, jsonb_build_object('sub', admin_id::text, 'email', 'admin@cantinho.local'), 'email', admin_id::text, now(), now(), now());
  END IF;

  INSERT INTO public.profiles (id, username, full_name)
  VALUES (admin_id, 'admin', 'Administrador')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
