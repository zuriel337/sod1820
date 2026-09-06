-- PRODUCT_TRAFFIC_FORWARD_ATTRIBUTION_CLOSURE_V1
-- Human-Gate ZURIEL 2026-09-07.
-- Forward-safe semantic correction: share_story is a Share-family event, while its subtype
-- remains visible in event_type. No history rewrite; the canonical reader simply includes it.

create or replace view public.share_events as
  select id, visitor_id, section, slug, event_type, meta, created_at
  from public.visitor_events
  where event_type = 'share'
     or section = 'share'
     or event_type = 'share_story';

comment on view public.share_events is
  'Canonical Share-family reader. Includes event_type=share, section=share legacy/current rows, and share_story as an explicit subtype. History is preserved; readers must not collapse subtype into generic share when subtype matters.';
