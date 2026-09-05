-- ============================================================================
-- gallery_images.primary_value_source — additive provenance column
-- ============================================================================
-- WHY: primary_value is NOT cosmetic metadata. It is consumed as ground truth by:
--   graph wiring (wire_image_meaningful -> nodes/edges), convergence_meter,
--   Number dossier (number_dossier_json), Reality Stream UI (RealityWorld.jsx,
--   ArchivePage.jsx), notify_on_stream_image (realtime push), sitemap_numbers
--   (SEO), top_primary_values (public ranking widget).
-- Until now it mixed, indistinguishably: human-set values (admin edit),
-- auto-set values (feed_image_to_search), and untraceable legacy/import
-- values -- including a documented graph-truth bug in the automated path,
-- root-fixed in 20260826170000_image_primary_value_root_fix.sql (separate
-- migration/branch/PR, not part of this change). Provenance is a first-class
-- operational fact and deserves its own column -- NOT a key inside ocr_meta,
-- because primary_value can be purely manual and is not necessarily
-- OCR-derived at all (see gallery_images rows with ocr_text/ocr_meta all
-- NULL but a human-curated primary_value, e.g. id=d6d90a5e... found during
-- the Reality Stream Second-Pass audit).
--
-- LIVE WRITE-PATH CROSSWALK (performed read-only before this migration, via
-- pg_proc scan for every public function referencing primary_value,
-- pg_trigger on gallery_images, and a full grep of src/ for gallery_images
-- .update(...)/primary_value assignments):
--
--   1. feed_image_to_search(p_id, p_overwrite)  [DB function]
--      Fired by trigger feed_after_ocr (AFTER UPDATE OF ocr_status WHEN
--      ocr_status='done'), via trg_feed_after_ocr(). Sets primary_value
--      ONLY when it was NULL and exactly one unambiguous OCR-derived
--      candidate exists (post root-fix: no competing candidate = not a
--      guess). -> 'auto_single_candidate'.
--
--   2. ImageEditModal.jsx -> setImageCuration() [src/lib/supabase.js]
--      -> client .update() on gallery_images.
--      setImageCuration() is the ONE generic client writer used by every
--      admin surface (ArchivePage/GalleryPage/TopicPage/HomeNewPage/
--      PostsPage/AdminPage/RealityWorld/TreasuresHome/PostImageCarousel),
--      but only ImageEditModal's handleSave() ever builds a patch containing
--      primary_value (a free-text numeric field an admin edits directly).
--      All other call sites only ever patch importance/curator_hidden/
--      source/image_type/retention. -> 'manual'.
--
--   3. approve_community_hint(p_id, p_number, p_name, p_occurred)
--      [DB function, SECURITY DEFINER, admin-only via users.role='admin'
--      check]. INSERTs a new gallery_images row when an admin approves a
--      community-submitted hint, with primary_value = coalesce(p_number,
--      submitted number) -- confirmed/overridden by the admin at approval
--      time. Same human-decision semantics as #2 (a person decided this is
--      the image's primary value), just a distinct code path -- not given
--      a distinct vocabulary value. -> 'manual'.
--
--   No other live write path exists. HintSetWizard.jsx also assigns a field
--   literally named "primary_value" but it targets a DIFFERENT table
--   (hint_sets/trails, via saveHintSet()/saveTrail()) -- not gallery_images,
--   verified by reading its handleSave(). image_artifact_route_to_intake()
--   references primary_value only conceptually in a comment; it writes
--   research_objects.value (left NULL), never gallery_images.primary_value.
--
-- VOCABULARY (intentionally minimal -- 2 values, not a truth/verification
-- status):
--   'manual'               — a person (admin) decided this is the image's
--                             primary value. Does NOT imply canonical=true
--                             or engine_verified=true.
--   'auto_single_candidate'— feed_image_to_search auto-set it because
--                             exactly one OCR-derived candidate existed
--                             (no competing candidate to choose between).
--                             Does NOT imply the value is correct.
--   NULL                   — provenance unknown. This is the default for
--                             every existing non-null primary_value today
--                             (1,871 rows) and stays NULL: NO backfill by
--                             inference from curation_status, all_values,
--                             occurred_at, or array position. If genuine
--                             provenance cannot be proven, it stays NULL.
-- ============================================================================

alter table public.gallery_images
  add column if not exists primary_value_source text
  check (primary_value_source is null or primary_value_source in ('manual', 'auto_single_candidate'));

