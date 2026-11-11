"""Shared helpers for building guarded, NOT-EXECUTED SQL proposals from verified local copies of live rows."""
import json, hashlib, difflib, os, copy

EX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def P(*a): return os.path.join(EX, *a)
def md5(s): return hashlib.md5(s.encode('utf-8')).hexdigest()
def rd(p): return open(P(p), encoding='utf-8').read()
def wr(p, s):
    os.makedirs(os.path.dirname(P(p)), exist_ok=True)
    open(P(p), 'w', encoding='utf-8').write(s)

DB_META_MD5 = json.load(open(P('base/meta/_db_meta_md5.json')))
TAG_T, TAG_M, TAG_L = '$sod_txt$', '$sod_meta$', '$sod_lbl$'

def q(tag, s):
    if tag in s:
        raise SystemExit(f'dollar tag {tag} occurs in text')
    return f'{tag}{s}{tag}'

def apply_ops(text, ops, name):
    lines = text.split('\n')
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
        if op[0] == 'frag':
            _, old, new = op
            c = out.count(old)
            if c != 1:
                raise SystemExit(f'{name}: fragment occurs {c} times: {old[:90]!r}')
            out = out.replace(old, new)
        elif op[0] == 'append':
            out = out.rstrip('\n') + op[1]
    return out

def udiff(a, b, name):
    return '\n'.join(difflib.unified_diff(a.split('\n'), b.split('\n'), fromfile=f'{name} (base)', tofile=f'{name} (proposed)', lineterm='', n=1)) + '\n'

def rule_sql(tag, rid, n, base_text, new_text, base_meta_md5, new_meta, label):
    meta_json = json.dumps(new_meta, ensure_ascii=False, sort_keys=True)
    return f"""
-- ── {rid}: v{n} → v{n+1} ───────────────────────────────────────────────
do $sod_blk$
declare
  v_base public.nodes%rowtype;
  v_new_id uuid;
begin
  select * into v_base from public.nodes
   where type='rule' and rule_id='{rid}' and is_active for update;
  if not found then raise exception '{tag} {rid}: no active version (drift)'; end if;
  if v_base.rule_version <> {n} then raise exception '{tag} {rid}: active version is v% (expected v{n})', v_base.rule_version; end if;
  if md5(v_base.description) <> '{md5(base_text)}' then raise exception '{tag} {rid}: description drift (md5 %)', md5(v_base.description); end if;
  if md5(v_base.metadata::text) <> '{base_meta_md5}' then raise exception '{tag} {rid}: metadata drift (md5 %)', md5(v_base.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='{rid}' and rule_version > {n}) then
    raise exception '{tag} {rid}: a version above v{n} already exists';
  end if;
  update public.nodes set is_active=false where id=v_base.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', {q(TAG_L, label)}, {q(TAG_T, new_text)}, {q(TAG_M, meta_json)}::jsonb, true, '{rid}', {n+1},
          v_base.depends_on, {n}, v_base.weight, v_base.hebrew_date, v_base.axis_theme, v_base.gallery_id, v_base.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> '{md5(new_text)}' then
    raise exception '{tag} {rid}: new description md5 mismatch';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='{rid}' and is_active) <> 1 then
    raise exception '{tag} {rid}: active version count is not 1';
  end if;
end
$sod_blk$;
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

def codex_sql(tag, cid, slug, base, new):
    return f"""
-- ── project_codex #{cid} {slug} ────────────────────────────────────────
do $sod_blk$
declare v_body text;
begin
  select body into v_body from public.project_codex where id={cid} and slug='{slug}' for update;
  if not found then raise exception '{tag} codex {slug}: row missing'; end if;
  if md5(v_body) <> '{md5(base)}' then raise exception '{tag} codex {slug}: body drift (md5 %)', md5(v_body); end if;
  update public.project_codex set body={q(TAG_T, new)}, updated_at=now() where id={cid};
  if (select md5(body) from public.project_codex where id={cid}) <> '{md5(new)}' then raise exception '{tag} codex {slug}: new body md5 mismatch'; end if;
end
$sod_blk$;
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

def header(title, extra=''):
    return f"""-- SOD1820 · {title} — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 10–11.11.2026 against origin/main 932aba4bdd8eaa7030c57932ce9606f9ca5ebe18 and live DB rows read the same day.
-- Requires ZURIEL's explicit approval of this exact file (md5 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Every block refuses to run if the live row differs from the reviewed base (md5 guards) and verifies its result. Nothing is deleted.
{extra}"""
