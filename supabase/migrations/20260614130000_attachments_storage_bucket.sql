-- P2-4.4: Attachments storage bucket
-- Records the 'attachments' bucket and its access policy in the migration
-- chain (previously applied ad-hoc). Public read access is provided by the
-- bucket's `public = true` flag via Supabase's public object URLs, so no
-- broad SELECT policy on storage.objects is required or added here
-- (a prior ad-hoc SELECT policy allowed bucket listing and was removed).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', true, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "authenticated upload attachments" on storage.objects;
drop policy if exists "public read attachments" on storage.objects;

create policy "authenticated upload attachments"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments');
