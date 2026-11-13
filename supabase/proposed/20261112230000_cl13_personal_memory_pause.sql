-- CL13_PERSONAL_MEMORY_PAUSE - PROPOSAL, NOT APPLIED. Runs only with ZURIEL's explicit approval for this exact file (CLAUDE.md 0.4).
-- Rollback: supabase/proposed/ROLLBACK_20261112230000_cl13_personal_memory_pause.sql
-- Test (throwaway local PostgreSQL only): bash scripts/run-cl13-personal-memory-sql-test.sh
-- Spec: the contracts handoff 53bb72e13, alignment README section 14 (decisions D-CL13-1..3, matrix R1-R10, tests M-1..M-15);
--       docs/reviews/cl13-personal-memory-20261112/README.md (what is implemented, what is not, and the open decisions).
--
-- WHAT IT DOES (decisions of ZURIEL, 12.11.2026; nothing here deletes or changes an existing row):
--   1. ONE owner of the decision: public.fn_personal_memory_policy_v1(user_ref). v1 = the pause: no new personal memory between
--      conversations, and an old one is read only with a verified consent of the same person; no consent record exists yet.
--   2. WRITERS return a real status and write nothing: fn_raziel_remember (W1) and fn_raziel_fact (W2) return NULL = not saved;
--      fn_raziel_upsert_summary (W3, returns void) raises; fn_mem_add returns NULL for personal rows (W4a) and for an unknown
--      memory type (it is no longer stored as 'research_note'), and keeps writing the research output of the research bots (W4b).
--   3. THE TABLE refuses every other writer: a BEFORE INSERT OR UPDATE trigger on public.agent_user_memory RAISES for a personal
--      row (a direct write with the service key, the site thread of number-researcher and raziel-attention (W5), any future
--      writer). It raises, so a caller that checks the result reports "not saved" and never a silent "saved". DELETE is not touched.
--   4. THE READER public.fn_raziel_context returns an empty personal context unless the policy allows this person, and never in a
--      group; research output is not personal context; the account<->phone identity bridge is removed (no implied merge).
--      The shape of the returned object is unchanged, with privacy.personal_memory_allowed = false and a reason.
--   5. CONTROL: export and erasure of memory WITHOUT deleting the account: export_my_personal_memory(), erase_my_personal_memory()
--      for an account holder; fn_personal_memory_export(sender), fn_personal_memory_erase(sender) (server only) for a WhatsApp
--      sender without an account.
-- RESEARCH (decision of ZURIEL after the Codex review of abb2f3907): authorised research may be USED during the pause. The
-- research output of the two research bots is still written, and they read it back as research context through ONE reader,
-- public.fn_research_output_context_v1. Personal information inside research stays subject to the person's consent.
-- "Research" is not a way around the pause (round 8, Codex): a row is research output only when it is a research type of a research
-- bot AND it is POSITIVELY attested by a trusted source or an approval (public.fn_personal_memory_research_route_v1: an approval of
-- an existing row, a closed list of curated import sources, or a quotation from the canonical Tanakh text) AND its text carries no
-- personal detail (public.fn_personal_memory_personal_detail_v1: a veto, a pattern check with stated limits - the absence of a
-- match is NEVER the proof). A research-typed row that nothing attests is personal memory: refused while paused, withheld from the
-- research context without consent. The policy key research_output_write is enforced by the writer function and by the trigger
-- (a direct write included). The same type for any other agent is personal memory, and an UPDATE cannot turn a personal row into
-- research output. Needs public.tanach_verses (checked below).
-- NOT IN THIS FILE (stated, not hidden): a consent record store and the consent wording (a new store needs its own approval);
-- a retention period; the WhatsApp commands that call the export and erasure functions; the readers that read the table
-- directly with the service key (number-researcher, raziel-attention, wa-hatishbi, wa-uriel: changed in the Edge code of this
-- branch, deployed separately); admin_person_facts (an administrator still reads stored profile facts: an open decision).
-- ORDER (required; the same as docs/reviews/cl13-personal-memory-20261112/apply-plan.json): the Edge functions of this branch
-- are deployed FIRST, this file AFTER them. The Edge code asks the policy function and is closed while it is missing, so it is
-- safe before this file. This file BEFORE the Edge code is NOT acceptable: the deployed number-researcher and raziel-attention
-- read the stored thread directly and prefer it to the new turns, and the deployed raziel-attention reports persisted=true
-- although nothing was saved (tested: test/cl13-intermediate-states.test.mjs).
--
-- Full-match guards, FAIL-CLOSED: the state is read into one non-null text ('(missing)' for an absent function or trigger, the
-- enabled flag next to the trigger text) and the file continues ONLY when the state is exactly BEFORE (the five live bodies read
-- on 12.11.2026, nothing else present, no trigger on the table) or exactly AFTER (already applied; re-created, a no-op).
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temp table cl13_before on commit drop as
  select p.proname, p.proowner, p.proacl::text as acl, p.prosecdef, p.proconfig, p.provolatile
    from pg_proc p where p.oid in (to_regprocedure('public.fn_raziel_remember(text,text,text,text,text,text,text)'), to_regprocedure('public.fn_raziel_fact(text,text,text,text,jsonb,text,smallint)'), to_regprocedure('public.fn_raziel_upsert_summary(text,text,text,text)'), to_regprocedure('public.fn_mem_add(text,text,text,text,text,text,text,text,smallint,text,jsonb)'), to_regprocedure('public.fn_raziel_context(text,text)'));

