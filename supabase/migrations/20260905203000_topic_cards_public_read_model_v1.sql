-- ============================================================================
-- TOPIC_CARDS_PUBLIC_READ_MODEL_PRIVACY_FIX_V1 — PHASE A (safe to apply live)
-- work_log: dispatch bf236317-72eb-4faf-bd16-053c856f5e6b · audit c74d3ccd · ACK 6fdb6744
--
-- Problem (verified live 5.9.2026): topic_cards RLS filters ROWS, not JSON keys. anon and every
-- ordinary authenticated user could read internal underscore-prefixed findings keys
-- (_internal_provenance with an account email, _note, _do_not_publish, _research_draft) on
-- approved rows, and authenticated had a qual=true read-all policy over draft/rejected/merged
-- rows. anon/authenticated also held TRUNCATE/TRIGGER/REFERENCES on the table — privileges RLS
-- does not govern.
--
-- Fix: ONE canonical public read model (view) that filters rows AND strips internal keys
-- server-side; an explicit admin path for full canonical rows; least privilege on the raw table.
-- No new truth table/store. Canonical provenance is not deleted anywhere.
--
-- PHASE A (this file) is purely additive + hazard removal: existing public select('*') readers
-- keep working unchanged. The column-scoped SELECT re-grant that finally closes raw findings
-- access is PHASE B (20260905203500_*_phase_b_release_gate.sql) and MUST ship together with the
-- app build that reads public.topic_cards_public.
-- ============================================================================

-- 1) Strip internal (underscore-prefixed) keys. Recursive and shape-defensive: object keys at any
--    depth and inside array elements. Arrays/scalars pass through. STRICT: null -> null.
create or replace function public.topic_cards_public_findings(f jsonb)
returns jsonb
language plpgsql
immutable strict parallel safe
set search_path = public
as $$
begin
  if jsonb_typeof(f) = 'object' then
    return coalesce(
      (select jsonb_object_agg(e.k, public.topic_cards_public_findings(e.v))
         from jsonb_each(f) as e(k, v)
        where e.k not like '\_%'),
      '{}'::jsonb);
  elsif jsonb_typeof(f) = 'array' then
    return coalesce(
      (select jsonb_agg(public.topic_cards_public_findings(x.e) order by x.ord)
         from jsonb_array_elements(f) with ordinality as x(e, ord)),
      '[]'::jsonb);
  else
    return f;
  end if;
end
$$;
comment on function public.topic_cards_public_findings(jsonb) is
  'Public projection of topic_cards.findings: removes underscore-prefixed (internal) keys recursively. Never rendered raw; read by the topic_cards_public view.';
revoke all on function public.topic_cards_public_findings(jsonb) from public;
grant execute on function public.topic_cards_public_findings(jsonb) to anon, authenticated;

-- 2) THE public read model. Owner-executed (security_invoker OFF, same pattern as work_log_current)
--    so it does not depend on caller privileges on the raw table; security_barrier so predicates
--    cannot be pushed past the row filter. Rows: approved AND not marked _do_not_publish by the
--    source. Keys: internal keys stripped. Column list mirrors the table (findings replaced).
create or replace view public.topic_cards_public
with (security_barrier = true)
as
select t.id,
       t.slug,
       t.title,
       t.subtitle,
       t.search_terms,
       t.image_ids,
       t.numbers,
       t.highlight_numbers,
       public.topic_cards_public_findings(t.findings) as findings,
       t.status,
       t.quality,
       t.created_by,
       t.created_at,
       t.approved_at,
       t.node_id,
       t.occurred_at,
       t.meter_score
  from public.topic_cards t
 where t.status = 'approved'
   and coalesce(t.findings -> '_do_not_publish', 'false'::jsonb) is distinct from 'true'::jsonb;
alter view public.topic_cards_public owner to postgres;
comment on view public.topic_cards_public is
  'Canonical PUBLIC read model over topic_cards (rows: approved & not _do_not_publish; findings: internal keys stripped). All public/anon/ordinary-user readers use this. Admin raw access: admin_topic_cards_full() or the admin RLS policy on topic_cards.';
revoke all on public.topic_cards_public from public;
grant select on public.topic_cards_public to anon, authenticated;

-- 3) Explicit privileged path: full canonical rows (all statuses, raw findings) for admins only.
create or replace function public.admin_topic_cards_full(
  p_ids uuid[] default null,
  p_slug text default null,
  p_status text default null
)
returns setof public.topic_cards
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
    select t.*
      from public.topic_cards t
     where (p_ids is null or t.id = any (p_ids))
       and (p_slug is null or t.slug = p_slug)
       and (p_status is null or t.status = p_status)
     order by t.quality desc nulls last, t.created_at desc;
end
$$;
comment on function public.admin_topic_cards_full(uuid[], text, text) is
  'Admin-only (users.role=admin) full canonical topic_cards rows incl. raw findings and non-approved statuses. Explicit privileged read path; anon cannot execute.';
revoke all on function public.admin_topic_cards_full(uuid[], text, text) from public, anon;
grant execute on function public.admin_topic_cards_full(uuid[], text, text) to authenticated;

-- 4) Least privilege on the raw table.
--    - ordinary signed-in users no longer read draft/rejected/merged rows (admins keep everything via
--      the existing FOR ALL admin policy topic_cards_admin_write);
--    - TRUNCATE / TRIGGER / REFERENCES are not RLS-governed and were never needed by clients.
drop policy if exists topic_cards_auth_read_all on public.topic_cards;
revoke truncate, trigger, references on public.topic_cards from anon, authenticated;

-- 5) Human-Gate reconciliation (ZURIEL, 5.9.2026, work_log bf236317): 1010-מפגש-הצירים remains
--    PUBLIC/VISIBLE. The stale _do_not_publish marker is superseded through the existing content
--    model — additively: the marker flips to false, the decision is recorded under _governance
--    (internal key, never public), and every historical marker value is preserved there and in
--    place (_note / _provenance_flag untouched). No other row is changed.
update public.topic_cards
   set findings = (findings - '_do_not_publish')
                  || jsonb_build_object(
                       '_do_not_publish', false,
                       '_governance', jsonb_build_object(
                         'publish_decision', 'PUBLIC',
                         'decided_by', 'ZURIEL',
                         'decided_at', '2026-09-05',
                         'work_log', 'bf236317-72eb-4faf-bd16-053c856f5e6b',
                         'note', 'Human-Gate: convergence stays public/visible; earlier _do_not_publish marker superseded (kept here as provenance).',
                         'superseded_markers', jsonb_build_object(
                           '_do_not_publish', findings -> '_do_not_publish',
                           '_note', findings -> '_note',
                           '_provenance_flag', findings -> '_provenance_flag')))
 where slug = '1010-מפגש-הצירים'
   and jsonb_typeof(findings) = 'object'
   and findings -> '_do_not_publish' = 'true'::jsonb;
