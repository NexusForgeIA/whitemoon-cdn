-- Vista previa real de la web del cliente: URL de GitHub Pages del repo clonado.
-- La rellena fabrica-reskin al activar Pages tras el reskin.
alter table public.web_proyectos add column if not exists preview_url text;
