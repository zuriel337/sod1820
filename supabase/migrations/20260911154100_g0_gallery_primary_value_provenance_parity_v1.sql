-- G0 2029 OBJECT-STATE PARITY
-- Restore current live gallery primary-value provenance state into git.
-- This is a current-main reconciliation of the old PR201/202 lineage, NOT a raw merge.
-- Live canonical state verified on linswmnnkjxvweumprav before authoring:
--   gallery_images.primary_value_source exists;
--   allowed values = manual | auto_single_candidate | NULL;
--   feed_image_to_search stamps auto_single_candidate only when exactly one candidate exists;
--   approve_community_hint stamps manual for admin-confirmed values.
-- Historical rows with unknown provenance remain NULL. No backfill by inference.

alter table public.gallery_images
  add column if not exists primary_value_source text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.gallery_images'::regclass
      and conname='gallery_images_primary_value_source_check'
  ) then
    alter table public.gallery_images
      add constraint gallery_images_primary_value_source_check
      check (primary_value_source is null or primary_value_source in ('manual','auto_single_candidate'));
  end if;
end $$;

comment on column public.gallery_images.primary_value_source is
  'Provenance (not truth status) of primary_value: manual = admin decided it (ImageEditModal or approve_community_hint) | auto_single_candidate = feed_image_to_search auto-set it, single unambiguous OCR candidate | NULL = unknown/historical, never backfilled by inference.';

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
    and exists (
      select 1 from gematria_words gw
      where gw.ragil = n or gw.all_values @> array[n]::bigint[]
    );

  update gallery_images gi
  set all_values = case
        when p_overwrite or gi.all_values is null or array_length(gi.all_values,1)=0
          then coalesce(meaningful,'{}')
        else (
          select array_agg(distinct x)
          from unnest(gi.all_values || coalesce(meaningful,'{}')) x
        )
      end,
      primary_value = coalesce(
        gi.primary_value,
        case when array_length(meaningful,1) = 1 then meaningful[1] else null end
      ),
      primary_value_source = case
        when gi.primary_value is null and array_length(meaningful,1) = 1
          then 'auto_single_candidate'
        else gi.primary_value_source
      end
  where gi.id = p_id;

  return meaningful;
end
$function$;

create or replace function public.approve_community_hint(
  p_id uuid,
  p_number integer default null,
  p_name text default null,
  p_occurred date default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_h public.community_hints;
  v_gal uuid;
  v_wpgal int;
  v_wpimg int;
  v_img uuid;
  v_num int;
  v_occ date;
begin
  if not exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  select * into v_h from public.community_hints where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_h.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'not_pending'); end if;
  if coalesce(v_h.image_url,'') = '' then return jsonb_build_object('ok', false, 'error', 'no_image'); end if;

  select id, wp_gallery_id into v_gal, v_wpgal
  from public.galleries
  where gallery_type = 'community'
  limit 1;

  if v_gal is null then
    v_wpgal := greatest(coalesce((select max(wp_gallery_id) from public.galleries), 10001), 10001) + 1;
    insert into public.galleries (wp_gallery_id, name, gallery_type, space)
      values (v_wpgal, 'דיווחי קהילה', 'community', 'core')
      returning id into v_gal;
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

  return jsonb_build_object(
    'ok', true,
    'gallery_image_id', v_img,
    'wp_image_id', v_wpimg,
    'primary_value', v_num
  );
end
$function$;
