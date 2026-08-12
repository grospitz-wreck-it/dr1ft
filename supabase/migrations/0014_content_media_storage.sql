-- ============================================================
-- DR1FT — Storage-Bucket für Content-Medien
--
-- Bilder/Videos für Posts. Bucket ist öffentlich LESBAR (Bilder sind
-- nicht sensibel/personenbezogen, sie zeigen fiktive Feed-Inhalte),
-- aber nur Redaktion (platform_staff) darf hochladen — verhindert, dass
-- irgendjemand mit einem gültigen Auth-Token beliebige Dateien in den
-- Feed-Content-Pool schieben kann.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('content-media', 'content-media', true)
on conflict (id) do nothing;

create policy "public read content media"
  on storage.objects for select
  using (bucket_id = 'content-media');

create policy "staff upload content media"
  on storage.objects for insert
  with check (bucket_id = 'content-media' and is_platform_staff());

create policy "staff delete content media"
  on storage.objects for delete
  using (bucket_id = 'content-media' and is_platform_staff());
