-- Waylog — storage RLS policies for avatars / review-media buckets
-- 두 버킷은 Supabase 대시보드에서 public 으로 미리 생성되어 있다고 가정.
-- 코드(src/supabase.js)는 `${userId}/...` 경로 패턴으로 업로드하므로
-- 폴더 첫 segment 가 auth.uid() 와 일치하는 객체에만 쓰기 권한을 부여한다.

-- avatars: 자기 폴더에만 insert/update/delete
drop policy if exists "avatars_upload_own" on storage.objects;
create policy "avatars_upload_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- review-media: 자기 폴더에만 insert/update/delete
drop policy if exists "review_media_upload_own" on storage.objects;
create policy "review_media_upload_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'review-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "review_media_update_own" on storage.objects;
create policy "review_media_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'review-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "review_media_delete_own" on storage.objects;
create policy "review_media_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'review-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- read 는 버킷이 public 이면 자동 허용되지만, 명시적으로 select 정책도 추가
-- (버킷 public 토글이 꺼져도 동작하도록 안전망)
drop policy if exists "avatars_read_all" on storage.objects;
create policy "avatars_read_all" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "review_media_read_all" on storage.objects;
create policy "review_media_read_all" on storage.objects
  for select using (bucket_id = 'review-media');
