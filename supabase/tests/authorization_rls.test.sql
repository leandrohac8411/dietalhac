BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(6);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'rls-user@example.test', '',
    now(), now(), now(), '{}', '{"full_name":"Usuário RLS"}'
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'rls-admin@example.test', '',
    now(), now(), now(), '{}', '{"full_name":"Admin RLS"}'
  );

INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-4000-8000-000000000002', 'admin')
ON CONFLICT DO NOTHING;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

SELECT results_eq(
  'SELECT count(*)::bigint FROM public.profiles',
  ARRAY[1::bigint],
  'usuário comum enxerga somente o próprio perfil'
);
SELECT is(
  public.has_role(auth.uid(), 'admin'),
  false,
  'usuário comum não recebe papel de admin'
);
SELECT is(
  public.has_role('00000000-0000-4000-8000-000000000002', 'admin'),
  false,
  'has_role não permite consultar o papel de terceiros'
);
SELECT results_eq(
  $$UPDATE public.profiles SET full_name = 'Tentativa indevida'
    WHERE id = '00000000-0000-4000-8000-000000000002'
    RETURNING id$$,
  ARRAY[]::uuid[],
  'usuário comum não altera perfil de terceiro'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SELECT is(
  public.has_role(auth.uid(), 'admin'),
  true,
  'administrador consulta o próprio papel'
);
SELECT results_eq(
  'SELECT count(*)::bigint FROM public.profiles',
  ARRAY[2::bigint],
  'administrador enxerga os perfis cadastrados'
);

SELECT * FROM finish();
ROLLBACK;
