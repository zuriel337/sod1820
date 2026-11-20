-- #1462 privacy floor: READ-ONLY PRE-APPLY canary (owner gate 20.11.2026). Runs against the live database
-- BEFORE any stage is applied; canary.sql is its post-apply twin (it needs the helper, which does not exist yet).
--   psql "$DB" -X -v ON_ERROR_STOP=1 -f canary-preapply.sql
-- Pure read: read-only transaction, one SELECT, ends with ROLLBACK. Prints counts only, never a phrase.
-- The eligibility rule is written out inline and equals extensions.sql gematria_public_word_eligible after the
-- owner-gate fix (verified + published + not encrypted + tier>=0 + not blocklisted; no private-wall clause).
-- For every probe of a corpus reader it reports, for the CURRENT live function as a guest would call it:
--   public_kept     distinct returned strings that are public corpus phrases (must stay after apply)
--   hidden_removed  distinct returned strings that exist in the corpus with no public row (closed by apply)
--   anon_execute    whether a guest can call the reader at all today (apply keeps every grant)
-- SECURITY DEFINER readers run as their owner, so calling them here returns what a guest receives; the only
-- caller-dependent branch the patch adds is rd_is_admin(), false for this session.
\set ON_ERROR_STOP on
begin;
set transaction read only;
with elig as (
  select phrase, bool_or(is_verified is true and is_published is true and coalesce(is_encrypted,false)=false
    and coalesce(visibility_tier,0)>=0
    and not exists(select 1 from gematria_blocklist b where position(b.pattern in g.phrase)>0)) ok
  from gematria_words g group by phrase),
probes(k, sig, j) as (values
 ('fn_name_multi(איפה)', 'fn_name_multi(text,text,text,text,jsonb)', public.fn_name_multi('איפה',null,null,null,'{"skip_els":"1"}'::jsonb)),
 ('fn_en_search(איפה)', 'fn_en_search(text,integer)', (select jsonb_agg(to_jsonb(t)) from public.fn_en_search('איפה',200) t)),
 ('strongest_crossings(איפה)', 'strongest_crossings(text,integer,integer)', (select jsonb_agg(to_jsonb(t)) from public.strongest_crossings('איפה',1,500) t)),
 ('fn_split_gematria(איפה)', 'fn_split_gematria(text[])', public.fn_split_gematria(array['איפה'])),
 ('fn_anagrams_engine(שלום)', 'fn_anagrams_engine(text[])', public.fn_anagrams_engine(array['שלום'])),
 ('fn_miluy_engine(שבר)', 'fn_miluy_engine(text[])', public.fn_miluy_engine(array['שבר'])),
 ('fn_hebrew_root(שתה)', 'fn_hebrew_root(text)', public.fn_hebrew_root('שתה')),
 ('number_dossier_json(826)', 'number_dossier_json(integer)', public.number_dossier_json(826)),
 ('number_dossier_json(1820)', 'number_dossier_json(integer)', public.number_dossier_json(1820)),
 ('fn_cross_research(געש)', 'fn_cross_research(text[])', public.fn_cross_research(array['געש','געש'])),
 ('verified_bridges(1000)', 'verified_bridges(integer)', (select jsonb_agg(to_jsonb(t)) from public.verified_bridges(1000) t)),
 ('atlas_findings(1000)', 'atlas_findings(text,integer)', (select jsonb_agg(to_jsonb(t)) from public.atlas_findings(null,1000) t)),
 ('discover_relation_candidates(1000)', 'discover_relation_candidates(text,integer)', (select jsonb_agg(to_jsonb(t)) from public.discover_relation_candidates(null,1000) t)),
 ('discover_anchor_families(1,1000)', 'discover_anchor_families(integer,integer)', (select jsonb_agg(to_jsonb(t)) from public.discover_anchor_families(1,1000) t)),
 ('top_collective(1,1000)', 'top_collective(integer,integer)', (select jsonb_agg(to_jsonb(t)) from public.top_collective(1,1000) t)),
 ('fn_all_methods(שלום)', 'fn_all_methods(text)', public.fn_all_methods('שלום'))),
s as (select k, x#>>'{}' str from probes, jsonb_path_query(coalesce(j,'null'::jsonb),'strict $.**') x where jsonb_typeof(x)='string')
select p.k as probe, has_function_privilege('anon', p.sig::regprocedure, 'execute') as anon_execute,
       count(distinct s.str) filter (where e.ok) as public_kept,
       count(distinct s.str) filter (where e.ok is false) as hidden_removed
from probes p left join s on s.k=p.k left join elig e on e.phrase=s.str
group by p.k, p.sig order by p.k;
rollback;
