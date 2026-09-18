-- Seguridad — pasos c)-e): las tablas internas solo para staff.
--
-- Antes: "to authenticated USING(true)" en 7 tablas. Cualquier sesión de Supabase
-- Auth (cuentas demo, clientes y, con el signup abierto, cualquiera que confirme
-- un email) leía y escribía clientes, pagos, pipeline, leads y la fábrica.
-- Además onboarding_steps tenía "anon ALL true": lectura/escritura sin login.
--
-- Después: una política por tabla, solo para el claim
-- app_metadata.role = 'staff' (ver 20260918100000_staff_claim.sql).
--   - Panel CDN (staff): onboarding_clientes, historial_pagos, cdn_config, plantillas.
--   - Scout (staff): wm_pipeline, leads_web, onboarding_clientes (lectura).
--   - Fábrica y el resto de Edge Functions: service_role, no pasan por RLS.
--   - leads_web: se MANTIENE "Allow anonymous inserts" (los chatbots insertan
--     leads con la clave publicable). Nada de SELECT para anon.
--
-- Permisos de tabla: anon pierde todo salvo INSERT en leads_web. authenticated
-- pierde TRUNCATE (que se salta RLS), REFERENCES y TRIGGER.
--
-- create_default_onboarding_steps pasa a SECURITY DEFINER: insertaba los steps
-- con el rol de quien creaba el cliente y, sin política de authenticated en
-- onboarding_steps, el alta desde el panel fallaba.
--
-- Idempotente.

-- c) Políticas -----------------------------------------------------------------

drop policy if exists panel_authenticated_all           on public.onboarding_clientes;
drop policy if exists historial_pagos_authenticated_all on public.historial_pagos;
drop policy if exists authenticated_rw_cdn_config       on public.cdn_config;
drop policy if exists authenticated_all_pipeline        on public.wm_pipeline;
drop policy if exists "Allow authenticated reads"       on public.leads_web;
drop policy if exists "Allow authenticated updates"     on public.leads_web;
drop policy if exists "Allow authenticated deletes"     on public.leads_web;
drop policy if exists plantillas_admin_select           on public.plantillas;
drop policy if exists plantillas_admin_insert           on public.plantillas;
drop policy if exists plantillas_admin_update           on public.plantillas;
drop policy if exists plantillas_admin_delete           on public.plantillas;
drop policy if exists web_proyectos_admin_select        on public.web_proyectos;
drop policy if exists web_proyectos_admin_insert        on public.web_proyectos;
drop policy if exists web_proyectos_admin_update        on public.web_proyectos;
drop policy if exists web_proyectos_admin_delete        on public.web_proyectos;
drop policy if exists anon_all_onboarding_steps         on public.onboarding_steps;

do $$
declare
  t text;
begin
  foreach t in array array[
    'onboarding_clientes', 'historial_pagos', 'cdn_config', 'wm_pipeline',
    'leads_web', 'plantillas', 'web_proyectos', 'onboarding_steps'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists staff_all on public.%I', t);
    -- (select auth.jwt()) se evalúa una vez por consulta, no por fila.
    execute format($p$
      create policy staff_all on public.%I
        for all to authenticated
        using      (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'staff')
        with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'staff')
    $p$, t);
  end loop;
end $$;

-- d) leads_web: la política "Allow anonymous inserts" (anon, INSERT, WITH CHECK
-- true) no se toca.

-- e) Permisos de tabla ---------------------------------------------------------

revoke all on table
  public.onboarding_clientes, public.historial_pagos, public.cdn_config,
  public.wm_pipeline, public.leads_web, public.plantillas, public.web_proyectos,
  public.onboarding_steps
from anon;
grant insert on table public.leads_web to anon;

revoke truncate, references, trigger on table
  public.onboarding_clientes, public.historial_pagos, public.cdn_config,
  public.wm_pipeline, public.leads_web, public.plantillas, public.web_proyectos,
  public.onboarding_steps
from authenticated;

-- Trigger de alta: los 7 pasos por defecto no dependen del rol del insertante.
alter function public.create_default_onboarding_steps() security definer;
-- Es función de trigger: nadie tiene que poder llamarla por /rest/v1/rpc. El
-- trigger no comprueba EXECUTE al dispararse.
revoke execute on function public.create_default_onboarding_steps() from public, anon, authenticated;
