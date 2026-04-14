-- Bucket público para imágenes y videos del sitio / panel (nombre: sorjuana)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'sorjuana',
	'sorjuana',
	true,
	52428800,
	null
)
on conflict (id) do update set
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

-- Políticas sobre storage.objects
drop policy if exists "sorjuana_select_public" on storage.objects;
drop policy if exists "sorjuana_insert_authenticated" on storage.objects;
drop policy if exists "sorjuana_update_authenticated" on storage.objects;
drop policy if exists "sorjuana_delete_authenticated" on storage.objects;

create policy "sorjuana_select_public"
	on storage.objects for select
	using (bucket_id = 'sorjuana');

create policy "sorjuana_insert_authenticated"
	on storage.objects for insert
	to authenticated
	with check (bucket_id = 'sorjuana');

create policy "sorjuana_update_authenticated"
	on storage.objects for update
	to authenticated
	using (bucket_id = 'sorjuana')
	with check (bucket_id = 'sorjuana');

create policy "sorjuana_delete_authenticated"
	on storage.objects for delete
	to authenticated
	using (bucket_id = 'sorjuana');
