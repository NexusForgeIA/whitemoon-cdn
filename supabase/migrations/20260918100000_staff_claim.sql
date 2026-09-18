-- Seguridad — paso a): rol 'staff' en app_metadata de las cuentas de WhiteMoon.
--
-- app_metadata solo lo escribe service_role; el usuario no puede tocarlo (a
-- diferencia de user_metadata). Las políticas de 20260918100100 y las funciones
-- fabrica-* leen este claim. El JWT lo lleva a partir del siguiente login: las
-- tres cuentas tienen que cerrar sesión y volver a entrar.
--
-- Solo staff: cris@, admin@ y panel@whitemoon.es. Las cuentas demo y las de
-- clientes NO llevan rol. Idempotente.

update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"staff"}'::jsonb
 where lower(email) in ('cris@whitemoon.es', 'admin@whitemoon.es', 'panel@whitemoon.es');
