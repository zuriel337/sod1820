-- Canonical Share Reader Closure (Human-Gate decision, ZURIEL).
-- ────────────────────────────────────────────────────────────────────────────
-- ONE reusable canonical share predicate, reused by every TRUE share-count reader:
--     a share event = (event_type = 'share'  OR  section = 'share')
-- Live union at authoring time = 334 = 291 canonical(section-share + event-share)
--   + 39 legacy channel rows (section='share', event_type=whatsapp|copy|native|facebook|image)
--   + 4 valid Dim5 share rows (event_type='share', section<>'share').
--
-- Rules honored:
--  • No history rewrite / no backfill — the predicate is a UNION, data is untouched.
--  • The 4 Dim5 rows stay valid shares; legacy channel rows stay valid historical shares.
--  • community_share_count keeps 7326 as a SEPARATE legacy baseline (provenance UNKNOWN —
--    see note); only the *tracked* count is re-sourced from the canonical predicate.
--  • viral_report keeps its business semantics; only its "share membership" is re-sourced.
--  • audience_dim5_vs_orgeula / audience_overlap_report are NOT share-total readers — untouched.
--
-- ⚠️ HELD — do NOT apply without ZURIEL authorization (branch/PR review first).

-- ── The one canonical path: a view every share-count reader sources from ──────
create or replace view public.share_events as
  select * from public.visitor_events
  where event_type = 'share' or section = 'share';

comment on view public.share_events is
  'Canonical share-event membership (event_type=''share'' OR section=''share''). Single source for all true share-count readers. Union, not rewrite: legacy channel rows and out-of-section Dim5 share rows are included as-is.';

-- ── community_share_count — baseline 7326 KEPT AS-IS (legacy_baseline_provenance_unknown),
--    tracked count re-sourced from the canonical predicate. 7326 + 334 = 7660 at authoring time.
create or replace function public.community_share_count()
 returns bigint
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  -- 7326 = legacy historical baseline, provenance UNKNOWN — NOT recalibrated, NOT deleted,
  -- kept as a separate additive constant pending provenance confirmation. The tracked share
  -- count below is the canonical predicate (event_type='share' OR section='share').
  select 7326 + (select count(*) from public.share_events);
$function$;

-- ── viral_report — same business semantics; "share" membership now from share_events ─────
create or replace function public.viral_report()
 returns jsonb
 language sql
 security definer
 set search_path to 'public'
as $function$
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'shares',   (select count(*) from share_events),
      'arrivals', (select count(*) from visitor_events where event_type='arrival'),
      -- "דור 2": אנשים שהגיעו דרך שיתוף ואז שיתפו בעצמם
      'rebroadcasters', (
        select count(*) from (
          select visitor_id from visitor_events where event_type='arrival'
          intersect
          select visitor_id from share_events
        ) x)
    ),
    'posts', (
      select coalesce(jsonb_agg(row_to_json(t)),'[]'::jsonb) from (
        select s.slug,
               s.shares,
               coalesce(a.arrivals,0) as arrivals,
               round(coalesce(a.arrivals,0)::numeric / nullif(s.shares,0), 2) as ratio
        from (select slug, count(*) shares from share_events
              where slug is not null and slug<>'' group by slug) s
        left join (select meta->>'landing' landing, count(*) arrivals from visitor_events
              where event_type='arrival' group by 1) a on a.landing = s.slug
        order by s.shares desc, arrivals desc
        limit 30
      ) t
    ),
    'ambassadors', (
      select coalesce(jsonb_agg(row_to_json(t2)),'[]'::jsonb) from (
        select left(meta->>'rid',8) as rid, count(*) as brought
        from visitor_events where event_type='arrival' and meta->>'rid' is not null
        group by meta->>'rid' order by brought desc limit 15
      ) t2
    )
  );
$function$;

-- ── admin_journey_shares — dual-purpose (journey shares + deep_unlocks), so it uses the
--    canonical PREDICATE inline (not the share_events view, which excludes deep_unlock rows).
--    Share branch aligned to (event_type='share' OR section='share'); result-equivalent for
--    journey (journey shares are always in-section), but consistent with the one predicate.
create or replace function public.admin_journey_shares(p_hours integer default 336)
 returns json language plpgsql stable security definer set search_path to 'public'
as $function$
declare result json;
begin
  if not exists (select 1 from users where id = auth.uid() and role = 'admin') then
    raise exception 'admin only';
  end if;
  with ev as (
    select visitor_id, created_at,
      case when section = 'journey' and event_type = 'deep_unlock' then 'deep' else 'share' end as kind,
      nullif(regexp_replace(coalesce(slug,''), '^journey/', ''), '') as number,
      coalesce(meta->>'platform', meta->>'source', '') as platform
    from visitor_events
    where created_at > now() - (p_hours || ' hours')::interval
      and (
        ((event_type = 'share' or section = 'share') and slug like 'journey/%')  -- canonical predicate
        or (section = 'journey' and event_type = 'deep_unlock')
      )
  )
  select json_build_object(
    'total_shares', (select count(*) from ev where kind = 'share'),
    'total_deep',   (select count(*) from ev where kind = 'deep'),
    'unique_sharers', (select count(distinct visitor_id) from ev),
    'recent', coalesce((
      select json_agg(to_jsonb(t)) from (
        select left(visitor_id, 8) as visitor, kind, number, platform, created_at as ts
        from ev order by created_at desc limit 50
      ) t
    ), '[]'::json)
  ) into result;
  return result;
end;
$function$;
