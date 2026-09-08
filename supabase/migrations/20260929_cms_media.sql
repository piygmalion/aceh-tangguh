-- CMS cover images (AN-49 / DATA-28). Write only via Next service_role (BE-36).
-- Do not alter citizen-report media bucket policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cms-media',
  'cms-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists cms_media_select on storage.objects;
create policy cms_media_select on storage.objects
  for select
  using (bucket_id = 'cms-media');
