-- Carrusel circular «Explorá por categoría» (imagen, texto, enlace por ítem).

alter table public.site_home_config
	add column if not exists category_spotlight_rail jsonb;

comment on column public.site_home_config.category_spotlight_rail is 'Lista publicada de categorías destacadas (slug, etiqueta, imagen, href).';
