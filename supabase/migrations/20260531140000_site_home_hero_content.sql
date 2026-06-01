-- Textos globales del hero (eyebrow, subtítulo, botones).

alter table public.site_home_config
	add column if not exists hero_content jsonb;

comment on column public.site_home_config.hero_content is
	'Textos publicados del hero del inicio (eyebrow, subtítulo, CTAs).';
