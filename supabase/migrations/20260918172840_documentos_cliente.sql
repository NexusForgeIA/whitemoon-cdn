-- Documentos por cliente (facturas, contratos…): el archivo va en Storage
-- (bucket privado clientes-docs) y aquí solo la referencia.
--
-- Todo nuevo: no toca tablas existentes. Acceso solo staff
-- (app_metadata.role = 'staff', ver 20260918100000_staff_claim.sql).
--
-- Permisos de tabla: anon, nada. authenticated, solo SELECT/INSERT/UPDATE/DELETE
-- para que el panel (JWT de staff) pueda usarla; quien pasa lo decide RLS.
-- Sin TRUNCATE, que se salta RLS (mismo patrón que 20260918100100).
--
-- Idempotente.

-- 1) Bucket privado de Storage
insert into storage.buckets (id, name, public)
values ('clientes-docs', 'clientes-docs', false)
on conflict (id) do nothing;

-- 2) Tabla de metadatos
create table if not exists public.documentos_cliente (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null references public.onboarding_clientes(id) on delete cascade,
  tipo text not null default 'otro' check (tipo in ('factura', 'contrato', 'otro')),
  nombre text not null,
  ruta_storage text not null,
  mime text,
  tamano_bytes bigint,
  subido_por text,
  created_at timestamptz not null default now()
);

alter table public.documentos_cliente enable row level security;

drop policy if exists staff_all on public.documentos_cliente;
-- (select auth.jwt()) se evalúa una vez por consulta, no por fila.
create policy staff_all on public.documentos_cliente
  for all to authenticated
  using      ((((select auth.jwt()) -> 'app_metadata') ->> 'role') = 'staff')
  with check ((((select auth.jwt()) -> 'app_metadata') ->> 'role') = 'staff');

revoke all on table public.documentos_cliente from anon, authenticated;
grant select, insert, update, delete on table public.documentos_cliente to authenticated;

-- 3) Storage: solo staff sobre el bucket clientes-docs
drop policy if exists clientes_docs_staff on storage.objects;
create policy clientes_docs_staff on storage.objects
  for all to authenticated
  using      (bucket_id = 'clientes-docs' and (((select auth.jwt()) -> 'app_metadata') ->> 'role') = 'staff')
  with check (bucket_id = 'clientes-docs' and (((select auth.jwt()) -> 'app_metadata') ->> 'role') = 'staff');
