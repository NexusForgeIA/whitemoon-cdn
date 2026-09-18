-- servicios_peluqueria: modo de precio editable por el dueño del salón.
-- fijo/desde llevan cifra; consulta/gratis pueden ir sin precio.
alter table public.servicios_peluqueria
  add column if not exists precio_modo text not null default 'fijo';

-- precio_eur deja de ser obligatorio (consulta/gratis no llevan cifra)
alter table public.servicios_peluqueria
  alter column precio_eur drop not null,
  alter column precio_eur drop default;

alter table public.servicios_peluqueria
  drop constraint if exists servicios_precio_modo_chk,
  drop constraint if exists servicios_precio_coherente_chk,
  drop constraint if exists servicios_duracion_chk,
  drop constraint if exists servicios_nombre_chk;

alter table public.servicios_peluqueria
  add constraint servicios_precio_modo_chk
    check (precio_modo in ('fijo','desde','consulta','gratis')),
  add constraint servicios_precio_coherente_chk
    check (
      (precio_modo in ('fijo','desde')
        and precio_eur is not null and precio_eur >= 0 and precio_eur <= 9999)
      or precio_modo in ('consulta','gratis')
    ),
  add constraint servicios_duracion_chk
    check (duracion_min >= 15 and duracion_min <= 240),
  add constraint servicios_nombre_chk
    check (char_length(btrim(nombre)) between 1 and 80);
