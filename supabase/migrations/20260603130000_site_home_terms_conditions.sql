-- Términos y condiciones (editable desde /app/mapa-pagina).

alter table public.site_home_config
	add column if not exists terms_conditions jsonb;

comment on column public.site_home_config.terms_conditions is
	'Contenido publicado de /terminos-y-condiciones (título, secciones, WhatsApp).';
