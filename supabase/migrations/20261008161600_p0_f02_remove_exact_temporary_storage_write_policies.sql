-- F02 / SOD1820_P0_F01_F02_PATCH_BUILD_V1
-- Branch-only candidate. NOT APPLIED. Approved exact 14-policy inventory only.
-- STOP ON DRIFT: assert every expected identity, command, role, USING and WITH CHECK.
-- Do not restore legacy anonymous write grants as automated rollback.
do $preflight$
declare
  v_expected jsonb;
  v_actual jsonb;
  v_expected_count integer;
  v_actual_count integer;
begin
  with expected(policyname,cmd,roles,qual,with_check) as (values
    ('tmp_ctxt_i', 'INSERT', '{anon}', NULL, '((bucket_id = ''gallery''::text) AND (name = ''posts/tmp-content-5074.txt''::text))'),
    ('tmp_ctxt_u', 'UPDATE', '{anon}', '((bucket_id = ''gallery''::text) AND (name = ''posts/tmp-content-5074.txt''::text))', '((bucket_id = ''gallery''::text) AND (name = ''posts/tmp-content-5074.txt''::text))'),
    ('tmp_eg_c_i', 'INSERT', '{anon}', NULL, '((bucket_id = ''gallery''::text) AND (name = ''sod1820/cards/ego-confession.png''::text))'),
    ('tmp_eg_c_u', 'UPDATE', '{anon}', '((bucket_id = ''gallery''::text) AND (name = ''sod1820/cards/ego-confession.png''::text))', '((bucket_id = ''gallery''::text) AND (name = ''sod1820/cards/ego-confession.png''::text))'),
    ('tmp_eg_en_i', 'INSERT', '{anon}', NULL, '((bucket_id = ''gallery''::text) AND (name = ''sod1820/videos/ego-confession.en.vtt''::text))'),
    ('tmp_eg_en_u', 'UPDATE', '{anon}', '((bucket_id = ''gallery''::text) AND (name = ''sod1820/videos/ego-confession.en.vtt''::text))', '((bucket_id = ''gallery''::text) AND (name = ''sod1820/videos/ego-confession.en.vtt''::text))'),
    ('tmp_eg_he_i', 'INSERT', '{anon}', NULL, '((bucket_id = ''gallery''::text) AND (name = ''sod1820/videos/ego-confession.he.vtt''::text))'),
    ('tmp_eg_he_u', 'UPDATE', '{anon}', '((bucket_id = ''gallery''::text) AND (name = ''sod1820/videos/ego-confession.he.vtt''::text))', '((bucket_id = ''gallery''::text) AND (name = ''sod1820/videos/ego-confession.he.vtt''::text))'),
    ('tmp_eg_p_i', 'INSERT', '{anon}', NULL, '((bucket_id = ''gallery''::text) AND (name = ''sod1820/videos/ego-confession.jpg''::text))'),
    ('tmp_eg_p_u', 'UPDATE', '{anon}', '((bucket_id = ''gallery''::text) AND (name = ''sod1820/videos/ego-confession.jpg''::text))', '((bucket_id = ''gallery''::text) AND (name = ''sod1820/videos/ego-confession.jpg''::text))'),
    ('tmp_eg_v_i', 'INSERT', '{anon}', NULL, '((bucket_id = ''gallery''::text) AND (name = ''sod1820/videos/ego-confession.mp4''::text))'),
    ('tmp_eg_v_u', 'UPDATE', '{anon}', '((bucket_id = ''gallery''::text) AND (name = ''sod1820/videos/ego-confession.mp4''::text))', '((bucket_id = ''gallery''::text) AND (name = ''sod1820/videos/ego-confession.mp4''::text))'),
    ('tmp_metro_ins', 'INSERT', '{anon}', NULL, '((bucket_id = ''gallery''::text) AND (name ~~ ''sod1820/updates/metro-gush-dan%''::text))'),
    ('tmp_metro_upd', 'UPDATE', '{anon}', '((bucket_id = ''gallery''::text) AND (name ~~ ''sod1820/updates/metro-gush-dan%''::text))', '((bucket_id = ''gallery''::text) AND (name ~~ ''sod1820/updates/metro-gush-dan%''::text))')
  )
  select jsonb_agg(jsonb_build_object(
     'policyname',policyname,'cmd',cmd,'roles',roles,'qual',qual,'with_check',with_check
   ) order by policyname), count(*) into v_expected,v_expected_count
  from expected;

  select jsonb_agg(jsonb_build_object(
    'policyname',policyname,'cmd',cmd,'roles',roles::text,
    'qual',qual,'with_check',with_check
    ) order by policyname), count(*)
  into v_actual,v_actual_count
  from pg_policies where schemaname='storage' and tablename='objects'
    and policyname in (
      'tmp_ctxt_i',
      'tmp_ctxt_u',
      'tmp_eg_c_i',
      'tmp_eg_c_u',
      'tmp_eg_en_i',
      'tmp_eg_en_u',
      'tmp_eg_he_i',
      'tmp_eg_he_u',
      'tmp_eg_p_i',
      'tmp_eg_p_u',
      'tmp_eg_v_i',
      'tmp_eg_v_u',
      'tmp_metro_ins',
      'tmp_metro_upd'
    );
  if v_expected_count <> 14 or v_actual_count <> 14 or v_actual is distinct from v_expected
  then
     raise exception 'F02 preflight drift: expected inventory differs from live policies; stop';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='storage'
     and tablename='objects' and policyname='community_anon_upload'
     and cmd='INSERT' and roles @> array['anon']::name[]
  ) or not exists (
    select 1 from pg_policies where schemaname='storage'
     and tablename='objects' and policyname='public_read'
     and cmd='SELECT'
  ) or not exists (
    select 1 from pg_policies where schemaname='storage'
     and tablename='objects' and policyname='public_upload'
     and cmd='INSERT'
  ) then
     raise exception 'F02 preflight drift: required existing gallery readers/writers changed';
  end if;
end
$preflight$;

drop policy if exists "tmp_ctxt_i" on storage.objects;
drop policy if exists "tmp_ctxt_u" on storage.objects;
drop policy if exists "tmp_eg_c_i" on storage.objects;
drop policy if exists "tmp_eg_c_u" on storage.objects;
drop policy if exists "tmp_eg_en_i" on storage.objects;
drop policy if exists "tmp_eg_en_u" on storage.objects;
drop policy if exists "tmp_eg_he_i" on storage.objects;
drop policy if exists "tmp_eg_he_u" on storage.objects;
drop policy if exists "tmp_eg_p_i" on storage.objects;
drop policy if exists "tmp_eg_p_u" on storage.objects;
drop policy if exists "tmp_eg_v_i" on storage.objects;
drop policy if exists "tmp_eg_v_u" on storage.objects;
drop policy if exists "tmp_metro_ins" on storage.objects;
drop policy if exists "tmp_metro_upd" on storage.objects;

-- No storage object rows are touched; gallery community input, public reads,
-- authenticated INSERT, authorized admin/service paths and other buckets remain.
-- Recovery: forward-repair consumers via already authorized channels only.
