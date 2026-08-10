-- 🩹 תיקון «דיווח רמז» (community_hints) שנשבר למדווחים אנונימיים.
-- הפיצ'ר מתוכנן לאנונימי («אין צורך בהרשמה»), אבל היו שני פערים:
--   (1) באקט האחסון gallery — policy INSERT היה רק ל-authenticated (public_upload), בלי anon
--       → העלאת התמונה נחסמה בשקט ("שגיאה בהעלאת התמונה").
--   (2) הטבלה community_hints — היה policy ch_insert ל-{anon,authenticated} אבל בלי GRANT INSERT
--       → מלכודת policy-בלי-grant (rls_client_read_protocol): גם אחרי תיקון האחסון, ה-INSERT ייכשל.

-- (1) GRANT INSERT מצומצם-עמודות: רק העמודות שהלקוח כותב. status נשאר ברירת-מחדל 'pending'
--     (נאכף שוב ב-ch_insert with_check), ועמודות-האדמין (status/review_note/gallery_image_id/reviewed_*)
--     לא ניתנות לכתיבה ע"י הלקוח.
grant insert (visitor_id, reporter_user_id, reporter_name, image_url, number, all_numbers, description, source_url, occurred_at)
  on public.community_hints to anon, authenticated;

-- (2) אחסון: לאפשר העלאה אנונימית (וגם authenticated) אך ורק תחת gallery/community/ (תמונות-רמז UGC).
--     upsert=false בצד-הלקוח + prefix קבוע → אנונימי לא יכול לדרוס מדיה קיימת בבאקט.
drop policy if exists community_anon_upload on storage.objects;
create policy community_anon_upload on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'gallery' and (storage.foldername(name))[1] = 'community');
