#!/usr/bin/env python3
"""Full wording after SQL 10: complete texts of deploy_on_request v4 and codex #9, every changed paragraph (new side,
complete line) of v18 / v8 / v6 / codex #4, and the permission flags of the new metadata. Source = literals of 10_."""
import difflib, hashlib, json, os

EX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(EX, *a)
read = lambda p: open(p, encoding="utf-8").read()
md5 = lambda s: hashlib.md5(s.encode()).hexdigest()
sha = lambda s: hashlib.sha256(s.encode()).hexdigest()
x = json.load(open(P("out", "exec_extract.json"), encoding="utf-8"))
R, C = x["rules"], x["codex"]

def fence(t):
    f = "````" if "```" in t else "```"
    return f"{f}text\n{t.rstrip(chr(10))}\n{f}"

def changed_lines(base, new):
    bl, nl = base.split("\n"), new.split("\n")
    out = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, bl, nl, autojunk=False).get_opcodes():
        if tag == "equal":
            continue
        out.append((j1 + 1, j2, nl[j1:j2], i2 - i1))
    return out

L = ["# SQL 10 — הנוסח המלא אחרי השינוי (נבנה מהליטרלים של `10_p0_release_policy.sql`, SHA-256 `d1ac658b…`)", "",
     "כל טקסט כאן הוא בדיוק מה שייכתב למסד. טביעת האצבע מופיעה ליד כל יעד, כך שאפשר לבדוק את הטקסט מול המסד אחרי ההרצה. ‏`10e_` מייצר בדיוק את אותם טקסטים.", ""]

def head(title, s):
    return [f"## {title}", f"md5 `{md5(s)}` · SHA-256 `{sha(s)}` · {len(s):,} תווים", ""]

r = R["deploy_on_request"]
L += head(f"1. deploy_on_request v4 — הנוסח המלא · תווית: «{r['label']}»", r["desc"])
L += [fence(r["desc"]), ""]
meta = json.loads(r["meta_literal"])
keys = ["standing_auto_release", "separate_taale_required", "explicit_approval_required_per_action", "merge_is_not_deploy", "human_gate_v4",
        "release_preconditions", "explicit_human_gate_remaining", "release_advice_states", "release_advice_state_aliases", "v4_explicit_release_approval"]
L += ["**דגלי ההרשאה במטא־דאטה החדשה** (md5 של jsonb ‏`" + json.load(open(P("out", "meta_delta.json")))["rules"]["deploy_on_request"]["new_md5"] + "`):", "",
      fence(json.dumps({k: meta.get(k) for k in keys}, ensure_ascii=False, indent=1)), "",
      "הוסר מהמטא־דאטה: `auto_release_preconditions` (הוחלף ב־`release_preconditions`, אותם שבעה תנאים).", ""]

for n, rid in [(2, "inter_agent_coordination_law"), (3, "foundation_closure_protocol_law"), (4, "system_suggestions_law")]:
    r = R[rid]
    base = read(P("base", "rules", f"{rid}@v{r['from']}.txt"))
    L += head(f"{n}. {rid} v{r['to']} — כל פסקה שהשתנתה, בנוסחה המלא החדש · תווית: «{r['label']}»", r["desc"])
    for j1, j2, lines, removed in changed_lines(base, r["desc"]):
        rng = f"שורה {j1}" if j2 == j1 else f"שורות {j1}–{j2}"
        if not lines:
            L += [f"*({removed} שורות הוסרו לפני שורה {j1} בטקסט החדש)*", ""]
            continue
        L += [f"**{rng}** (מחליפות {removed} שורות בבסיס):", "", fence("\n".join(lines)), ""]
    m = json.loads(r["meta_literal"])
    newk = {"inter_agent_coordination_law": ["v18_2029_production_explicit_release", "v13_auto_release", "v12_2029_temporary_legacy_boundary"],
            "foundation_closure_protocol_law": ["v8_explicit_release_approval_binding", "v6_auto_release_binding", "command_semantics"],
            "system_suggestions_law": ["human_gate_v6_release"]}[rid]
    L += ["**המטא־דאטה של ההרשאה:**", "", fence(json.dumps({k: m.get(k) for k in newk}, ensure_ascii=False, indent=1)), ""]

c = C["branches_deploy"]
L += head("5. project_codex #9 branches_deploy — הגוף המלא החדש", c["body"])
L += [fence(c["body"]), ""]
c = C["publishing_conventions"]
base = read(P("base", "codex", "04_publishing_conventions.txt"))
L += head("6. project_codex #4 publishing_conventions — כל שורה שהשתנתה, בנוסחה המלא החדש", c["body"])
for j1, j2, lines, removed in changed_lines(base, c["body"]):
    rng = f"שורה {j1}" if j2 == j1 else f"שורות {j1}–{j2}"
    L += [f"**{rng}** (מחליפות {removed} שורות בבסיס):", "", fence("\n".join(lines)), ""]
L += ["שאר 72,978 התווים של הקודקס זהים לבסיס.", ""]
open(P("out", "SQL10_permissions_after.md"), "w", encoding="utf-8").write("\n".join(L))
print("written", len("\n".join(L)), "chars")
