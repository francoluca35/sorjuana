-- Paneles configurables de la sección «Nuestra colección» (FashionCategories) en el inicio.

alter table public.site_home_config
	add column if not exists fashion_category_panels jsonb;

comment on column public.site_home_config.fashion_category_panels is 'Cuatro bloques (imagen/video, textos, enlaces) para la franja de colección en el inicio.';
