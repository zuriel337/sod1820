-- Manual data proposal for the existing public gallery reader. Separate owner approval
-- for this commit and this operation is required. Never add this file to migrations.
-- Use the gallery_images table owner with read/row-lock privileges on galleries,
-- media_migration_queue and storage.objects. Record apply_transaction_id after COMMIT in Work.
-- Rollback: ROLLBACK_20261122190000_gallery_wordpress_publication.sql with that exact transaction ID.
-- Both directions use the same reviewed image IDs and whole-row SHA-256 fingerprints.
--
-- Of 284 non-hidden tier-zero original WordPress placements with value 2, 283 have a
-- working first-party file. WP 474 is held: no working first-party object is verified.
-- WP 3512 has a completed media migration and its replacement JPEG was verified.
-- 276 of these rows have a deliberately preserved NULL stream_at. An ordinary UPDATE
-- would silently populate it and change historic feed metadata. Both directions hold
-- a writer lock and suspend only the checked timestamp repair trigger during one
-- UPDATE; reads continue. PostgreSQL restores all state on failure.

begin;
set local search_path = pg_catalog;
set local lock_timeout = '5s';
set local statement_timeout = '45s';
set local timezone = 'UTC';
set local datestyle = 'ISO, MDY';
set local extra_float_digits = 0;

do $release$
declare
  wp_ids constant integer[] := array[
    10, 11, 13, 14, 17, 18, 20, 129, 130, 140, 147, 150,
    153, 155, 156, 162, 163, 164, 165, 166, 167, 168, 169, 172,
    173, 174, 183, 185, 186, 187, 188, 193, 194, 195, 196, 197,
    199, 202, 203, 207, 208, 232, 246, 247, 248, 249, 250, 251,
    252, 253, 260, 261, 266, 267, 268, 269, 272, 273, 276, 279,
    280, 282, 283, 285, 286, 287, 290, 292, 294, 300, 309, 310,
    311, 313, 314, 315, 317, 320, 321, 332, 337, 338, 339, 340,
    341, 342, 343, 345, 348, 349, 350, 351, 352, 355, 356, 358,
    361, 362, 363, 364, 365, 366, 367, 368, 369, 380, 382, 386,
    407, 429, 434, 435, 436, 437, 442, 457, 458, 459, 460, 461,
    462, 465, 466, 467, 468, 469, 470, 471, 472, 473, 475, 478,
    479, 480, 483, 484, 487, 490, 492, 494, 495, 496, 498, 500,
    502, 503, 505, 512, 686, 865, 869, 893, 894, 895, 898, 904,
    926, 1026, 1027, 1040, 1121, 1156, 1250, 1259, 1469, 1484, 1485, 1486,
    1517, 1534, 1703, 1730, 1745, 1746, 2114, 2117, 2369, 2374, 2375, 2419,
    2420, 2421, 2423, 2424, 2472, 2474, 2571, 2572, 2713, 2714, 2715, 2716,
    2717, 3037, 3041, 3046, 3047, 3048, 3049, 3053, 3110, 3111, 3120, 3168,
    3169, 3170, 3171, 3173, 3213, 3300, 3407, 3416, 3417, 3418, 3419, 3420,
    3422, 3423, 3448, 3449, 3450, 3451, 3452, 3453, 3458, 3460, 3462, 3463,
    3464, 3465, 3470, 3471, 3472, 3473, 3475, 3476, 3477, 3478, 3479, 3484,
    3487, 3488, 3492, 3493, 3494, 3495, 3497, 3498, 3499, 3500, 3501, 3502,
    3503, 3504, 3505, 3506, 3507, 3508, 3510, 3511, 3512, 3513, 3514, 3515,
    3517, 3521, 3525, 3526, 3527, 3528, 3529, 3530, 3532, 3533, 3534, 3535,
    3536, 3537, 3538, 3539, 3540, 3541, 3542
  ];
  expected_count constant integer := 283;
  before_hash constant text := '7e94e76e5db667c7ee01c8fd635f51908a7408c3c55fffc1163754c8e47183c4';
  after_hash constant text := '857e8e3db07829fa04e49df7e11c34fc02ce32172d6670855a42f752f484829a';
  old_url constant text := 'https://sod1820.co.il/wp-content/uploads/2025/12/140-צהל-.jpg';
  new_key constant text := 'uploads/2025/12/7e07d127d2cdb86f.jpg';
  new_url constant text := 'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/' || new_key;
  direction text := coalesce(nullif(current_setting('sod1820.gallery_release_action', true), ''), 'apply');
  release_xid text := current_setting('sod1820.gallery_release_xid', true);
  required_hash text;
  result_hash text;
  actual_hash text;
  n integer;
  changed integer;
  matching_xids integer;
  candidate_ids uuid[];
  pass integer;
  trigger_signature text;
