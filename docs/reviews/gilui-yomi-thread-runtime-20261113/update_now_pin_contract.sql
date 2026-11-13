-- Apply after update_writer_attribution_contract.sql, with the release that makes the Community discussion available in Now.
BEGIN;

DO $update_now_contract$
DECLARE
  delta constant text := $pin$המשך מ־13.11.2026 — סדר ״עכשיו״ בדיון של ״הגילוי היומי״. ברגע שהכרטיס שמוביל לשרשור ציבורי זמין ב״עכשיו״, הוא מקבל מקום לפי מועד הפרסום או העדכון העריכתי המשמעותי של הדיון. הודעות בודדות של ״הגילוי היומי״ מוצגות לפי זמן, ללא נעיצת כותב אוטומטית. לפני שכרטיס הדיון זמין חלים כללי הנעיצה הקודמים. נעיצת ההודעה המרכזית של המסגרת ממשיכה לפי החוזה הקיים.$pin$;
  original_hash constant text := '925968e5e8dc31be9d1036f4ca2fe3fb';
  updated_hash constant text := '54fdc5c06b12bbe933c958f172f4b833';
  stored_hash text;
BEGIN
  SELECT md5(body) INTO stored_hash
  FROM public.project_codex
  WHERE id = 37 AND slug = 'sod1820_reality_stream_os_master_v3_20261016_draft'
  FOR UPDATE;

  IF stored_hash = updated_hash THEN RETURN; END IF;
  IF stored_hash IS DISTINCT FROM original_hash THEN
    RAISE EXCEPTION 'Document 37 changed since review';
  END IF;

  UPDATE public.project_codex
  SET body = body || E'\n\n' || delta || E'\n', updated_at = now()
  WHERE id = 37 AND md5(body || E'\n\n' || delta || E'\n') = updated_hash;

  IF NOT FOUND THEN RAISE EXCEPTION 'Document 37 candidate hash mismatch'; END IF;
END
$update_now_contract$;

SELECT id, md5(body) AS body_hash FROM public.project_codex WHERE id = 37;
COMMIT;
