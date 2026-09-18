-- Cierre de permisos de las tablas de peluquería.
-- RLS ya está activo sin policies (anon/authenticated obtienen 0 filas por
-- PostgREST). Las edge functions usan service_role (BYPASSRLS): no se ven
-- afectadas. Esto retira el privilegio latente (incl. TRUNCATE) que la RLS no
-- cubre. Ningún JS de cliente toca estas tablas directo (solo leads_web, con su
-- propia policy anon INSERT).
revoke all privileges on table
  public.servicios_peluqueria,
  public.citas_peluqueria,
  public.clientes_peluqueria,
  public.peluqueria_config,
  public.citas_peluqueria_log,
  public.clientes_peluqueria_resumen
from anon, authenticated;
