"""Decision 4 (ZURIEL 11.11.2026): Corpus Admission approval path — PROPOSAL ONLY, NOT EXECUTED.
40  functions only: resolve_word_review v2, wa_word_review v2, admin_bulk_triage v2 (disabled), admin_hide_word v2 (+audit),
    new: _corpus_word_state_v1, _corpus_admission_ledger_v1, admin_corpus_admission_state_v1, admin_corpus_enqueue_existing_words_v1.
    No row of gematria_words / post_gematria_links / word_review_queue / decision_ledger is changed by applying it (checked inside).
    word_approval_required_law stays active; the frozen corpus_admission_foundation_v1 text is NOT touched (no exemption used).
49  rollback: restores the exact live definitions and drops the 4 new functions (data written after 40 is kept).
"""
import json, os, sys, re, hashlib, difflib
sys.path.insert(0, os.path.dirname(__file__))
from lib import P, wr, md5
BASE = json.load(open(P('base/fn/corpus/_manifest.json')))
def base_def(sig): return open(P(BASE[sig]['file']), encoding='utf-8').read()
def prosrc(text):
    i = text.index('AS $function$') + len('AS $function$'); j = text.rindex('$function$')
    return text[i:j]
NEW = {f: open(P('tools/corpus_new/' + f), encoding='utf-8').read() for f in sorted(os.listdir(P('tools/corpus_new')))}
REPLACED = [  # (regprocedure, base signature key, new file)
  ('public.resolve_word_review(uuid,text,text,text)', 'resolve_word_review(p_id uuid, p_action text, p_edit text, p_by text)', '02_resolve_word_review.sql'),
  ('public.wa_word_review(uuid,text)', 'wa_word_review(p_id uuid, p_action text)', '03_wa_word_review.sql'),
  ('public.admin_bulk_triage(text)', 'admin_bulk_triage(p_action text)', '04_admin_bulk_triage.sql'),
  ('public.admin_hide_word(text)', 'admin_hide_word(p_phrase text)', '05_admin_hide_word.sql'),
]
CREATED = [  # (regprocedure, new file, function name within the file)
  ('public._corpus_word_state_v1(uuid)', '01_helpers.sql', '_corpus_word_state_v1'),
  ('public._corpus_admission_ledger_v1(text,text,text,jsonb,jsonb,jsonb)', '01_helpers.sql', '_corpus_admission_ledger_v1'),
  ('public.admin_corpus_admission_state_v1()', '06_admin_state.sql', 'admin_corpus_admission_state_v1'),
  ('public.admin_corpus_enqueue_existing_words_v1(uuid[],text)', '07_admin_enqueue.sql', 'admin_corpus_enqueue_existing_words_v1'),
]
def split_helpers(text):
    parts = re.split(r'(?=^CREATE FUNCTION )', text, flags=re.M)
    return {re.search(r'public\.([a-z0-9_]+)\(', p).group(1): p.strip() for p in parts if p.strip()}
HELPERS = split_helpers(NEW['01_helpers.sql'])
def created_text(fname, name):
    return HELPERS[name] if fname == '01_helpers.sql' else NEW[fname].strip()
new_src_md5 = {}
for reg, _, f in REPLACED: new_src_md5[reg] = md5(prosrc(NEW[f]))
for reg, f, name in CREATED: new_src_md5[reg] = md5(prosrc(created_text(f, name)))
STATE = ("md5(string_agg(id::text||'|'||is_verified::text||'|'||coalesce(visibility_reason,'')||'|'||coalesce(visibility_tier,-1)::text"
         "||'|'||coalesce(is_published,false)::text, ',' order by id))")
HEAD = """-- SOD1820 · Decision 4 — Corpus Admission: word-approval path (functions only) — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 11.11.2026 against the live DB definitions read the same day (pg_get_functiondef md5 guards below).
-- Requires ZURIEL's explicit approval of this exact file (SHA-256 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Scope: replaces 4 functions (same signatures, SECURITY DEFINER and search_path kept) and adds 4. Changes NO data:
-- the apply step re-checks the state of every gematria_words row and the row counts of the queue, ledger and post links.
-- word_approval_required_law stays active. corpus_admission_foundation_v1 (frozen, ד5) is not touched.
"""
s = [HEAD, 'begin;\n\n-- G0: refuse unless the live definitions are exactly the reviewed ones and the new names are free\ndo $s40g$\nbegin\n']
for reg, sig, _ in REPLACED:
    s.append(f"  if md5(pg_get_functiondef('{reg}'::regprocedure)) <> '{BASE[sig]['md5']}' then raise exception 'S40: {reg} differs from the reviewed definition'; end if;\n")
s.append("  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'\n"
         "             and p.proname in ('_corpus_word_state_v1','_corpus_admission_ledger_v1','admin_corpus_admission_state_v1','admin_corpus_enqueue_existing_words_v1')) then\n"
         "    raise exception 'S40: a function name to be created already exists'; end if;\nend $s40g$;\n\n")