comment on column public.gallery_images.primary_value_source is
  'Provenance (not truth status) of primary_value: manual = admin decided it (ImageEditModal or approve_community_hint) | auto_single_candidate = feed_image_to_search auto-set it, single unambiguous OCR candidate | NULL = unknown/historical, never backfilled by inference.';

-- feed_image_to_search: stamp provenance only on the transition NULL -> non-null
-- caused by THIS call. An already-non-null primary_value (any prior source,
-- including a pre-existing primary_value_source) is left completely untouched,
-- exactly like the existing COALESCE behavior for primary_value itself.
create or replace function public.feed_image_to_search(p_id uuid, p_overwrite boolean default false)
 returns integer[]
 language plpgsql
as $function$
declare meaningful int[];
begin
  select array_agg(distinct n order by n) into meaningful
  from gallery_images gi, lateral unnest(gi.ocr_numbers) n
  where gi.id = p_id
    and n between 2 and 9999 and not (n between 1990 and 2099)
    and exists (select 1 from gematria_words gw where gw.ragil = n or gw.all_values @> array[n]::bigint[]);
  update gallery_images gi
  set all_values = case
        when p_overwrite or gi.all_values is null or array_length(gi.all_values,1)=0
          then coalesce(meaningful,'{}')
        else (select array_agg(distinct x) from unnest(gi.all_values || coalesce(meaningful,'{}')) x)
      end,
      -- Root fix 2026-08-26 (see 20260826170000_image_primary_value_root_fix.sql for full history):
      -- auto-set only when there is exactly one unambiguous candidate; never a heuristic guess.
      primary_value = coalesce(gi.primary_value,
        case when array_length(meaningful,1) = 1 then meaningful[1] else null end),
      -- Provenance stamp (this migration): fires iff this call is what just set primary_value.
      primary_value_source = case
        when gi.primary_value is null and array_length(meaningful,1) = 1
          then 'auto_single_candidate'
        else gi.primary_value_source
      end
  where gi.id = p_id;
  return meaningful;
end $function$;

-- approve_community_hint: admin-confirmed value at approval time -> 'manual'.
-- Body otherwise byte-identical to the live function; only the INSERT's
-- column/value list changes (adds primary_value_source).
create or replace function public.approve_community_hint(p_id uuid, p_number integer default null, p_name text default null, p_occurred date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_h public.community_hints; v_gal uuid; v_wpgal int; v_wpimg int; v_img uuid; v_num int; v_occ date;
begin
  if not exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin') then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;
  select * into v_h from public.community_hints where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_h.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'not_pending'); end if;
  if coalesce(v_h.image_url,'') = '' then return jsonb_build_object('ok', false, 'error', 'no_image'); end if;

  -- גלריית-קהילה (get-or-create)
  select id, wp_gallery_id into v_gal, v_wpgal from public.galleries where gallery_type = 'community' limit 1;
  if v_gal is null then
    v_wpgal := greatest(coalesce((select max(wp_gallery_id) from public.galleries), 10001), 10001) + 1;
    insert into public.galleries (wp_gallery_id, name, gallery_type, space)
      values (v_wpgal, 'דיווחי קהילה', 'community', 'core') returning id into v_gal;
  end if;

  v_wpimg := greatest(coalesce((select max(wp_image_id) from public.gallery_images), 10001011), 10001011) + 1;
  v_num := coalesce(p_number, v_h.number);
  v_occ := coalesce(p_occurred, v_h.occurred_at);

  insert into public.gallery_images
    (wp_image_id, gallery_id, wp_gallery_id, space, source, name, description, image_url,
     primary_value, primary_value_source, all_values, occurred_at, curation_status, importance)
  values
    (v_wpimg, v_gal, v_wpgal, 'core', 'community',
     coalesce(nullif(p_name,''), v_h.reporter_name, 'רמז מהקהילה'),
     v_h.description, v_h.image_url,
     v_num, case when v_num is not null then 'manual' else null end,
     v_h.all_numbers, v_occ, 'approved', 1)
  returning id into v_img;

  update public.community_hints
    set status='approved', gallery_image_id=v_img, number=v_num,
        reviewed_at=now(), reviewed_by=auth.uid()
    where id = p_id;

  return jsonb_build_object('ok', true, 'gallery_image_id', v_img, 'wp_image_id', v_wpimg, 'primary_value', v_num);
end $function$;
