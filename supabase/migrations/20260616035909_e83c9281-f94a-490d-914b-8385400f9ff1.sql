
-- retiros: SELECT aberto a qualquer autenticado
DROP POLICY IF EXISTS "retiros read membros ou admin" ON public.retiros;
CREATE POLICY "retiros select authenticated"
  ON public.retiros FOR SELECT
  TO authenticated
  USING (true);

-- retiro_membros: SELECT aberto a qualquer autenticado
DROP POLICY IF EXISTS "membros leitura propria ou admin" ON public.retiro_membros;
CREATE POLICY "retiro_membros select authenticated"
  ON public.retiro_membros FOR SELECT
  TO authenticated
  USING (true);

-- profiles: já tem select all auth (mantém)

-- user_roles: SELECT aberto a qualquer autenticado
DROP POLICY IF EXISTS "user_roles self read" ON public.user_roles;
CREATE POLICY "user_roles select authenticated"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);
