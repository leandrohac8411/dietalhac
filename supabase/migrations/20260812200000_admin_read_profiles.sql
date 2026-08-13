-- Permite que administradores listem todos os perfis cadastrados (painel Admin > Usuários).
CREATE POLICY "admin read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
