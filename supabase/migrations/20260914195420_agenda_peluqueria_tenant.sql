-- Agenda de peluquería multi-tenant — PR 1: modelo de inquilino.
--
-- El inquilino (tenant) es onboarding_clientes.token_cdn; la demo pública usa
-- tenant = 'demo-peluquerias'. Todas las filas existentes pasan a la demo.
--
-- Frontera de seguridad: la Edge Function peluquerias-cita, que lee y escribe con
-- service_role (bypassa RLS) y aplicará el scope por tenant (PR 2). Las tablas
-- mantienen RLS activado y SIN políticas para anon/authenticated (denegar por
-- defecto): nadie las lee directo desde el navegador. Una política de lectura
-- para authenticated solo tendrá sentido cuando exista la relación
-- usuario -> tenant (PR 4), y tendrá que filtrar por tenant.
--
-- Idempotente: volver a ejecutarla no cambia nada.

-- 1 + 3) Columna tenant con backfill. El DEFAULT constante rellena las filas
-- existentes con la demo y, mientras la función no mande tenant (PR 2), sus
-- inserts siguen cayendo en la demo.
alter table public.citas_peluqueria     add column if not exists tenant text not null default 'demo-peluquerias';
alter table public.clientes_peluqueria  add column if not exists tenant text not null default 'demo-peluquerias';
alter table public.servicios_peluqueria add column if not exists tenant text not null default 'demo-peluquerias';
alter table public.citas_peluqueria_log add column if not exists tenant text not null default 'demo-peluquerias';

-- 2) peluqueria_config: de fila única (id = 1) a una fila por tenant.
alter table public.peluqueria_config add column if not exists tenant text;
update public.peluqueria_config set tenant = 'demo-peluquerias' where tenant is null;
alter table public.peluqueria_config alter column tenant set not null;
do $$
begin
  if exists (select 1 from pg_constraint
             where conrelid = 'public.peluqueria_config'::regclass
               and conname = 'peluqueria_config_pkey'
               and pg_get_constraintdef(oid) = 'PRIMARY KEY (id)') then
    alter table public.peluqueria_config drop constraint peluqueria_config_pkey;
  end if;
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.peluqueria_config'::regclass and contype = 'p') then
    alter table public.peluqueria_config add constraint peluqueria_config_pkey primary key (tenant);
  end if;
end $$;
-- La fila de la demo conserva id = 1 (la función actual lee id=eq.1 hasta el
-- PR 2); las filas de otros tenants no llevan id.
alter table public.peluqueria_config alter column id drop default;
alter table public.peluqueria_config alter column id drop not null;
create unique index if not exists peluqueria_config_id_key on public.peluqueria_config (id);

-- 4) Unicidad por tenant, no global.
drop index if exists public.clientes_peluqueria_tel_norm_idx;
create unique index if not exists clientes_peluqueria_tenant_tel_norm_key
  on public.clientes_peluqueria (tenant, telefono_norm);
alter table public.servicios_peluqueria drop constraint if exists servicios_peluqueria_nombre_key;
create unique index if not exists servicios_peluqueria_tenant_nombre_key
  on public.servicios_peluqueria (tenant, nombre);

-- Índices de acceso por tenant (las consultas del PR 2 filtran siempre por tenant).
create index if not exists citas_peluqueria_tenant_cita_at_idx
  on public.citas_peluqueria (tenant, cita_at);
create index if not exists citas_peluqueria_tenant_tel_norm_idx
  on public.citas_peluqueria (tenant, cliente_telefono_norm, cita_at);
create index if not exists citas_peluqueria_log_tenant_idx
  on public.citas_peluqueria_log (tenant, created_at);

-- Resumen de clientes: expone tenant (al final, para que CREATE OR REPLACE no
-- rompa la vista) y no cuenta citas de otro tenant.
create or replace view public.clientes_peluqueria_resumen
  with (security_invoker = on) as
  select p.id, p.nombre, p.telefono, p.notas, p.created_at,
         count(c.id) as n_citas,
         max(c.cita_at) as ultima_cita,
         p.tenant
    from public.clientes_peluqueria p
    left join public.citas_peluqueria c
      on c.cliente_id = p.id and c.tenant = p.tenant and c.estado <> 'cancelada'
   group by p.id;

-- 5) RLS activado (ya lo estaba) y sin políticas para anon/authenticated.
alter table public.citas_peluqueria     enable row level security;
alter table public.clientes_peluqueria  enable row level security;
alter table public.servicios_peluqueria enable row level security;
alter table public.citas_peluqueria_log enable row level security;
alter table public.peluqueria_config    enable row level security;

comment on table public.citas_peluqueria is
  'Agenda de peluquería multi-tenant (tenant = onboarding_clientes.token_cdn; demo: demo-peluquerias). Sin políticas RLS: el acceso y el scope por tenant van por la Edge Function peluquerias-cita (service_role).';
comment on table public.clientes_peluqueria is
  'Clientes por tenant; teléfono único por (tenant, telefono_norm). Acceso solo vía Edge Function peluquerias-cita.';
comment on table public.servicios_peluqueria is
  'Catálogo de servicios por tenant; nombre único por (tenant, nombre). Acceso solo vía Edge Function peluquerias-cita.';
comment on table public.citas_peluqueria_log is
  'Log de acciones de la agenda por tenant. Acceso solo vía Edge Function peluquerias-cita.';
comment on table public.peluqueria_config is
  'Configuración del salón: una fila por tenant (PK tenant). La demo conserva id = 1. Acceso solo vía Edge Function peluquerias-cita.';