begin
  if direction not in ('apply', 'rollback') then
    raise exception 'Unknown gallery release action %', direction;
  end if;
  if direction = 'rollback' then
    if release_xid is null or release_xid !~ '^[0-9]{1,20}$' then
      raise exception 'Rollback requires the full apply_transaction_id recorded at COMMIT';
    end if;
    if pg_current_xact_id()::text::numeric - release_xid::numeric not between 0 and 2147483647 then
      raise exception 'Apply transaction ID is outside the visible transaction epoch';
    end if;
  end if;
  required_hash := case direction when 'apply' then before_hash else after_hash end;
  result_hash := case direction when 'apply' then after_hash else before_hash end;
  perform set_config('sod1820.gallery_release_receipt', '', true);

  lock table public.gallery_images in share row exclusive mode;
  perform g.id from public.galleries g join public.gallery_images i on i.gallery_id = g.id
    where i.wp_image_id = any(wp_ids) for share of g;
  for pass in 1..2 loop
    -- Hashing the complete records also detects unpublished edits, schema changes and
    -- unforeseen side effects. No captions or other historic content enter the release file.
    select count(*), encode(sha256(convert_to(string_agg(to_jsonb(i)::text, E'\n'
               order by i.wp_image_id), 'UTF8')), 'hex'),
           count(*) filter (where case when direction = 'rollback'
             then i.xmin::text::numeric = mod(release_xid::numeric, 4294967296) else false end),
           array_agg(i.id)
      into n, actual_hash, matching_xids, candidate_ids
      from public.gallery_images i join public.galleries g on g.id = i.gallery_id
       and g.wp_gallery_id = i.wp_gallery_id and g.space = 'core'
     where i.wp_image_id = any(wp_ids) and i.source in ('manual', 'update')
       and i.space = 'core' and i.curation_status = 'raw' and i.min_tier = 0
       and i.curator_hidden is not true and i.published in (1, 2);

    if n <> expected_count then
      raise exception 'Gallery identity, membership, tier or editorial state changed (%)', n;
    end if;
    if actual_hash = result_hash then
      exit;
    end if;
    if pass = 2 or actual_hash is distinct from required_hash then
      raise exception 'Gallery snapshot changed; no partial batch is permitted';
    end if;
    if direction = 'rollback' and matching_xids <> expected_count then
      raise exception 'Rollback refused: candidate rows were edited outside the recorded apply transaction';
    end if;
    if direction = 'apply' and not exists (
      select 1 from public.media_migration_queue q
        join storage.objects o on o.bucket_id = 'media' and o.name = q.dest_key
       where q.path = 'uploads/2025/12/140-%D7%A6%D7%94%D7%9C-.jpg'
         and q.dest_key = new_key and q.status = 'done' and q.http_status = 200
         and o.metadata->>'mimetype' = 'image/jpeg' and (o.metadata->>'size')::bigint = 97982
       for share of q, o
    ) then
      raise exception 'Verified first-party replacement for WP image 3512 is unavailable';
    end if;

    select pg_get_triggerdef(t.oid) into trigger_signature
      from pg_trigger t join pg_proc p on p.oid = t.tgfoid
     where t.tgrelid = 'public.gallery_images'::regclass
       and t.tgname = 'trg_gallery_stream_at_guard' and t.tgenabled = 'O'
       and not t.tgisinternal and t.tgtype = 23 and t.tgqual is null and t.tgnargs = 0
       and t.tgattr = ''::int2vector and not p.prosecdef and p.proconfig is null
       and t.tgfoid = 'public.gallery_images_stream_at_guard()'::regprocedure
       and md5(p.prosrc) = 'c9128b5832bf4c3c7444f55045ea9457';
    if trigger_signature is null then
      raise exception 'Timestamp normalizer differs from the reviewed definition';
    end if;
    alter table public.gallery_images disable trigger trg_gallery_stream_at_guard;
    update public.gallery_images
       set published = case direction when 'apply' then 1 else 2 end,
           image_url = case when wp_image_id <> 3512 then image_url
                            when direction = 'apply' then new_url else old_url end
     where id = any(candidate_ids);
    get diagnostics changed = row_count;
    alter table public.gallery_images enable trigger trg_gallery_stream_at_guard;
    if changed <> expected_count or not exists (
      select 1 from pg_trigger t where t.tgrelid = 'public.gallery_images'::regclass
        and t.tgname = 'trg_gallery_stream_at_guard' and t.tgenabled = 'O'
        and pg_get_triggerdef(t.oid) = trigger_signature
    ) then
      raise exception 'Restore trigger or update-count postcondition failed';
    end if;
    if direction = 'apply' then
      perform set_config('sod1820.gallery_release_receipt', pg_current_xact_id()::text, true);
    end if;
  end loop;
end
$release$;

-- A NULL value means the transaction did not apply a new batch.
select nullif(current_setting('sod1820.gallery_release_receipt', true), '') as apply_transaction_id;
commit;
