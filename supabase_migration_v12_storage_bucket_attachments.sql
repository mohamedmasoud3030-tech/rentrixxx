-- ============================================================
-- Rentrix - Attachment Storage Bucket (private, org-scoped)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rentrix-attachments',
  'rentrix-attachments',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "rentrix_attachments_insert_own_org" on storage.objects;
create policy "rentrix_attachments_insert_own_org"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'rentrix-attachments'
  and split_part(name, '/', 1) = coalesce(nullif(auth.jwt() ->> 'org_id', ''), auth.uid()::text)
);

drop policy if exists "rentrix_attachments_read_own_org" on storage.objects;
create policy "rentrix_attachments_read_own_org"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'rentrix-attachments'
  and split_part(name, '/', 1) = coalesce(nullif(auth.jwt() ->> 'org_id', ''), auth.uid()::text)
);

drop policy if exists "rentrix_attachments_delete_own_org" on storage.objects;
create policy "rentrix_attachments_delete_own_org"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'rentrix-attachments'
  and split_part(name, '/', 1) = coalesce(nullif(auth.jwt() ->> 'org_id', ''), auth.uid()::text)
);

