DROP POLICY IF EXISTS "profiles admin all" ON public.profiles;
DROP POLICY IF EXISTS "membros admin write" ON public.retiro_membros;
DROP POLICY IF EXISTS "retiros admin write" ON public.retiros;
DROP POLICY IF EXISTS "user_roles admin write" ON public.user_roles;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_access_retiro(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_access_retiro(uuid, uuid) TO service_role;