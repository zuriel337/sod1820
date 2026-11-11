"""Build P0 proposals (NOT EXECUTED): new texts, metadata, unified diffs and guarded SQL.
Reads only local verified copies of the live DB rows (exec/base/*). Writes exec/new, exec/diff, exec/sql, exec/out."""
import json, hashlib, difflib, os, sys, copy
sys.path.insert(0, os.path.dirname(__file__))
from p0_spec import RULES, CODEX

EX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def P(*a): return os.path.join(EX, *a)
def md5(s): return hashlib.md5(s.encode('utf-8')).hexdigest()
def rd(p): return open(P(p), encoding='utf-8').read()
def wr(p, s):
    os.makedirs(os.path.dirname(P(p)), exist_ok=True)
    open(P(p), 'w', encoding='utf-8').write(s)

DB_META_MD5 = json.load(open(P('base/meta/_db_meta_md5.json')))
CODEX_META = json.load(open(P('base/meta_batch2.json')))

def apply_ops(text, ops, name):
    lines = text.split('\n')
    # line-based ops first, against the ORIGINAL line numbers (process from bottom to top)
    line_ops = [o for o in ops if o[0] in ('line', 'after_line')]
    for op in sorted(line_ops, key=lambda o: -o[1]):
        kind, n, prefix, new = op
        cur = lines[n - 1]
        if not cur.startswith(prefix):
            raise SystemExit(f'{name}: line {n} does not start with {prefix!r}: {cur[:80]!r}')
        if kind == 'line':
            lines[n - 1] = new
        else:
            lines[n:n] = new.split('\n')
    out = '\n'.join(lines)
    for op in ops:
        if op[0] != 'frag':
            continue
        _, old, new = op
        c = out.count(old)
        if c != 1:
            raise SystemExit(f'{name}: fragment occurs {c} times: {old[:90]!r}')
        out = out.replace(old, new)
    return out

def udiff(a, b, name):
    return '\n'.join(difflib.unified_diff(a.split('\n'), b.split('\n'), fromfile=f'{name} (base)', tofile=f'{name} (proposed)', lineterm='', n=1)) + '\n'

summary = {'rules': {}, 'codex': {}}
TAG_T, TAG_M, TAG_L = '$sod_txt$', '$sod_meta$', '$sod_lbl$'

def q(tag, s):
    if tag in s:
        raise SystemExit(f'dollar tag {tag} occurs in text')
    return f'{tag}{s}{tag}'

# ---------- rules ----------
def meta_transform(rid, m):
    m = copy.deepcopy(m)
    adv = ["READY_FOR_APPROVAL", "BUNDLE_WITH", "BLOCKED_BY", "SAFE_INDEPENDENT_WAITING_RUNTIME", "DO_NOT_RELEASE_SUPERSEDED/PARKED"]
    alias = {"AUTO_RELEASE_NOW": "READY_FOR_APPROVAL"}
    decision = "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת."
    if rid == 'deploy_on_request':
        m['release_preconditions'] = m.pop('auto_release_preconditions')
        m['standing_auto_release'] = False
        m['separate_taale_required'] = True
        m['explicit_approval_required_per_action'] = True
        m['merge_is_not_deploy'] = True
        m['release_advice_states'] = adv
        m['release_advice_state_aliases'] = alias
        m['explicit_human_gate_remaining'] = [x for x in m['explicit_human_gate_remaining'] if x != 'legacy_to_2029_cutover']
        m['human_gate_v4'] = 'ZURIEL 2026-11-10'
        m['v4_explicit_release_approval'] = {
            'decision_text': decision, 'decided_at': '2026-11-10',
            'supersedes': 'v2 standing authorization (§§1, 2, 8)',
            'active_product': '2029', 'production_since': '2026-11-04', 'legacy_retired': '2026-11-05',
            'procedure_ref': 'CLAUDE.md — נוהל פריסה ל-Production מסשן ענן',
            'owner_check': 'EXTEND_EXISTING', 'no_new_system': True}
    elif rid == 'inter_agent_coordination_law':
        m['v12_2029_temporary_legacy_boundary'] = {**m['v12_2029_temporary_legacy_boundary'], 'status': 'HISTORICAL_PRE_CUTOVER', 'superseded_by': 'v18_2029_production_explicit_release'}
        m['v13_auto_release'] = {**m['v13_auto_release'], 'status': 'STANDING_AUTO_RELEASE_REVOKED_2026-11-10', 'superseded_by': 'v18_2029_production_explicit_release'}
        m['v18_2029_production_explicit_release'] = {
            'human_gate': 'ZURIEL 2026-11-10', 'decision_text': decision,
            'current_production': '2029', 'production_since': '2026-11-04', 'legacy_retired': '2026-11-05',
            'legacy_is_current_production_runtime': False, 'standing_auto_release': False,
            'explicit_approval_per_merge_and_deploy': True,
            'release_advice_states': adv, 'release_advice_state_aliases': alias,
            'label_corrected': "label read 'v16' while rule_version was 17",
            'owner_check': 'EXTEND_EXISTING', 'no_new_system': True}
    elif rid == 'foundation_closure_protocol_law':
        m['v6_auto_release_binding'] = {**m['v6_auto_release_binding'], 'status': 'STANDING_AUTO_RELEASE_REVOKED_2026-11-10', 'superseded_by': 'v8_explicit_release_approval_binding'}
        m['command_semantics'] = {**m['command_semantics'], 'taale': 'explicit_approval_for_exact_presented_scope'}
        m['v8_explicit_release_approval_binding'] = {
            'human_gate': 'ZURIEL 2026-11-10', 'standing_auto_release': False,
            'explicit_approval_per_merge_and_deploy': True, 'no_skip_unchanged': True,
            'owner_check': 'EXTEND_EXISTING', 'no_new_system': True}
    elif rid == 'system_suggestions_law':
        m['human_gate_v6_release'] = {
            'human_gate': 'ZURIEL 2026-11-10', 'decision_text': decision,
            'changed': ['§19: release reuses deploy_on_request (active version) only with explicit approval',
                        'SystemSuggestionsTab.jsx marked removed (5.11.2026, #1239)'],
            'owner_check': 'EXTEND_EXISTING', 'no_new_system': True}
    return m

