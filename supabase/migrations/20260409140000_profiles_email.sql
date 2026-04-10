-- Email en perfil: el login por usuario lo usa sin depender solo de auth.admin
alter table public.profiles add column if not exists email text;

-- Sincronizar emails desde Auth (ejecutá una vez si ya tenías perfiles sin email)
-- update public.profiles p set email = u.email from auth.users u where p.id = u.id and p.email is null;