do $$
declare v_state text;
  c_before constant text := 'fn_personal_memory_policy_v1=(missing) | fn_personal_memory_is_research_output_v1=(missing) | fn_personal_memory_personal_detail_v1=(missing) | fn_personal_memory_research_sources_v1=(missing) | fn_research_subject_in_corpus_v1=(missing) | fn_personal_memory_research_route_v1=(missing) | fn_personal_memory_row_is_research_v1=(missing) | fn_personal_memory_write_guard_v1=(missing) | fn_raziel_remember=5598acf902200444827efe54305466e1 | fn_raziel_fact=ebd32bd78f3d6e6af11132c9533a2834 | fn_raziel_upsert_summary=85f60b9a552c5c03d01955dec113156a | fn_mem_add=6a26f9e5d1a05fd6c3fc25b8179951b7 | fn_raziel_context=56ffd0cfc5e29945e56044439a01f81e | fn_research_output_context_v1=(missing) | fn_personal_memory_refs_v1=(missing) | fn_personal_memory_sender_refs_v1=(missing) | export_my_personal_memory=(missing) | erase_my_personal_memory=(missing) | fn_personal_memory_export=(missing) | fn_personal_memory_erase=(missing) | trigger=(missing) | other_triggers=0';
  c_after constant text := 'fn_personal_memory_policy_v1=fa42749d421fc712c167ce2ca60c8914 | fn_personal_memory_is_research_output_v1=07be6e8f5bd24db2a2fa79862a6c4d30 | fn_personal_memory_personal_detail_v1=a3c1f48534dc440c7ea0f8ef41a0f041 | fn_personal_memory_research_sources_v1=8b34899e3cb7dd34635a636db9352d8b | fn_research_subject_in_corpus_v1=f79a0b28c8268bb3762e5a09dc36c4f8 | fn_personal_memory_research_route_v1=46845aa2202fbbba0b57ceee3a949e6b | fn_personal_memory_row_is_research_v1=59d9fb0ef90d06da23a365190724039d | fn_personal_memory_write_guard_v1=649a127b4bcd4fea141d9098b2aefac7 | fn_raziel_remember=5376c5c1d3253578db401be5ad67f4f1 | fn_raziel_fact=468a7a6980890b5db87fdd62870aa5c2 | fn_raziel_upsert_summary=0179dfe9830d631e782001dad63ef15e | fn_mem_add=31c7ab067f7618981eb31a733a58f06d | fn_raziel_context=d5b9822de0dfa340245bad611699e966 | fn_research_output_context_v1=d19a81c3af57518de79f61ee24146dcd | fn_personal_memory_refs_v1=8ef502be78cdd85ee3300eb6e484a28e | fn_personal_memory_sender_refs_v1=e61a31defa02ff6e716c413c9d54e21a | export_my_personal_memory=eacf47163e0c84843a91ae5163ef8d01 | erase_my_personal_memory=4afdb9441d0c9d5f6c9e22add62d26d1 | fn_personal_memory_export=23086bb93bb7169835bf1b2bd4cc3811 | fn_personal_memory_erase=06064b06a01f5559a1ae0009ad824be1 | trigger=CREATE TRIGGER trg_personal_memory_pause_v1 BEFORE INSERT OR UPDATE ON public.agent_user_memory FOR EACH ROW EXECUTE FUNCTION fn_personal_memory_write_guard_v1() [enabled=O] | other_triggers=0';
begin
  if to_regclass('public.agent_user_memory') is null then raise exception 'CL13 precondition: public.agent_user_memory not found; stop, nothing changed'; end if;
  if to_regclass('public.tanach_verses') is null then raise exception 'CL13 precondition: public.tanach_verses (the canonical text that attests a quotation) not found; stop, nothing changed'; end if;
  v_state := 'fn_personal_memory_policy_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_policy_v1(text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_is_research_output_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_is_research_output_v1(text,text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_personal_detail_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_personal_detail_v1(text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_research_sources_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_research_sources_v1()')), '(missing)')
    || ' | ' || 'fn_research_subject_in_corpus_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_research_subject_in_corpus_v1(text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_research_route_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_research_route_v1(text,text,text,text,text,jsonb,boolean)')), '(missing)')
    || ' | ' || 'fn_personal_memory_row_is_research_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_row_is_research_v1(text,text,text,text,text,text,jsonb,boolean)')), '(missing)')
    || ' | ' || 'fn_personal_memory_write_guard_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_write_guard_v1()')), '(missing)')
    || ' | ' || 'fn_raziel_remember=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_raziel_remember(text,text,text,text,text,text,text)')), '(missing)')
    || ' | ' || 'fn_raziel_fact=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_raziel_fact(text,text,text,text,jsonb,text,smallint)')), '(missing)')
    || ' | ' || 'fn_raziel_upsert_summary=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_raziel_upsert_summary(text,text,text,text)')), '(missing)')
    || ' | ' || 'fn_mem_add=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_mem_add(text,text,text,text,text,text,text,text,smallint,text,jsonb)')), '(missing)')
    || ' | ' || 'fn_raziel_context=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_raziel_context(text,text)')), '(missing)')
    || ' | ' || 'fn_research_output_context_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_research_output_context_v1(text,text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_refs_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_refs_v1(uuid)')), '(missing)')
    || ' | ' || 'fn_personal_memory_sender_refs_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_sender_refs_v1(text)')), '(missing)')
    || ' | ' || 'export_my_personal_memory=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.export_my_personal_memory()')), '(missing)')
    || ' | ' || 'erase_my_personal_memory=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.erase_my_personal_memory(boolean)')), '(missing)')
    || ' | ' || 'fn_personal_memory_export=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_export(text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_erase=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_erase(text,boolean)')), '(missing)')
    || ' | trigger=' || coalesce((select pg_get_triggerdef(t.oid) || ' [enabled=' || t.tgenabled::text || ']' from pg_trigger t
         where t.tgrelid = 'public.agent_user_memory'::regclass and t.tgname = 'trg_personal_memory_pause_v1' and not t.tgisinternal), '(missing)')
    || ' | other_triggers=' || (select count(*) from pg_trigger t where t.tgrelid = 'public.agent_user_memory'::regclass and not t.tgisinternal and t.tgname <> 'trg_personal_memory_pause_v1');
  if v_state = c_after then
    raise notice 'CL13: already applied; re-creating the same objects (no-op)';
  elsif v_state = c_before then
    null; -- exactly the live 12.11.2026 state: continue
  else
    raise exception 'CL13 drift: the state is neither the live state read on 12.11.2026 nor the applied state; stop, nothing changed. State: %', v_state;
  end if;
end $$;