def rule_sql(rid, n, base_text, new_text, base_meta_md5, new_meta, label):
    meta_json = json.dumps(new_meta, ensure_ascii=False, sort_keys=True)
    return f"""
-- ── {rid}: v{n} → v{n+1} ───────────────────────────────────────────────
do $sod_p0$
declare
  v_base public.nodes%rowtype;
  v_new_id uuid;
begin
  select * into v_base from public.nodes
   where type='rule' and rule_id='{rid}' and is_active for update;
  if not found then raise exception 'P0 {rid}: no active version (drift)'; end if;
  if v_base.rule_version <> {n} then raise exception 'P0 {rid}: active version is v% (expected v{n})', v_base.rule_version; end if;
  if md5(v_base.description) <> '{md5(base_text)}' then raise exception 'P0 {rid}: description drift (md5 %)', md5(v_base.description); end if;
  if md5(v_base.metadata::text) <> '{base_meta_md5}' then raise exception 'P0 {rid}: metadata drift (md5 %)', md5(v_base.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='{rid}' and rule_version > {n}) then
    raise exception 'P0 {rid}: a version above v{n} already exists';
  end if;
  update public.nodes set is_active=false where id=v_base.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', {q(TAG_L, label)}, {q(TAG_T, new_text)}, {q(TAG_M, meta_json)}::jsonb, true, '{rid}', {n+1},
          v_base.depends_on, {n}, v_base.weight, v_base.hebrew_date, v_base.axis_theme, v_base.gallery_id, v_base.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> '{md5(new_text)}' then
    raise exception 'P0 {rid}: new description md5 mismatch';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='{rid}' and is_active) <> 1 then
    raise exception 'P0 {rid}: active version count is not 1';
  end if;
end
$sod_p0$;
"""

def rule_rollback_sql(rid, n):
    return f"""
-- rollback {rid}: v{n+1} → v{n} (no row is deleted; v{n+1} stays as an inactive row)
do $sod_rb$
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='{rid}' and rule_version={n+1} and is_active) then
    raise exception 'rollback {rid}: v{n+1} is not the active version'; end if;
  update public.nodes set is_active=false where type='rule' and rule_id='{rid}' and rule_version={n+1};
  update public.nodes set is_active=true  where type='rule' and rule_id='{rid}' and rule_version={n};
end
$sod_rb$;
"""

sql_parts, rb_parts = [], []

# deploy_on_request: full rewrite of the active text, v3 canary block kept verbatim (one wording fix)
rid, n = 'deploy_on_request', 3
base = rd(f'base/rules/{rid}@v{n}.txt'); bl = base.split('\n')
assert bl[16].startswith('[UPDATE v3 · G3_RELIABILITY_PRECLOSE'), bl[16][:60]
canary = '\n'.join(bl[16:])
assert canary.count('AUTO-RELEASE PREFLIGHT (v2 §5)') == 1
canary = canary.replace('AUTO-RELEASE PREFLIGHT (v2 §5)', 'RELEASE PREFLIGHT (§5)')
new = rd(f'new/rules/{rid}@v4.head.txt').rstrip('\n') + '\n\n' + canary
label = '⛔ Release v4 — Explicit Approval per Merge & Deployment · No Standing Authorization'
specs = [(rid, n, base, new, label)]
for rid2, spec in RULES.items():
    n2 = spec['base_version']; b2 = rd(f'base/rules/{rid2}@v{n2}.txt')
    specs.append((rid2, n2, b2, apply_ops(b2, spec['ops'], rid2), spec['label']))

