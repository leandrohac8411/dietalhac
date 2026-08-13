-- Concede o papel de admin à conta do usuário (necessário para o painel Admin).
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'leandrohacarvalho@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
