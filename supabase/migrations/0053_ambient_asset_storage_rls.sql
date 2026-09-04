-- ============================================================
-- DR1FT — Storage-RLS für generierte Ambient-Bilder
--
-- Ambient-Bilder werden serverseitig von der Editorial-App erzeugt,
-- aber mit dem authentifizierten Redaktions-Client in Supabase Storage
-- gespeichert. Der Bucket darf öffentlich gelesen werden; Upload und
-- Löschen bleiben auf platform_staff beschränkt.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('ambient-assets', 'ambient-assets', true)
on conflict (id) do update set public = true;

create policy "public read ambient assets"
  on storage.objects for select
  using (bucket_id = 'ambient-assets');

create policy "staff upload ambient assets"
  on storage.objects for insert
  with check (bucket_id = 'ambient-assets' and is_platform_staff());

create policy "staff delete ambient assets"
  on storage.objects for delete
  using (bucket_id = 'ambient-assets' and is_platform_staff());
