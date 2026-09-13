-- G2 Gate1 DRIFT containment: legacy wizard + relation_evidence write quiesce.
-- Preserve payload/functions; stop old authority regeneration.

revoke execute on function public.wizard_build_convergence(jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.set_relation_evidence(text,text,text,integer,text,text,text,text) from public, anon, authenticated, service_role;

revoke insert, update, delete, truncate on table public.relation_evidence from service_role;
grant select on table public.relation_evidence to service_role;

comment on function public.wizard_build_convergence(jsonb) is
'LEGACY QUIESCED in G2 2026-09-13. Historical mega-writer preserved for owner-level replay/audit only; not a 2029 authority/runtime. Do not re-enable without Human Gate.';
comment on function public.set_relation_evidence(text,text,text,integer,text,text,text,text) is
'LEGACY QUIESCED in G2 2026-09-13. relation_evidence historical payload is read-only to runtime; future governed relation findings use Research OS/research_objects. Owner-level replay remains possible.';
comment on table public.relation_evidence is
'Historical relation-evidence payload retained. G2 runtime writes quiesced; SELECT remains for legacy readers/replay. Do not treat this table as a new 2029 Evidence store.';
