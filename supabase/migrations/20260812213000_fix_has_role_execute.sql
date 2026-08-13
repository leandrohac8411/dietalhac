-- As policies administrativas chamam has_role como usuário autenticado.
-- Sem EXECUTE, qualquer SELECT em profiles falha antes mesmo de a policy
-- "own profile" conseguir liberar a própria linha do usuário.
--
-- A função só permite consultar papéis do próprio usuário autenticado, evitando
-- transformar a função SECURITY DEFINER em um enumerador de papéis de terceiros.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    );
$$;

REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
