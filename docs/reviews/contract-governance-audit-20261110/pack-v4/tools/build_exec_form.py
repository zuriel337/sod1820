#!/usr/bin/env python3
"""Build the EXECUTION FORM of 10_p0_release_policy.sql and of its rollback 19_.

Source of truth = the approved artifact 10_ itself (literals and md5s parsed from it) plus the reviewed base
texts in exec/base (md5-verified live on 11.11.2026). The execution form is ONE plpgsql DO statement that
rebuilds every new text from the md5-guarded live base by exact-once fragment replacement and refuses unless
the rebuilt text has the same md5, SHA-256 and length as the literal in 10_.

usage:  build_exec_form.py extract   -> out/exec_extract.json  (for the metadata-delta step in PGlite)
        build_exec_form.py build     -> sql/10e_…, sql/19e_…, out/exec_form_summary.json
"""
import difflib, hashlib, json, os, re, sys

EX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(EX, *a)
SRC10 = P("sql", "10_p0_release_policy.sql")
SRC19 = P("sql", "19_p0_release_policy_ROLLBACK.sql")
OUT10 = P("sql", "10e_p0_release_policy_EXEC.sql")
OUT19 = P("sql", "19e_p0_release_policy_ROLLBACK_EXEC.sql")
md5 = lambda s: hashlib.md5(s.encode("utf-8")).hexdigest()
sha = lambda s: hashlib.sha256(s.encode("utf-8")).hexdigest()
sha_file = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()
read = lambda p: open(p, encoding="utf-8").read()

RULE_ORDER = ["deploy_on_request", "inter_agent_coordination_law", "foundation_closure_protocol_law", "system_suggestions_law"]
ALIAS = {"deploy_on_request": "dor", "inter_agent_coordination_law": "iac", "foundation_closure_protocol_law": "fcp", "system_suggestions_law": "ssl"}
CODEX = [(4, "publishing_conventions"), (9, "branches_deploy")]
EXPECT_SHA10 = "d1ac658b6e2ace922ac5d32a3021f6ef8aa88dc06390b05aca095da0d48963fb"
EXPECT_SHA19 = "cbe420f72e2ad43bcf244aee1e49dd363ead9f4d1b499000c2ebc3adc0b0d9c4"


def one(pattern, text, what):
    m = re.findall(pattern, text, re.S)
    if len(m) != 1:
        raise SystemExit(f"parse: expected exactly one {what}, got {len(m)}")
    return m[0]


