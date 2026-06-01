-- Política de cambios y devoluciones (editable desde /app/mapa-pagina).

alter table public.site_home_config
	add column if not exists return_policy jsonb;

comment on column public.site_home_config.return_policy is
	'Contenido publicado de /politica-cambios-devoluciones (título, secciones, WhatsApp).';