CREATE OR REPLACE FUNCTION public.fn_personal_memory_policy_v1(p_user_ref text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  -- CL-13, the ONE owner of the decision "may personal memory be written or read for this person now".
  -- v1 = the pause decided by ZURIEL on 12.11.2026 (D-CL13-1): no new personal memory between conversations, and an old one is
  -- read only with a verified consent of the same person. No consent record exists yet, so nobody is readable. p_user_ref is the
  -- seam for the consent lookup of a later version; it changes nothing here.
  -- write_profile_facts is a SEPARATE key (D-CL13-3): a consent to memory does not open profile facts; they need a linked account
  -- and an explicit approval of the fact, and a later version must grant them explicitly.
  -- RESEARCH (decision of ZURIEL after the Codex review of abb2f3907): authorised research may be USED during the pause - the
  -- research output of the research bots is still written and may be read back as research context. Personal information inside
  -- research stays subject to consent: a research row that carries a personal detail is personal memory (it follows
  -- write_personal / read_personal), so the label "research" opens nothing personal.
  select jsonb_build_object(
    'policy', 'cl13_pause_v1',
    'write_personal', false,
    'write_profile_facts', false,
    'read_personal', false,
    'research_output_write', true,
    'research_output_read', true,
    'consent', null,
    'reason', 'personal memory between conversations is paused until consent, retention, export and erasure controls are ready; an old memory is read only with a verified consent of the same person, and no consent record exists yet')
$function$;

CREATE OR REPLACE FUNCTION public.fn_personal_memory_is_research_output_v1(p_agent text, p_memory_type text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  -- W4b only: the findings the two research bots produce. The memory type alone never makes a row "research": the same types
  -- written for any other agent (the assistant included) are personal memory, so "research" cannot be used as a way around the pause.
  select coalesce(p_agent in ('hatishbi', 'uriel') and p_memory_type in ('research_note', 'method_discovery'), false)
$function$;

CREATE OR REPLACE FUNCTION public.fn_personal_memory_personal_detail_v1(p_text text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  -- The ONE definition of "this text carries a personal detail": the kind found, or NULL. The kinds are the ones the assistant's
  -- own extractor recognises (name, address, postal code, birth) plus contact identifiers (e-mail, phone, a long number, an
  -- identity number), first-person statements, family and health. It is a pattern check, not an understanding of the text: a
  -- personal fact written in free words is NOT seen (stated in the README). It is a VETO and never a proof: a text that matches
  -- no pattern is not thereby research; eligibility comes from fn_personal_memory_research_route_v1 (a trusted source or an
  -- approval). Round 8: the bare word for "analysis"/"surgery" no longer counts as health (a verse analysis was blocked by it);
  -- only "had/has a surgery" does. Depression, anxiety, psychiatric, cancer, diabetes etc. were added (a depression statement
  -- was stored and returned without consent).
  select case
    when p_text is null or p_text = '' then null
    when p_text ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+[.][A-Za-z]{2,}' then 'email'
    when p_text ~ '([+]?972[- ]?|0)5[0-9][- ]?[0-9]{3}[- ]?[0-9]{4}' then 'phone'
    when p_text ~ '[0-9]{9,}' then 'long_number'
    when p_text ~ '(ת[.]?\s?ז[.]?(\s|:)|תעודת\s+זהות)' then 'identity_number'
    when p_text ~ '(^|[^א-ת])(שמי|קוראים\s+לי|השם\s+שלי|אני\s+נקרא(ת)?)\s+[א-ת]' then 'name'
    when p_text ~ '(^|[^א-ת])(אני\s+)?(מתגורר(ת)?|גר(ה)?|כתובת(י|ה|ו)?(\s+היא)?)\s+(ב|ברחוב|בשדרות|ברח)' then 'address'
    when p_text ~ 'מיקוד[^0-9]{0,12}[0-9]{5,7}' then 'postal'
    when p_text ~ '(נולד|יום\s*ה?הולד|תאריך\s*ה?ליד)' then 'birth'
    when p_text ~ '(^|[^א-ת])(בעלי|אשתי|בעלה|אשתו|הבן\s+של(י|ה|ו)|הבת\s+של(י|ה|ו)|אמא\s+של(י|ה|ו)|אבא\s+של(י|ה|ו))([^א-ת]|$)' then 'family'
    when p_text ~ '(^|[^א-ת])(אני|אנחנו)\s+(ה?מתמודד(ת)?|סובל(ת)?|נאבק(ת)?|מרגיש(ה)?|חולה|חולים|גר(ה)?|נשוי|נשואה|גרוש(ה)?|אלמן|אלמנה|מפחד|מפחדת|בודד(ה)?)' then 'first_person'
    when p_text ~ '(^|[^א-ת])(חולה|חולים|מחלה|אבחנה|תרופ|אשפוז|דיכאון|חרדה|פסיכ|סרטן|התמכרות|אוטיזם|אפילפסיה|סוכרת|מתמודד(ת)?\s+עם|(עברתי|עבר|עברה|עובר|עוברת)\s+ניתוח)' then 'health'
    else null end
$function$;

CREATE OR REPLACE FUNCTION public.fn_personal_memory_research_sources_v1()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  -- A CLOSED list of import sources of research material that is not an extraction from a conversation: the bulk imports of
  -- method documents (live on 12.11.2026: 72 rows). A source here is authorisation by PROVENANCE. The list is a decision of
  -- ZURIEL (D-RESEARCH-SOURCES) and is one line to change. Rows written from a chat carry the source 'wa' and are not in it.
  select array['yiska_method_notes', 'christina_decomposition_rules', 'christina_letter_combinations']
$function$;

CREATE OR REPLACE FUNCTION public.fn_research_subject_in_corpus_v1(p_topic text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_skeleton text;
begin
  -- Positive attestation from a trusted source: the SUBJECT of the row is a quotation from the canonical Tanakh text
  -- (public.tanach_verses, 23,204 verses). The words that introduce a quotation ("analysis of the verse ...") are removed; what
  -- is left must be one contiguous run inside ONE verse. Comparison is by letters only: no points or punctuation, final letters
  -- folded, and vav / yod dropped so that a full and a defective spelling of the same word match. At least 8 letters are
  -- needed: a short word is in some verse anyway and proves nothing. A subject that is not a quotation (a sentence about a
  -- person, a word) is NOT attested here. Writers only: the scan reads the whole corpus (about 0.4 s), so the readers use the
  -- marker the trigger wrote.
  if p_topic is null or p_topic = '' then return false; end if;
  select translate(coalesce(string_agg(w, ''), ''), 'םןךףץוי', 'מנכפצ') into v_skeleton
    from unnest(regexp_split_to_array(regexp_replace(p_topic, '[^א-ת ]', ' ', 'g'), '\s+')) w
   where w <> '' and w <> all (array['ניתוח', 'ניתוחו', 'הפסוק', 'פסוק', 'הפרק', 'הביטוי', 'הצירוף', 'המשפט', 'גימטריה', 'בגימטריה', 'פירוק', 'הפירוק', 'הסבר', 'פירוש', 'ביאור', 'בדיקת']);
  if char_length(v_skeleton) < 8 then return false; end if;
  return exists (select 1 from public.tanach_verses v
                  where translate(regexp_replace(v.text, '[^א-ת]', '', 'g'), 'םןךףץוי', 'מנכפצ') like '%' || v_skeleton || '%');
end
$function$;

CREATE OR REPLACE FUNCTION public.fn_personal_memory_research_route_v1(p_agent text, p_memory_type text, p_status text, p_source text, p_topic text, p_data jsonb, p_check_corpus boolean)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  -- WHY a row is research output, or NULL. The label alone is not enough and the absence of a personal-detail match is not
  -- proof either (round 8): research needs a POSITIVE attestation from a trusted source or an approval.
  --   approval        status approved / canonical: a human act on an existing row (the INSERT path never passes it, see the trigger)
  --   curated_source  the row comes from a closed list of imported method documents (fn_personal_memory_research_sources_v1)
  --   verse           the subject is a quotation from the canonical Tanakh (fn_research_subject_in_corpus_v1); the trigger writes the
  --                   marker research_attestation = verse, so a reader does not scan the corpus. A marker is trusted only when the
  --                   row was written through the trigger (which strips an incoming marker and recomputes).
  select case
    when not public.fn_personal_memory_is_research_output_v1(p_agent, p_memory_type) then null
    when p_status in ('approved', 'canonical') then 'approval'
    when p_source = any (public.fn_personal_memory_research_sources_v1()) then 'curated_source'
    when coalesce(p_data ->> 'research_attestation', '') = 'verse' then 'verse'
    when coalesce(p_check_corpus, false) and public.fn_research_subject_in_corpus_v1(p_topic) then 'verse'
    else null end
$function$;

CREATE OR REPLACE FUNCTION public.fn_personal_memory_row_is_research_v1(p_agent text, p_memory_type text, p_status text, p_source text, p_topic text, p_text text, p_data jsonb, p_check_corpus boolean)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  -- A ROW is research output only when BOTH hold: it is POSITIVELY attested (fn_personal_memory_research_route_v1: an approval, a
  -- curated source, or a quotation from the canonical text) AND its text carries no personal detail (the veto). Every other row is
  -- personal memory. This is the test every writer, the table trigger, the research reader, the export and the erasure use.
  select public.fn_personal_memory_research_route_v1(p_agent, p_memory_type, p_status, p_source, p_topic, p_data, p_check_corpus) is not null
     and public.fn_personal_memory_personal_detail_v1(p_text) is null
$function$;

CREATE OR REPLACE FUNCTION public.fn_personal_memory_write_guard_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_data jsonb; v_route text; v_detail text; v_research_write boolean;
begin
  -- The stop for every writer of public.agent_user_memory, including a direct write with the service key. It RAISES: a writer
  -- that is refused gets an error, never a silent "saved". DELETE is not touched (erasure stays possible).
  -- Research output of the research bots continues ONLY when it is positively attested (fn_personal_memory_research_route_v1),
  -- carries no personal detail, and the policy grants research_output_write. An UPDATE may not turn a personal row into one.
  v_data := case when jsonb_typeof(new.data) = 'object' then new.data - 'research_attestation' else new.data end;   -- an incoming marker is never trusted
  v_detail := public.fn_personal_memory_personal_detail_v1(concat_ws(' ', new.topic, new.content, v_data::text));
  -- an approval is a later human act on an existing row: a row cannot approve itself by being inserted as 'approved'
  v_route := public.fn_personal_memory_research_route_v1(new.agent, new.memory_type, case when tg_op = 'INSERT' then 'private' else new.status end, new.source, new.topic, v_data, true);
  v_research_write := coalesce((public.fn_personal_memory_policy_v1(new.user_ref) ->> 'research_output_write')::boolean, false);
  if v_route is not null and v_detail is null
     and (tg_op = 'INSERT' or public.fn_personal_memory_is_research_output_v1(old.agent, old.memory_type)) and v_research_write then
    if v_route = 'verse' and jsonb_typeof(v_data) = 'object' then new.data := v_data || jsonb_build_object('research_attestation', 'verse');
    elsif jsonb_typeof(v_data) = 'object' then new.data := v_data; end if;
    return new;
  end if;
  if coalesce((public.fn_personal_memory_policy_v1(new.user_ref) ->> 'write_personal')::boolean, false) then
    -- A profile fact needs more than a consent to memory: a linked account and an explicit approval of the fact (D-CL13-3).
    if new.memory_type is distinct from 'personal_context' or coalesce((public.fn_personal_memory_policy_v1(new.user_ref) ->> 'write_profile_facts')::boolean, false) then return new; end if;
    raise exception 'a profile fact requires a linked account and an explicit approval (CL-13): % of a personal_context row for agent % is refused; nothing was saved',
      tg_op, coalesce(new.agent, '(null)')
      using errcode = 'P0001', hint = 'A consent to memory does not open profile facts (D-CL13-3).';
  end if;
  if public.fn_personal_memory_is_research_output_v1(new.agent, new.memory_type) then
    if v_detail is not null then
      raise exception 'a research row that carries a personal detail (%) is personal memory, and personal memory is paused (CL-13): % of a % row for agent % is refused; nothing was saved',
        v_detail, tg_op, new.memory_type, new.agent
        using errcode = 'P0001', hint = 'Personal information inside research stays subject to the consent of the person.';
    elsif v_route is null then
      raise exception 'a research-typed row without an attestation is personal memory, and personal memory is paused (CL-13): % of a % row for agent % is refused; nothing was saved',
        tg_op, new.memory_type, new.agent
        using errcode = 'P0001', hint = 'Research needs a trusted source or an approval; the absence of a personal detail is not proof.';
    elsif not v_research_write then
      raise exception 'research output is not allowed for this person by the policy (research_output_write is not granted) (CL-13): % of a % row for agent % is refused; nothing was saved',
        tg_op, new.memory_type, new.agent
        using errcode = 'P0001', hint = 'The policy function decides research_output_write.';
    end if;
  end if;
  raise exception 'personal memory is paused (CL-13): % of a % row for agent % is refused; nothing was saved',
    tg_op, coalesce(new.memory_type, '(null)'), coalesce(new.agent, '(null)')
    using errcode = 'P0001', hint = 'No new personal memory until consent, retention, export and erasure controls are ready.';
end
$function$;

CREATE OR REPLACE FUNCTION public.fn_raziel_remember(p_user_ref text, p_channel text, p_content text, p_memory_type text DEFAULT 'conversation'::text, p_scope text DEFAULT 'personal'::text, p_topic text DEFAULT NULL::text, p_visibility text DEFAULT 'private'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
  if coalesce(p_user_ref,'')='' or coalesce(p_content,'')='' then return null; end if;
  -- CL-13 (W1): the conversation-memory writer of the assistant. While personal memory is paused nothing is written and NULL
  -- (= not saved) is returned, whatever memory type the caller names.
  if not coalesce((public.fn_personal_memory_policy_v1(p_user_ref) ->> 'write_personal')::boolean, false) then return null; end if;
  insert into agent_user_memory (user_ref,channel,agent,memory_type,memory_scope,topic,content,visibility,source,status)
  values (p_user_ref,p_channel,'raziel',p_memory_type,p_scope,p_topic,left(p_content,4000),p_visibility,'wa','private')
  returning id into v_id;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.fn_raziel_fact(p_user_ref text, p_channel text, p_kind text, p_value text, p_data jsonb DEFAULT '{}'::jsonb, p_visibility text DEFAULT 'private'::text, p_confidence smallint DEFAULT 3)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; v_merged jsonb;
begin
  if coalesce(p_user_ref,'')='' or coalesce(p_kind,'')='' or coalesce(p_value,'')='' then return null; end if;
  -- CL-13 (W2): profile facts. While personal memory is paused no fact is written or updated and NULL (= not saved) is returned.
  -- A consent to memory is not enough for a fact: the policy must grant profile facts explicitly (D-CL13-3).
  if not coalesce((public.fn_personal_memory_policy_v1(p_user_ref) ->> 'write_personal')::boolean, false) or not coalesce((public.fn_personal_memory_policy_v1(p_user_ref) ->> 'write_profile_facts')::boolean, false) then return null; end if;
  if p_visibility not in ('private','team','public') then p_visibility := 'private'; end if;
  v_merged := coalesce(p_data,'{}'::jsonb) || jsonb_build_object('kind',p_kind,'value',p_value);
  update agent_user_memory
     set content=left(p_value,4000), data=v_merged, visibility=p_visibility,
         confidence=p_confidence, updated_at=now()
   where user_ref=p_user_ref and agent='raziel' and memory_type='personal_context'
     and source='profile' and topic=p_kind
   returning id into v_id;
  if v_id is not null then return v_id; end if;
  insert into agent_user_memory
    (user_ref,channel,agent,memory_type,memory_scope,topic,content,data,visibility,source,status,confidence)
  values
    (p_user_ref,p_channel,'raziel','personal_context','personal',p_kind,left(p_value,4000),
     v_merged,p_visibility,'profile','private',p_confidence)
  returning id into v_id;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.fn_raziel_upsert_summary(p_user_ref text, p_channel text, p_scope text, p_summary text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- CL-13 (W3): a summary about a person or a channel. It returns nothing, so "not saved" can only be said by an error.
  if not coalesce((public.fn_personal_memory_policy_v1(p_user_ref) ->> 'write_personal')::boolean, false) then
    raise exception 'personal memory is paused (CL-13): fn_raziel_upsert_summary writes nothing'
      using errcode = 'P0001', hint = 'No new personal memory until consent, retention, export and erasure controls are ready.';
  end if;
  if p_scope='channel' then
    update agent_user_memory set content=left(p_summary,4000), updated_at=now()
      where agent='raziel' and memory_type='summary' and memory_scope='channel' and channel=p_channel;
    if not found then
      insert into agent_user_memory (user_ref,channel,agent,memory_type,memory_scope,content,visibility,source,status)
      values (coalesce(p_user_ref,'channel:'||p_channel),p_channel,'raziel','summary','channel',left(p_summary,4000),'private','ai','private');
    end if;
  else
    update agent_user_memory set content=left(p_summary,4000), updated_at=now()
      where agent='raziel' and memory_type='summary' and memory_scope='personal' and user_ref=p_user_ref;
    if not found then
      insert into agent_user_memory (user_ref,channel,agent,memory_type,memory_scope,content,visibility,source,status)
      values (p_user_ref,p_channel,'raziel','summary','personal',left(p_summary,4000),'private','ai','private');
    end if;
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.fn_mem_add(p_user text, p_agent text, p_memory_type text, p_content text DEFAULT NULL::text, p_topic text DEFAULT NULL::text, p_visibility text DEFAULT 'private'::text, p_status text DEFAULT 'private'::text, p_source text DEFAULT 'wa'::text, p_confidence smallint DEFAULT NULL::smallint, p_channel text DEFAULT 'wa'::text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v uuid; v_data jsonb := coalesce(p_data,'{}'::jsonb);
begin
  -- CL-13 (W4): an unknown memory type is NOT stored as 'research_note' any more ("research" is not a default), and nothing is
  -- saved for it. Research output of the research bots (W4b) continues ONLY when it is positively attested (an approval, a
  -- curated source or a quotation from the canonical text), carries no personal detail and the policy grants research_output_write;
  -- every other row is personal memory (W4a) and, while personal memory is paused, is not written: NULL (= not saved) is returned.
  -- A status 'approved' claimed by the caller is ignored on insert: an approval is a later human act.
  if p_memory_type is null or p_memory_type not in ('conversation','personal_context','research_note','method_discovery','preference') then return null; end if;
  if jsonb_typeof(v_data) = 'object' then v_data := v_data - 'research_attestation'; end if;
  if public.fn_personal_memory_row_is_research_v1(p_agent, p_memory_type, 'private', coalesce(p_source,'wa'), p_topic, concat_ws(' ', p_topic, p_content, v_data::text), v_data, true) then
    if not coalesce((public.fn_personal_memory_policy_v1(p_user) ->> 'research_output_write')::boolean, false) and not coalesce((public.fn_personal_memory_policy_v1(p_user) ->> 'write_personal')::boolean, false) then return null; end if;
  elsif not coalesce((public.fn_personal_memory_policy_v1(p_user) ->> 'write_personal')::boolean, false) then return null; end if;
  if p_memory_type = 'personal_context' and not coalesce((public.fn_personal_memory_policy_v1(p_user) ->> 'write_profile_facts')::boolean, false) then return null; end if;
  insert into public.agent_user_memory(user_ref,channel,agent,memory_type,topic,content,data,source,confidence,visibility,status)
  values (p_user, coalesce(p_channel,'wa'), p_agent, p_memory_type,
    p_topic, p_content, v_data, coalesce(p_source,'wa'), p_confidence,
    case when p_visibility in ('private','team','public') then p_visibility else 'private' end,
    case when p_status in ('private','candidate','review','approved','canonical') then p_status else 'private' end)
  returning id into v; return v;
end $function$;

CREATE OR REPLACE FUNCTION public.fn_raziel_context(p_user_ref text, p_channel text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_is_group boolean := coalesce(p_channel,'') like '%@g.us';
  v_user jsonb; v_chan jsonb;
  v_policy jsonb := public.fn_personal_memory_policy_v1(p_user_ref);
  v_subject boolean := not v_is_group and p_user_ref is not null;
  -- CL-13: an old personal memory is read only when the policy allows it for THIS person (a verified consent). Never in a group.
  v_read boolean := v_subject and coalesce((v_policy ->> 'read_personal')::boolean, false);
  v_write boolean := v_subject and coalesce((v_policy ->> 'write_personal')::boolean, false);
  v_recent text;
  v_real_summary text;
begin
  if not v_read then
    v_user := jsonb_build_object('approved_preferences','[]'::jsonb,'research_threads','[]'::jsonb,'summary',null,'profile','[]'::jsonb,'recent_conversation','[]'::jsonb);
  else
    -- The SAME person only: rows recorded under exactly this reference. The earlier identity bridge (account id <-> phone through
    -- wa_account_links) is removed: a verified link gives access to the account, it does not merge memories recorded under
    -- another reference (D-CL13-2: no implied merge).
    select string_agg(content, ' · ') into v_recent from (
      select content from agent_user_memory
      where user_ref = p_user_ref and agent='raziel'
        and memory_type='conversation' and memory_scope='personal'
      order by created_at desc limit 10) t;

    v_real_summary := (select content from agent_user_memory where user_ref = p_user_ref and agent='raziel'
        and memory_type='conversation' and memory_scope='personal' and source='summary' order by updated_at desc limit 1);

    v_user := jsonb_build_object(
      'approved_preferences', coalesce((select jsonb_agg(content order by updated_at desc) from agent_user_memory
         where user_ref = p_user_ref and agent='raziel' and memory_type='preference'
           and visibility in ('team','public')),'[]'::jsonb),
      -- rows of the ASSISTANT with a research type are personal memory of this person (only the research bots produce research
      -- output), so they are inside this branch: read with the person's consent, never without it
      'research_threads', coalesce((select jsonb_agg(content) from (
         select content from agent_user_memory where user_ref = p_user_ref and agent='raziel'
           and memory_type in ('research_note','method_discovery') order by updated_at desc limit 8) t),'[]'::jsonb),
      'summary', coalesce(v_real_summary,
         case when v_recent is not null then 'שיחות אחרונות (אתר+וואטסאפ): ' || v_recent else null end),
      'recent_conversation', coalesce((select jsonb_agg(content) from (
         select content from agent_user_memory where user_ref = p_user_ref and agent='raziel'
           and memory_type='conversation' and memory_scope='personal' order by created_at desc limit 10) t),'[]'::jsonb),
      'profile', coalesce((select jsonb_agg(jsonb_build_object('kind',topic,'value',content) order by updated_at desc)
           from agent_user_memory where user_ref = p_user_ref and agent='raziel'
             and memory_type='personal_context' and source='profile'),'[]'::jsonb));
  end if;
  v_chan := jsonb_build_object(
    'topic_summary', null,
    'recent_group_topics', coalesce((select jsonb_agg(topic) from (
         select distinct topic from agent_user_memory where channel=p_channel and agent='raziel'
           and memory_scope='channel' and topic is not null limit 10) t),'[]'::jsonb));
  return jsonb_build_object('user_context',v_user,'channel_context',v_chan,
    'privacy', jsonb_build_object(
      'personal_memory_allowed', v_read,
      'personal_memory_write_allowed', v_write,
      'policy', v_policy ->> 'policy',
      'reason', case when v_is_group then 'group' when p_user_ref is null then 'no_person'
                     when not v_read then coalesce(v_policy ->> 'reason', 'not allowed') else null end));
end $function$;

CREATE OR REPLACE FUNCTION public.fn_research_output_context_v1(p_user_ref text, p_agent text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_policy jsonb := public.fn_personal_memory_policy_v1(p_user_ref);
  v_research boolean := coalesce((v_policy ->> 'research_output_read')::boolean, false);
  v_personal boolean := coalesce((v_policy ->> 'read_personal')::boolean, false);
  v_rows jsonb; v_withheld integer;
begin
  -- The ONE reader of research output as context (the research bots call it instead of reading the table). Authorised research
  -- may be used during the pause: a row that is positively attested and carries no personal detail. Any other research-typed row
  -- (not attested, or with a personal detail) is returned only with the person's consent (read_personal); without it the row is
  -- counted as withheld (withheld_personal) and its text is not returned. Server only.
  if coalesce(p_user_ref, '') = '' or coalesce(p_agent, '') = '' then
    return jsonb_build_object('allowed', false, 'rows', '[]'::jsonb, 'withheld_personal', 0, 'policy', v_policy ->> 'policy', 'reason', 'no_person_or_agent');
  end if;
  if not v_research then
    return jsonb_build_object('allowed', false, 'rows', '[]'::jsonb, 'withheld_personal', 0, 'policy', v_policy ->> 'policy', 'reason', 'research output is not readable under the current policy');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('memory_type', r.memory_type, 'topic', r.topic, 'content', r.content, 'data', r.data, 'created_at', r.created_at)
             order by r.created_at desc, r.id) filter (where v_personal or r.attested), '[]'::jsonb),
         count(*) filter (where not v_personal and not r.attested)
    into v_rows, v_withheld
    from (select m.*, public.fn_personal_memory_row_is_research_v1(m.agent, m.memory_type, m.status, m.source, m.topic, concat_ws(' ', m.topic, m.content, m.data::text), m.data, false) as attested
            from public.agent_user_memory m
           where m.user_ref = p_user_ref and m.agent = p_agent and public.fn_personal_memory_is_research_output_v1(m.agent, m.memory_type)) r;
  return jsonb_build_object('allowed', true, 'rows', v_rows, 'withheld_personal', v_withheld, 'policy', v_policy ->> 'policy', 'reason', null);
end $function$;

CREATE OR REPLACE FUNCTION public.fn_personal_memory_refs_v1(p_user_id uuid)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  -- Every reference under which memory of THIS account holder may have been recorded: the account id, and each phone the holder
  -- VERIFIED (wa_account_links.verified_at), in the three stored forms. Used for the holder's own export and erasure only; it is
  -- never used to build a conversation context.
  select array[p_user_id::text] || coalesce((
    select array_agg(r) from (
      select unnest(array['wa:' || l.phone, l.phone, l.phone || '@c.us']) as r
        from public.wa_account_links l where l.user_id = p_user_id and l.verified_at is not null and coalesce(l.phone, '') <> '') x), '{}'::text[])
$function$;

CREATE OR REPLACE FUNCTION public.fn_personal_memory_sender_refs_v1(p_sender text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  -- The references of ONE WhatsApp sender without an account: the phone in its three stored forms and nothing else (no account id:
  -- account data needs a verified link). An empty or non-numeric sender has no reference.
  select case when regexp_replace(coalesce(p_sender, ''), '[^0-9]', '', 'g') ~ '^[0-9]{6,20}$'
    then array['wa:' || regexp_replace(p_sender, '[^0-9]', '', 'g'), regexp_replace(p_sender, '[^0-9]', '', 'g'), regexp_replace(p_sender, '[^0-9]', '', 'g') || '@c.us']
    else '{}'::text[] end
$function$;

CREATE OR REPLACE FUNCTION public.export_my_personal_memory()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid := auth.uid(); v_out jsonb;
begin
  -- CL-13 (M-5): the account holder reads everything recorded about them, in one call, without deleting anything.
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  select jsonb_build_object('ok', true, 'generated_at', now(), 'rows', coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id, 'agent', m.agent, 'memory_type', m.memory_type,
      'kind', case when public.fn_personal_memory_row_is_research_v1(m.agent, m.memory_type, m.status, m.source, m.topic, concat_ws(' ', m.topic, m.content, m.data::text), m.data, false) then 'research_output' else 'personal_memory' end,
      -- by the exact FORM of the reference (an account id is a uuid and may begin with a digit; a WhatsApp reference is the phone,
      -- with or without the "wa:" prefix or the "@c.us" suffix); any other form is reported as it is, never guessed
      'recorded_as', case when m.user_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then 'account'
                          when m.user_ref ~ '^(wa:)?[0-9]{6,20}(@c[.]us)?$' then 'whatsapp' else 'other' end,
      'channel', case when m.channel like '%@g.us' then 'group' when m.channel = 'site' then 'site' else 'private chat' end,
      'topic', m.topic, 'content', m.content, 'data', m.data, 'created_at', m.created_at, 'updated_at', m.updated_at)
      order by m.created_at, m.id), '[]'::jsonb))
    into v_out from public.agent_user_memory m where m.user_ref = any(public.fn_personal_memory_refs_v1(v_uid));
  return v_out;
end $function$;

CREATE OR REPLACE FUNCTION public.erase_my_personal_memory(p_include_research_output boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_refs text[] := public.fn_personal_memory_refs_v1(auth.uid()); v_personal int := 0; v_research int := 0; v_kept int := 0;
begin
  -- CL-13 (M-5): the account holder erases their memory WITHOUT deleting the account (delete_my_account deletes everything).
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  -- personal memory = every row that is not research output by the ROW test (an unattested research-typed row and a research row with a personal detail included)
  delete from public.agent_user_memory m where m.user_ref = any(v_refs)
     and not public.fn_personal_memory_row_is_research_v1(m.agent, m.memory_type, m.status, m.source, m.topic, concat_ws(' ', m.topic, m.content, m.data::text), m.data, false);
  get diagnostics v_personal = row_count;
  if coalesce(p_include_research_output, false) then
    delete from public.agent_user_memory m where m.user_ref = any(v_refs)
       and public.fn_personal_memory_is_research_output_v1(m.agent, m.memory_type);
    get diagnostics v_research = row_count;
  else
    select count(*) into v_kept from public.agent_user_memory m where m.user_ref = any(v_refs);
  end if;
  return jsonb_build_object('ok', true, 'deleted_personal_memory', v_personal, 'deleted_research_output', v_research,
    'kept_research_output', v_kept, 'account_deleted', false);
end $function$;

CREATE OR REPLACE FUNCTION public.fn_personal_memory_export(p_sender text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_refs text[] := public.fn_personal_memory_sender_refs_v1(p_sender); v_out jsonb;
begin
  -- CL-13 (M-5), the WhatsApp route for a sender WITHOUT an account. Server only: the caller must have verified the sender (the
  -- private-chat id read from the provider), which this function cannot check.
  if coalesce(array_length(v_refs, 1), 0) = 0 then return jsonb_build_object('ok', false, 'error', 'no_sender'); end if;
  select jsonb_build_object('ok', true, 'generated_at', now(), 'rows', coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id, 'agent', m.agent, 'memory_type', m.memory_type,
      'kind', case when public.fn_personal_memory_row_is_research_v1(m.agent, m.memory_type, m.status, m.source, m.topic, concat_ws(' ', m.topic, m.content, m.data::text), m.data, false) then 'research_output' else 'personal_memory' end,
      -- by the exact FORM of the reference (an account id is a uuid and may begin with a digit; a WhatsApp reference is the phone,
      -- with or without the "wa:" prefix or the "@c.us" suffix); any other form is reported as it is, never guessed
      'recorded_as', case when m.user_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then 'account'
                          when m.user_ref ~ '^(wa:)?[0-9]{6,20}(@c[.]us)?$' then 'whatsapp' else 'other' end,
      'channel', case when m.channel like '%@g.us' then 'group' when m.channel = 'site' then 'site' else 'private chat' end,
      'topic', m.topic, 'content', m.content, 'data', m.data, 'created_at', m.created_at, 'updated_at', m.updated_at)
      order by m.created_at, m.id), '[]'::jsonb))
    into v_out from public.agent_user_memory m where m.user_ref = any(v_refs);
  return v_out;
end $function$;

CREATE OR REPLACE FUNCTION public.fn_personal_memory_erase(p_sender text, p_include_research_output boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_refs text[] := public.fn_personal_memory_sender_refs_v1(p_sender); v_personal int := 0; v_research int := 0; v_kept int := 0;
begin
  -- CL-13 (M-5), the WhatsApp route for a sender WITHOUT an account. Server only; the caller verified the sender.
  if coalesce(array_length(v_refs, 1), 0) = 0 then return jsonb_build_object('ok', false, 'error', 'no_sender'); end if;
  -- personal memory = every row that is not research output by the ROW test (an unattested research-typed row and a research row with a personal detail included)
  delete from public.agent_user_memory m where m.user_ref = any(v_refs)
     and not public.fn_personal_memory_row_is_research_v1(m.agent, m.memory_type, m.status, m.source, m.topic, concat_ws(' ', m.topic, m.content, m.data::text), m.data, false);
  get diagnostics v_personal = row_count;
  if coalesce(p_include_research_output, false) then
    delete from public.agent_user_memory m where m.user_ref = any(v_refs)
       and public.fn_personal_memory_is_research_output_v1(m.agent, m.memory_type);
    get diagnostics v_research = row_count;
  else
    select count(*) into v_kept from public.agent_user_memory m where m.user_ref = any(v_refs);
  end if;
  return jsonb_build_object('ok', true, 'deleted_personal_memory', v_personal, 'deleted_research_output', v_research,
    'kept_research_output', v_kept, 'account_deleted', false);
end $function$;

CREATE OR REPLACE TRIGGER trg_personal_memory_pause_v1 BEFORE INSERT OR UPDATE ON public.agent_user_memory FOR EACH ROW EXECUTE FUNCTION fn_personal_memory_write_guard_v1();

-- privileges of the NEW functions (the five replaced functions keep theirs: CREATE OR REPLACE does not change owner or privileges)
revoke all on function public.fn_personal_memory_policy_v1(text), public.fn_personal_memory_is_research_output_v1(text,text),
  public.fn_personal_memory_personal_detail_v1(text), public.fn_personal_memory_research_sources_v1(), public.fn_research_subject_in_corpus_v1(text),
  public.fn_personal_memory_research_route_v1(text,text,text,text,text,jsonb,boolean),
  public.fn_personal_memory_row_is_research_v1(text,text,text,text,text,text,jsonb,boolean),
  public.fn_research_output_context_v1(text,text),
  public.fn_personal_memory_write_guard_v1(), public.fn_personal_memory_refs_v1(uuid), public.fn_personal_memory_sender_refs_v1(text),
  public.export_my_personal_memory(), public.erase_my_personal_memory(boolean), public.fn_personal_memory_export(text),
  public.fn_personal_memory_erase(text,boolean) from public, anon, authenticated;
grant execute on function public.fn_personal_memory_policy_v1(text), public.fn_personal_memory_is_research_output_v1(text,text),
  public.fn_personal_memory_personal_detail_v1(text), public.fn_personal_memory_research_sources_v1(), public.fn_research_subject_in_corpus_v1(text),
  public.fn_personal_memory_research_route_v1(text,text,text,text,text,jsonb,boolean),
  public.fn_personal_memory_row_is_research_v1(text,text,text,text,text,text,jsonb,boolean),
  public.fn_research_output_context_v1(text,text),
  public.fn_personal_memory_write_guard_v1(), public.fn_personal_memory_refs_v1(uuid), public.fn_personal_memory_sender_refs_v1(text),
  public.fn_personal_memory_export(text), public.fn_personal_memory_erase(text,boolean) to service_role;
grant execute on function public.export_my_personal_memory(), public.erase_my_personal_memory(boolean) to authenticated, service_role;

do $$
declare v_state text;
  c_after constant text := 'fn_personal_memory_policy_v1=fa42749d421fc712c167ce2ca60c8914 | fn_personal_memory_is_research_output_v1=07be6e8f5bd24db2a2fa79862a6c4d30 | fn_personal_memory_personal_detail_v1=a3c1f48534dc440c7ea0f8ef41a0f041 | fn_personal_memory_research_sources_v1=8b34899e3cb7dd34635a636db9352d8b | fn_research_subject_in_corpus_v1=f79a0b28c8268bb3762e5a09dc36c4f8 | fn_personal_memory_research_route_v1=46845aa2202fbbba0b57ceee3a949e6b | fn_personal_memory_row_is_research_v1=59d9fb0ef90d06da23a365190724039d | fn_personal_memory_write_guard_v1=649a127b4bcd4fea141d9098b2aefac7 | fn_raziel_remember=5376c5c1d3253578db401be5ad67f4f1 | fn_raziel_fact=468a7a6980890b5db87fdd62870aa5c2 | fn_raziel_upsert_summary=0179dfe9830d631e782001dad63ef15e | fn_mem_add=31c7ab067f7618981eb31a733a58f06d | fn_raziel_context=d5b9822de0dfa340245bad611699e966 | fn_research_output_context_v1=d19a81c3af57518de79f61ee24146dcd | fn_personal_memory_refs_v1=8ef502be78cdd85ee3300eb6e484a28e | fn_personal_memory_sender_refs_v1=e61a31defa02ff6e716c413c9d54e21a | export_my_personal_memory=eacf47163e0c84843a91ae5163ef8d01 | erase_my_personal_memory=4afdb9441d0c9d5f6c9e22add62d26d1 | fn_personal_memory_export=23086bb93bb7169835bf1b2bd4cc3811 | fn_personal_memory_erase=06064b06a01f5559a1ae0009ad824be1 | trigger=CREATE TRIGGER trg_personal_memory_pause_v1 BEFORE INSERT OR UPDATE ON public.agent_user_memory FOR EACH ROW EXECUTE FUNCTION fn_personal_memory_write_guard_v1() [enabled=O] | other_triggers=0';
begin
  v_state := 'fn_personal_memory_policy_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_policy_v1(text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_is_research_output_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_is_research_output_v1(text,text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_personal_detail_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_personal_detail_v1(text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_research_sources_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_research_sources_v1()')), '(missing)')
    || ' | ' || 'fn_research_subject_in_corpus_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_research_subject_in_corpus_v1(text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_research_route_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_research_route_v1(text,text,text,text,text,jsonb,boolean)')), '(missing)')
    || ' | ' || 'fn_personal_memory_row_is_research_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_row_is_research_v1(text,text,text,text,text,text,jsonb,boolean)')), '(missing)')
    || ' | ' || 'fn_personal_memory_write_guard_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_write_guard_v1()')), '(missing)')
    || ' | ' || 'fn_raziel_remember=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_raziel_remember(text,text,text,text,text,text,text)')), '(missing)')
    || ' | ' || 'fn_raziel_fact=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_raziel_fact(text,text,text,text,jsonb,text,smallint)')), '(missing)')
    || ' | ' || 'fn_raziel_upsert_summary=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_raziel_upsert_summary(text,text,text,text)')), '(missing)')
    || ' | ' || 'fn_mem_add=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_mem_add(text,text,text,text,text,text,text,text,smallint,text,jsonb)')), '(missing)')
    || ' | ' || 'fn_raziel_context=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_raziel_context(text,text)')), '(missing)')
    || ' | ' || 'fn_research_output_context_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_research_output_context_v1(text,text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_refs_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_refs_v1(uuid)')), '(missing)')
    || ' | ' || 'fn_personal_memory_sender_refs_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_sender_refs_v1(text)')), '(missing)')
    || ' | ' || 'export_my_personal_memory=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.export_my_personal_memory()')), '(missing)')
    || ' | ' || 'erase_my_personal_memory=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.erase_my_personal_memory(boolean)')), '(missing)')
    || ' | ' || 'fn_personal_memory_export=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_export(text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_erase=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_erase(text,boolean)')), '(missing)')
    || ' | trigger=' || coalesce((select pg_get_triggerdef(t.oid) || ' [enabled=' || t.tgenabled::text || ']' from pg_trigger t
         where t.tgrelid = 'public.agent_user_memory'::regclass and t.tgname = 'trg_personal_memory_pause_v1' and not t.tgisinternal), '(missing)')
    || ' | other_triggers=' || (select count(*) from pg_trigger t where t.tgrelid = 'public.agent_user_memory'::regclass and not t.tgisinternal and t.tgname <> 'trg_personal_memory_pause_v1');
  if v_state is distinct from c_after then raise exception 'CL13 postcondition: the state is not exactly the reviewed one: %', v_state; end if;
  if exists (select 1 from cl13_before b join pg_proc p on p.proname = b.proname and p.pronamespace = 'public'::regnamespace
              where p.proowner <> b.proowner or p.proacl::text is distinct from b.acl or p.prosecdef <> b.prosecdef
                 or p.proconfig is distinct from b.proconfig or p.provolatile <> b.provolatile) then
    raise exception 'CL13 postcondition: owner, privileges, SECURITY DEFINER, search_path or volatility of a replaced function changed';
  end if;
  if has_function_privilege('anon', 'public.export_my_personal_memory()', 'EXECUTE') or has_function_privilege('anon', 'public.erase_my_personal_memory(boolean)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.fn_personal_memory_erase(text,boolean)', 'EXECUTE') or has_function_privilege('authenticated', 'public.fn_personal_memory_export(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.fn_personal_memory_policy_v1(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.fn_research_output_context_v1(text,text)', 'EXECUTE') or has_function_privilege('anon', 'public.fn_research_output_context_v1(text,text)', 'EXECUTE')
     or exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace
                  and p.proname in ('fn_personal_memory_research_sources_v1', 'fn_research_subject_in_corpus_v1', 'fn_personal_memory_research_route_v1', 'fn_personal_memory_row_is_research_v1', 'fn_personal_memory_personal_detail_v1')
                  and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'))) then
    raise exception 'CL13 postcondition: a client role may execute a server-only function';
  end if;
end $$;

commit;