def extract():
    if sha_file(SRC10) != EXPECT_SHA10 or sha_file(SRC19) != EXPECT_SHA19:
        raise SystemExit("source SQL SHA-256 differs from the approved files")
    t = read(SRC10)
    blocks = re.findall(r"do \$sod_p0\$\n(.*?)\nend\n\$sod_p0\$;", t, re.S)
    if len(blocks) != 6:
        raise SystemExit(f"parse: expected 6 DO blocks, got {len(blocks)}")
    rules, codex = {}, {}
    for b in blocks[:4]:
        rid = one(r"rule_id='([a-z_]+)' and is_active for update", b, "rule id")
        base_v = int(one(r"v_base\.rule_version <> (\d+) then", b, "base version"))
        r = {
            "rule_id": rid, "from": base_v,
            "base_desc_md5": one(r"md5\(v_base\.description\) <> '([0-9a-f]{32})'", b, "desc guard"),
            "base_meta_md5": one(r"md5\(v_base\.metadata::text\) <> '([0-9a-f]{32})'", b, "meta guard"),
            "label": one(r"\$sod_lbl\$(.*?)\$sod_lbl\$", b, "label"),
            "desc": one(r"\$sod_txt\$(.*?)\$sod_txt\$", b, "description literal"),
            "meta_literal": one(r"\$sod_meta\$(.*?)\$sod_meta\$", b, "metadata literal"),
            "to": int(one(r"::jsonb, true, '[a-z_]+', (\d+),", b, "new version")),
            "new_desc_md5": one(r"md5\(description\) from public\.nodes where id=v_new_id\) <> '([0-9a-f]{32})'", b, "new md5"),
            "after_meta": one(r"\$sod_meta\$::jsonb, true, '[a-z_]+', \d+,\n\s+(v_base\.depends_on, \d+, v_base\.weight, v_base\.hebrew_date, v_base\.axis_theme, v_base\.gallery_id, v_base\.identity_key)\)", b, "tail"),
        }
        if r["to"] != base_v + 1 or md5(r["desc"]) != r["new_desc_md5"]:
            raise SystemExit(f"parse: {rid} literal md5/version inconsistent")
        base = read(P("base", "rules", f"{rid}@v{base_v}.txt"))
        if md5(base) != r["base_desc_md5"]:
            raise SystemExit(f"base file of {rid} does not match the 10_ guard")
        r["base_meta_file"] = P("base", "meta", f"{rid}@v{base_v}.json")
        rules[rid] = r
    for b, (cid, slug) in zip(blocks[4:], CODEX):
        if f"where id={cid} and slug='{slug}' for update" not in b:
            raise SystemExit(f"parse: codex block order differs ({cid})")
        c = {
            "id": cid, "slug": slug,
            "base_md5": one(r"if md5\(v_body\) <> '([0-9a-f]{32})'", b, "codex guard"),
            "body": one(r"set body=\$sod_txt\$(.*?)\$sod_txt\$, updated_at=now\(\) where id=\d+;", b, "codex body"),
            "new_md5": one(r"where id=\d+\) <> '([0-9a-f]{32})' then raise exception 'P0 codex [a-z_]+: new body md5 mismatch'", b, "codex new md5"),
        }
        base = read(P("base", "codex", f"{cid:02d}_{slug}.txt"))
        if md5(base) != c["base_md5"] or md5(c["body"]) != c["new_md5"]:
            raise SystemExit(f"codex {slug}: base/new md5 inconsistent with 10_")
        codex[slug] = c
    out = {"rules": rules, "codex": codex}
    json.dump(out, open(P("out", "exec_extract.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for rid, r in rules.items():
        print(f"{rid}: v{r['from']}→v{r['to']} desc {r['base_desc_md5']}→{r['new_desc_md5']}")
    for slug, c in codex.items():
        print(f"codex {slug}: {c['base_md5']}→{c['new_md5']}")
    return out


# ── exact-once fragment replacement, identical to the plpgsql loop ───────────────────────────────────────────
def apply_ops(text, ops):
    for k, (old, new) in enumerate(ops, 1):
        pos = text.find(old)
        if pos < 0:
            raise ValueError(f"fragment {k} not found")
        if text.find(old, pos + 1) >= 0:
            raise ValueError(f"fragment {k} not unique")
        text = text[:pos] + new + text[pos + len(old):]
    return text


def make_ops(base, new, ctx0=24, gap=60, cap=4000):
    """Minimal exact-once (old, new) pairs turning base into new."""
    bl, nl = base.splitlines(keepends=True), new.splitlines(keepends=True)
    boff = [0]
    for x in bl: boff.append(boff[-1] + len(x))
    noff = [0]
    for x in nl: noff.append(noff[-1] + len(x))
    spans = []
    sm = difflib.SequenceMatcher(None, bl, nl, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        bs, be, ns, ne = boff[i1], boff[i2], noff[j1], noff[j2]
        ob, nb = base[bs:be], new[ns:ne]
        # trim the common prefix / suffix of the changed block (character level)
        p = 0
        while p < len(ob) and p < len(nb) and ob[p] == nb[p]:
            p += 1
        s = 0
        while s < len(ob) - p and s < len(nb) - p and ob[len(ob) - 1 - s] == nb[len(nb) - 1 - s]:
            s += 1
        spans.append([bs + p, be - s, ns + p, ne - s])
    # merge spans separated by a short equal gap
    merged = []
    for sp in spans:
        if merged and sp[0] - merged[-1][1] < gap:
            merged[-1][1], merged[-1][3] = sp[1], sp[3]
        else:
            merged.append(sp)
    ctx = [ctx0] * len(merged)
    for _ in range(200):
        ops, bounds, ok = [], [], True
        for k, (bs, be, ns, ne) in enumerate(merged):
            c = ctx[k]
            lo, hi = max(0, bs - c), min(len(base), be + c)
            # base[lo:bs] == new[ns-(bs-lo):ns] and base[be:hi] == new[ne:ne+(hi-be)] (equal regions)
            ops.append((base[lo:hi], new[ns - (bs - lo):ne + (hi - be)]))
            bounds.append((lo, hi))
        # neighbouring anchors must not overlap
        for k in range(1, len(bounds)):
            if bounds[k][0] < bounds[k - 1][1]:
                a, b = merged[k - 1], merged[k]
                merged[k - 1] = [a[0], b[1], a[2], b[3]]
                del merged[k]; del ctx[k]
                ok = False
                break
        if not ok:
            continue
        try:
            got = apply_ops(base, ops)
        except ValueError as e:
            k = int(str(e).split()[1]) - 1
            if ctx[k] >= cap:
                raise
            ctx[k] = ctx[k] * 2
            continue
        if got != new:
            raise SystemExit("fragment application does not reproduce the new text")
        return ops
    raise SystemExit("could not build unique fragments")


TAG = "$sod_frag$"
OUTER = "$sod_p0e$"
OUTER_RB = "$sod_rbe$"


def q(s, tag=TAG):
    for bad in (TAG, OUTER, OUTER_RB, "$sod_lbl$", "$sod_meta$"):
        if bad in s:
            raise SystemExit(f"dollar tag {bad} occurs inside a literal")
    return f"{tag}{s}{tag}"


def ops_sql(ops, indent="    "):
    rows = [f"{indent}{q(o)}, {q(n)}" for o, n in ops]
    return "array[\n" + ",\n".join(rows) + "\n  ]"


APPLY = """  for i in 1 .. coalesce(array_length(v_ops, 1), 0) by 2 loop
    v_pos := strpos(v_txt, v_ops[i]);
    if v_pos = 0 then raise exception 'P0e %: fragment % not found', v_tgt, (i + 1) / 2; end if;
    if strpos(substr(v_txt, v_pos + 1), v_ops[i]) > 0 then raise exception 'P0e %: fragment % not unique', v_tgt, (i + 1) / 2; end if;
    v_txt := overlay(v_txt placing v_ops[i + 1] from v_pos for char_length(v_ops[i]));
  end loop;"""

CHECK = """  if md5(v_txt) <> '{m}' or encode(sha256(convert_to(v_txt, 'UTF8')), 'hex') <> '{s}' or char_length(v_txt) <> {n} then
    raise exception 'P0e %: rebuilt text differs from the approved literal of 10_ (md5 %)', v_tgt, md5(v_txt);
  end if;"""


def invisible(s):
    bad = []
    for ch in set(s):
        o = ord(ch)
        if ch in "\n":
            continue
        if o < 32 or o == 127 or 0x200B <= o <= 0x200F or 0x202A <= o <= 0x202E or 0x2060 <= o <= 0x2069 or o == 0xFEFF or o == 0xA0 or o == 0x00AD:
            bad.append(f"U+{o:04X}")
    return sorted(bad)


def build():
    x = json.load(open(P("out", "exec_extract.json"), encoding="utf-8"))
    md = json.load(open(P("out", "meta_delta.json"), encoding="utf-8"))
    rules, codex = x["rules"], x["codex"]
    summary = {"source_10_sha256": EXPECT_SHA10, "source_19_sha256": EXPECT_SHA19, "targets": {}}
    fwd, rev = {}, {}
    for rid in RULE_ORDER:
        r = rules[rid]
        base = read(P("base", "rules", f"{rid}@v{r['from']}.txt"))
        fwd[rid] = make_ops(base, r["desc"])
        summary["targets"][rid] = {
            "from": r["from"], "to": r["to"], "fragments": len(fwd[rid]),
            "base": {"md5": md5(base), "sha256": sha(base), "len": len(base)},
            "new": {"md5": md5(r["desc"]), "sha256": sha(r["desc"]), "len": len(r["desc"])},
            "meta_new_md5": md["rules"][rid]["new_md5"], "meta_removed": md["rules"][rid]["removed"],
            "fragment_chars": sum(len(o) + len(n) for o, n in fwd[rid]),
        }
    for cid, slug in CODEX:
        c = codex[slug]
        base = read(P("base", "codex", f"{cid:02d}_{slug}.txt"))
        fwd[slug] = make_ops(base, c["body"])
        rev[slug] = make_ops(c["body"], base)
        summary["targets"][f"codex:{slug}"] = {
            "id": cid, "fragments": len(fwd[slug]), "rollback_fragments": len(rev[slug]),
            "base": {"md5": md5(base), "sha256": sha(base), "len": len(base)},
            "new": {"md5": md5(c["body"]), "sha256": sha(c["body"]), "len": len(c["body"])},
            "fragment_chars": sum(len(o) + len(n) for o, n in fwd[slug]),
            "rollback_fragment_chars": sum(len(o) + len(n) for o, n in rev[slug]),
        }
    allfrag = "".join(o + n for v in list(fwd.values()) + list(rev.values()) for o, n in v)
    summary["invisible_or_control_chars_in_fragments"] = invisible(allfrag)

    # ── 10e ───────────────────────────────────────────────────────────────────────────────────────────────
    L = []
    L.append("-- SOD1820 · P0 release policy — EXECUTION FORM of 10_p0_release_policy.sql. PROPOSAL ONLY. NOT EXECUTED.")
    L.append(f"-- Approved content: 10_p0_release_policy.sql SHA-256 {EXPECT_SHA10}.")
    L.append("-- Same six targets, same base guards, same end state: every rebuilt text must equal the literal of 10_")
    L.append("-- (md5 + SHA-256 + length) and every new metadata must equal the 10_ literal (md5 of jsonb text), or nothing changes.")
    L.append("-- ONE statement (a single DO block, no BEGIN/COMMIT): atomic on its own, so an error at any point, a refused")
    L.append("-- guard or a cut-off text leaves the database unchanged. Requires ZURIEL's explicit approval of this exact file")
    L.append("-- (SHA-256 in the handoff report) for one run (CLAUDE.md §0.4). Nothing is deleted.")
    L.append(f"do {OUTER}")
    L.append("declare")
    for rid in RULE_ORDER:
        L.append(f"  v_{ALIAS[rid]} public.nodes%rowtype;")
    L.append("  v_c4 text; v_c9 text; v_txt text; v_meta jsonb; v_ops text[]; v_pos int; i int; v_new_id uuid; v_tgt text;")
    L.append("begin")
    L.append("  -- A. lock and verify all six live rows before any write (same guards and messages as 10_)")
    for rid in RULE_ORDER:
        r, a = rules[rid], ALIAS[rid]
        L.append(f"  select * into v_{a} from public.nodes where type='rule' and rule_id='{rid}' and is_active for update;")
        L.append(f"  if not found then raise exception 'P0 {rid}: no active version (drift)'; end if;")
        L.append(f"  if v_{a}.rule_version <> {r['from']} then raise exception 'P0 {rid}: active version is v% (expected v{r['from']})', v_{a}.rule_version; end if;")
        L.append(f"  if md5(v_{a}.description) <> '{r['base_desc_md5']}' then raise exception 'P0 {rid}: description drift (md5 %)', md5(v_{a}.description); end if;")
        L.append(f"  if md5(v_{a}.metadata::text) <> '{r['base_meta_md5']}' then raise exception 'P0 {rid}: metadata drift (md5 %)', md5(v_{a}.metadata::text); end if;")
        L.append(f"  if exists (select 1 from public.nodes where type='rule' and rule_id='{rid}' and rule_version > {r['from']}) then raise exception 'P0 {rid}: a version above v{r['from']} already exists'; end if;")
    for cid, slug in CODEX:
        c = codex[slug]
        L.append(f"  select body into v_c{cid} from public.project_codex where id={cid} and slug='{slug}' for update;")
        L.append(f"  if not found then raise exception 'P0 codex {slug}: row missing'; end if;")
        L.append(f"  if md5(v_c{cid}) <> '{c['base_md5']}' then raise exception 'P0 codex {slug}: body drift (md5 %)', md5(v_c{cid}); end if;")
    for n, rid in enumerate(RULE_ORDER):
        r, a, m = rules[rid], ALIAS[rid], md["rules"][rid]
        t = summary["targets"][rid]["new"]
        L.append("")
        L.append(f"  -- {chr(66 + n)}. {rid}: v{r['from']} → v{r['to']} ({len(fwd[rid])} fragments)")
        L.append(f"  v_tgt := '{rid}'; v_txt := v_{a}.description;")
        L.append(f"  v_ops := {ops_sql(fwd[rid])};")
        L.append(APPLY)
        L.append(CHECK.format(m=t["md5"], s=t["sha256"], n=t["len"]))
        removed = "array[" + ", ".join(f"'{k}'" for k in m["removed"]) + "]::text[]" if m["removed"] else None
        basem = f"(v_{a}.metadata - {removed})" if removed else f"v_{a}.metadata"
        L.append(f"  v_meta := {basem} || $sod_meta${m['delta']}$sod_meta$::jsonb;")
        L.append(f"  if md5(v_meta::text) <> '{m['new_md5']}' then raise exception 'P0e %: rebuilt metadata differs from 10_ (md5 %)', v_tgt, md5(v_meta::text); end if;")
        L.append(f"  update public.nodes set is_active=false where id=v_{a}.id;")
        L.append("  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)")
        L.append(f"  values ('rule', $sod_lbl${r['label']}$sod_lbl$, v_txt, v_meta, true, '{rid}', {r['to']},")
        L.append(f"          {r['after_meta'].replace('v_base.', f'v_{a}.')})")
        L.append("  returning id into v_new_id;")
        L.append(f"  if (select md5(description) from public.nodes where id=v_new_id) <> '{r['new_desc_md5']}' then raise exception 'P0 {rid}: new description md5 mismatch'; end if;")
        L.append(f"  if (select count(*) from public.nodes where type='rule' and rule_id='{rid}' and is_active) <> 1 then raise exception 'P0 {rid}: active version count is not 1'; end if;")
    for n, (cid, slug) in enumerate(CODEX):
        c = codex[slug]
        t = summary["targets"][f"codex:{slug}"]["new"]
        L.append("")
        L.append(f"  -- {chr(70 + n)}. project_codex #{cid} {slug} ({len(fwd[slug])} fragments)")
        L.append(f"  v_tgt := 'codex {slug}'; v_txt := v_c{cid};")
        L.append(f"  v_ops := {ops_sql(fwd[slug])};")
        L.append(APPLY)
        L.append(CHECK.format(m=t["md5"], s=t["sha256"], n=t["len"]))
        L.append(f"  update public.project_codex set body=v_txt, updated_at=now() where id={cid};")
        L.append(f"  if (select md5(body) from public.project_codex where id={cid}) <> '{c['new_md5']}' then raise exception 'P0 codex {slug}: new body md5 mismatch'; end if;")
    L.append("")
    L.append("  -- H. final cross-check of the whole end state")
    for rid in RULE_ORDER:
        r = rules[rid]
        L.append(f"  if (select count(*) from public.nodes where type='rule' and rule_id='{rid}' and is_active and rule_version={r['to']} and supersedes_version={r['from']} and md5(description)='{r['new_desc_md5']}' and md5(metadata::text)='{md['rules'][rid]['new_md5']}') <> 1 then raise exception 'P0e final: {rid} v{r['to']} not in place'; end if;")
        L.append(f"  if (select count(*) from public.nodes where type='rule' and rule_id='{rid}' and rule_version={r['from']} and not is_active and md5(description)='{r['base_desc_md5']}') <> 1 then raise exception 'P0e final: {rid} v{r['from']} not kept as inactive history'; end if;")
    for cid, slug in CODEX:
        L.append(f"  if (select md5(body) from public.project_codex where id={cid}) <> '{codex[slug]['new_md5']}' then raise exception 'P0e final: codex {slug} not in place'; end if;")
    L.append("  raise notice 'P0e applied: deploy_on_request v4, inter_agent_coordination_law v18, foundation_closure_protocol_law v8, system_suggestions_law v6, codex #4, codex #9';")
    L.append("end")
    L.append(f"{OUTER};")
    open(OUT10, "w", encoding="utf-8").write("\n".join(L) + "\n")

    # ── 19e ───────────────────────────────────────────────────────────────────────────────────────────────
    R = []
    R.append("-- SOD1820 · P0 release policy ROLLBACK — EXECUTION FORM of 19_p0_release_policy_ROLLBACK.sql. PROPOSAL ONLY. NOT EXECUTED.")
    R.append(f"-- Approved content: 19_p0_release_policy_ROLLBACK.sql SHA-256 {EXPECT_SHA19}.")
    R.append("-- Same guards and end state as 19_: codex #9/#4 bodies back to the exact base (md5 + SHA-256 + length), updated_at=now();")
    R.append("-- v4/v18/v8/v6 deactivated and v3/v17/v7/v5 reactivated (the new rows stay as inactive history; nothing is deleted).")
    R.append("-- Additionally refuses unless each base row exists with its base md5, and verifies one active base version per rule.")
    R.append("-- ONE statement (a single DO block). Requires ZURIEL's explicit approval of this exact file for one run.")
    R.append(f"do {OUTER_RB}")
    R.append("declare v_txt text; v_ops text[]; v_pos int; i int; v_tgt text;")
    R.append("begin")
    R.append("  -- A. verify the applied state of all six before any write")
    for cid, slug in [(9, "branches_deploy"), (4, "publishing_conventions")]:
        R.append(f"  perform 1 from public.project_codex where id={cid} for update;")
        R.append(f"  if (select md5(body) from public.project_codex where id={cid}) <> '{codex[slug]['new_md5']}' then raise exception 'rollback codex {slug}: body is not the applied version'; end if;")
    for rid in reversed(RULE_ORDER):
        r = rules[rid]
        R.append(f"  perform 1 from public.nodes where type='rule' and rule_id='{rid}' for update;")
        R.append(f"  if not exists (select 1 from public.nodes where type='rule' and rule_id='{rid}' and rule_version={r['to']} and is_active) then raise exception 'rollback {rid}: v{r['to']} is not the active version'; end if;")
        R.append(f"  if (select count(*) from public.nodes where type='rule' and rule_id='{rid}' and rule_version={r['from']} and not is_active and md5(description)='{r['base_desc_md5']}') <> 1 then raise exception 'rollback {rid}: base v{r['from']} row missing or changed'; end if;")
    for n, (cid, slug) in enumerate([(9, "branches_deploy"), (4, "publishing_conventions")]):
        t = summary["targets"][f"codex:{slug}"]["base"]
        R.append("")
        R.append(f"  -- {chr(66 + n)}. project_codex #{cid} {slug}: restore the exact base body ({len(rev[slug])} fragments)")
        R.append(f"  v_tgt := 'rollback codex {slug}'; select body into v_txt from public.project_codex where id={cid};")
        R.append(f"  v_ops := {ops_sql(rev[slug])};")
        R.append(APPLY)
        R.append(CHECK.format(m=t["md5"], s=t["sha256"], n=t["len"]).replace("the approved literal of 10_", "the base body"))
        R.append(f"  update public.project_codex set body=v_txt, updated_at=now() where id={cid};")
    R.append("")
    R.append("  -- D. rules: deactivate the new version, reactivate the base version (same order as 19_)")
    for rid in reversed(RULE_ORDER):
        r = rules[rid]
        R.append(f"  update public.nodes set is_active=false where type='rule' and rule_id='{rid}' and rule_version={r['to']};")
        R.append(f"  update public.nodes set is_active=true  where type='rule' and rule_id='{rid}' and rule_version={r['from']};")
    R.append("")
    R.append("  -- E. final cross-check")
    for rid in RULE_ORDER:
        r = rules[rid]
        R.append(f"  if (select count(*) from public.nodes where type='rule' and rule_id='{rid}' and is_active and rule_version={r['from']} and md5(description)='{r['base_desc_md5']}') <> 1 or (select count(*) from public.nodes where type='rule' and rule_id='{rid}' and is_active) <> 1 then raise exception 'rollback final: {rid} base v{r['from']} not the single active version'; end if;")
    for cid, slug in CODEX:
        R.append(f"  if (select md5(body) from public.project_codex where id={cid}) <> '{codex[slug]['base_md5']}' then raise exception 'rollback final: codex {slug} not restored'; end if;")
    R.append("  raise notice 'P0e rolled back: v3/v17/v7/v5 active again, codex #4/#9 base bodies restored';")
    R.append("end")
    R.append(f"{OUTER_RB};")
    open(OUT19, "w", encoding="utf-8").write("\n".join(R) + "\n")

    for p in (OUT10, OUT19):
        s = read(p)
        heb = sum(1 for ch in s if "֐" <= ch <= "׿"); asc = sum(1 for ch in s if ord(ch) < 128)
        summary[os.path.basename(p)] = {"sha256": sha_file(p), "md5": hashlib.md5(open(p, "rb").read()).hexdigest(),
                                        "bytes": os.path.getsize(p), "chars": len(s),
                                        "est_tokens": int(asc / 3.8 + heb / 1.6 + (len(s) - heb - asc)),
                                        "statements": 1}
    json.dump(summary, open(P("out", "exec_form_summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in summary.items() if k != "targets"}, ensure_ascii=False, indent=1))
    for k, v in summary["targets"].items():
        print(k, {kk: vv for kk, vv in v.items() if kk in ("fragments", "rollback_fragments", "fragment_chars", "rollback_fragment_chars")})


if __name__ == "__main__":
    {"extract": extract, "build": build}[sys.argv[1]]()