s.append(f"create temp table _s40_before on commit drop as select\n  (select {STATE} from public.gematria_words) words_state,\n"
         "  (select count(*) from public.gematria_words) n_words, (select count(*) from public.word_review_queue) n_queue,\n"
         "  (select count(*) from public.decision_ledger) n_ledger, (select count(*) from public.post_gematria_links) n_links;\n\n")
for f in ['01_helpers.sql', '02_resolve_word_review.sql', '03_wa_word_review.sql', '04_admin_bulk_triage.sql', '05_admin_hide_word.sql', '06_admin_state.sql', '07_admin_enqueue.sql']:
    s.append(f'-- {f}\n' + NEW[f].strip() + '\n\n')
s.append("revoke all on function public._corpus_word_state_v1(uuid) from public, anon, authenticated;\n"
         "revoke all on function public._corpus_admission_ledger_v1(text,text,text,jsonb,jsonb,jsonb) from public, anon, authenticated;\n"
         "revoke all on function public.admin_corpus_admission_state_v1() from public, anon;\n"
         "revoke all on function public.admin_corpus_enqueue_existing_words_v1(uuid[],text) from public, anon;\n"
         "grant execute on function public.admin_corpus_admission_state_v1() to authenticated, service_role;\n"
         "grant execute on function public.admin_corpus_enqueue_existing_words_v1(uuid[],text) to authenticated, service_role;\n\n")
s.append('-- P: verify the installed bodies and that no data changed\ndo $s40p$\nbegin\n')
for reg in new_src_md5:
    s.append(f"  if (select md5(prosrc) from pg_proc where oid = '{reg}'::regprocedure) <> '{new_src_md5[reg]}' then raise exception 'S40: {reg} body differs'; end if;\n")
s.append(f"  if (select words_state from _s40_before) is distinct from (select {STATE} from public.gematria_words) then raise exception 'S40: word state changed'; end if;\n"
         "  if (select n_words from _s40_before) <> (select count(*) from public.gematria_words)\n"
         "     or (select n_queue from _s40_before) <> (select count(*) from public.word_review_queue)\n"
         "     or (select n_ledger from _s40_before) <> (select count(*) from public.decision_ledger)\n"
         "     or (select n_links from _s40_before) <> (select count(*) from public.post_gematria_links) then raise exception 'S40: row counts changed'; end if;\n"
         "end $s40p$;\n\ncommit;\n")
wr('sql/40_corpus_admission_approval_path.sql', ''.join(s))
r = [HEAD.replace('Decision 4 — Corpus Admission: word-approval path (functions only)', 'ROLLBACK of 40_corpus_admission_approval_path.sql')
       .replace('-- Scope: replaces 4 functions', '-- Restores the exact live definitions of 4 functions and drops the 4 functions 40_ created. Decisions, queue rows and ledger rows written AFTER 40_ are data and are kept.\n-- (Original scope of 40_: replaces 4 functions'),
     'begin;\n\ndo $s49g$\nbegin\n']
for reg, _, _ in REPLACED:
    r.append(f"  if (select md5(prosrc) from pg_proc where oid = '{reg}'::regprocedure) <> '{new_src_md5[reg]}' then raise exception 'S49: {reg} is not the 40_ version'; end if;\n")
r.append('end $s49g$;\n\n')
for reg, sig, _ in REPLACED:
    r.append(f'-- restore {reg} (md5 {BASE[sig]["md5"]})\n' + base_def(sig).rstrip('\n') + ';\n\n')
for reg, _, _ in reversed(CREATED):
    r.append(f'drop function {reg};\n')
r.append('\ndo $s49p$\nbegin\n')
for reg, sig, _ in REPLACED:
    r.append(f"  if md5(pg_get_functiondef('{reg}'::regprocedure)) <> '{BASE[sig]['md5']}' then raise exception 'S49: {reg} was not restored exactly'; end if;\n")
r.append("  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'\n"
         "             and p.proname in ('_corpus_word_state_v1','_corpus_admission_ledger_v1','admin_corpus_admission_state_v1','admin_corpus_enqueue_existing_words_v1')) then\n"
         "    raise exception 'S49: a created function is still present'; end if;\nend $s49p$;\n\ncommit;\n")
wr('sql/49_corpus_admission_approval_path_ROLLBACK.sql', ''.join(r))
os.makedirs(P('diff'), exist_ok=True)
for reg, sig, f in REPLACED:
    name = reg.split('.')[1].split('(')[0]
    d = ''.join(difflib.unified_diff(base_def(sig).splitlines(True), NEW[f].splitlines(True), f'live:{name}', f'proposed:{name} v2'))
    wr(f'diff/fn_{name}_v1_to_v2.diff', d)
json.dump({'new_prosrc_md5': new_src_md5, 'base_functiondef_md5': {reg: BASE[sig]['md5'] for reg, sig, _ in REPLACED}},
          open(P('out/corpus_summary.json'), 'w'), indent=1)
print(json.dumps(new_src_md5, indent=1))