for rid, n, base, new, label in specs:
    bmeta = json.load(open(P(f'base/meta/{rid}@v{n}.json')))
    nmeta = meta_transform(rid, bmeta)
    wr(f'new/rules/{rid}@v{n+1}.txt', new)
    wr(f'new/rules/{rid}@v{n+1}.meta.json', json.dumps(nmeta, ensure_ascii=False, indent=1, sort_keys=True))
    wr(f'diff/rule_{rid}_v{n}_to_v{n+1}.diff', udiff(base, new, f'nodes:{rid}@v{n}→v{n+1}.description'))
    mdiff = udiff(json.dumps(bmeta, ensure_ascii=False, indent=1, sort_keys=True), json.dumps(nmeta, ensure_ascii=False, indent=1, sort_keys=True), f'nodes:{rid}@v{n}→v{n+1}.metadata')
    wr(f'diff/rule_{rid}_v{n}_to_v{n+1}.metadata.diff', mdiff)
    sql_parts.append(rule_sql(rid, n, base, new, DB_META_MD5[f'{rid}@v{n}'], nmeta, label))
    rb_parts.append(rule_rollback_sql(rid, n))
    summary['rules'][rid] = {'from': n, 'to': n + 1, 'base_md5': md5(base), 'new_md5': md5(new), 'base_len': len(base), 'new_len': len(new),
                             'base_meta_md5_db': DB_META_MD5[f'{rid}@v{n}'], 'label': label}

# ---------- codex ----------
def codex_sql(cid, slug, base, new):
    return f"""
-- ── project_codex #{cid} {slug} ────────────────────────────────────────
do $sod_p0$
declare v_body text;
begin
  select body into v_body from public.project_codex where id={cid} and slug='{slug}' for update;
  if not found then raise exception 'P0 codex {slug}: row missing'; end if;
  if md5(v_body) <> '{md5(base)}' then raise exception 'P0 codex {slug}: body drift (md5 %)', md5(v_body); end if;
  update public.project_codex set body={q(TAG_T, new)}, updated_at=now() where id={cid};
  if (select md5(body) from public.project_codex where id={cid}) <> '{md5(new)}' then raise exception 'P0 codex {slug}: new body md5 mismatch'; end if;
end
$sod_p0$;
"""
def codex_rb(cid, slug, base, new):
    return f"""
-- rollback project_codex #{cid} {slug}: restore the exact base body (md5 {md5(base)})
do $sod_rb$
begin
  if (select md5(body) from public.project_codex where id={cid}) <> '{md5(new)}' then raise exception 'rollback codex {slug}: body is not the applied version'; end if;
  update public.project_codex set body={q(TAG_T, base)}, updated_at=now() where id={cid};
end
$sod_rb$;
"""

cx = []
b4 = rd('base/codex/04_publishing_conventions.txt')
cx.append((4, 'publishing_conventions', b4, apply_ops(b4, CODEX[4]['ops'], 'publishing_conventions')))
b9 = rd('base/codex/09_branches_deploy.txt'); l9 = b9.split('\n')
assert l9[43] == '## F11 proof', l9[43]
f11 = '\n'.join(l9[44:53])
new9 = rd('new/codex/09_branches_deploy.head.txt').rstrip('\n') + '\n' + f11 + '\n' + rd('new/codex/09_branches_deploy.tail.txt').rstrip('\n')
cx.append((9, 'branches_deploy', b9, new9))
for cid, slug, base, new in cx:
    wr(f'new/codex/{cid:02d}_{slug}.txt', new)
    wr(f'diff/codex_{cid:02d}_{slug}.diff', udiff(base, new, f'project_codex#{cid}:{slug}.body'))
    sql_parts.append(codex_sql(cid, slug, base, new))
    rb_parts.append(codex_rb(cid, slug, base, new))
    summary['codex'][slug] = {'id': cid, 'base_md5': md5(base), 'new_md5': md5(new), 'base_len': len(base), 'new_len': len(new)}

HDR = """-- SOD1820 · P0 release policy — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 10–11.11.2026 against origin/main 932aba4bdd8eaa7030c57932ce9606f9ca5ebe18 and the live DB rows read the same day.
-- Requires ZURIEL's explicit approval of this exact file (md5 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Every block refuses to run if the live row differs from the reviewed base (md5 guards) and verifies the result md5.
-- Version bumps follow the existing mechanism: old active row -> is_active=false, new row v+1 with supersedes_version=v
-- (trg_rule_compaction_integrity_guard_v1 validates; governed metadata is carried over). Nothing is deleted.
"""
wr('sql/10_p0_release_policy.sql', HDR + 'begin;\n' + ''.join(sql_parts) + '\ncommit;\n')
wr('sql/19_p0_release_policy_ROLLBACK.sql', HDR.replace('P0 release policy — PROPOSAL ONLY', 'P0 release policy ROLLBACK — PROPOSAL ONLY') + 'begin;\n' + ''.join(reversed(rb_parts)) + '\ncommit;\n')
wr('out/p0_summary.json', json.dumps(summary, ensure_ascii=False, indent=1))
print(json.dumps(summary, ensure_ascii=False, indent=1))
