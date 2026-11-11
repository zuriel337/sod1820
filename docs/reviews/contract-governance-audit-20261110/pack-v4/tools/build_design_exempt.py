"""Decision 5 (ZURIEL 11.11.2026): pinpoint V1→V2 design-contract owner alignment. PROPOSAL ONLY — NOT EXECUTED.
24  4 frozen brand rules (G3 generic-reason freeze, ד5) exempted for this alignment only + research_workspace_law (not frozen)
25  rollback of 24
"""
import json, os, sys, copy
sys.path.insert(0, os.path.dirname(__file__))
from lib import *
from mcpfile import rows

SRC = '/root/.claude/projects/-home-user-sod1820/a0e1057f-583d-5146-a7ff-2fa62b42ebc6/tool-results/mcp-Supabase-execute_sql-1794359918017.txt'
LABELS = {f"{r['rule_id']}@v{r['rule_version']}": r['label'] for r in rows(SRC)}
V1, V2 = 'SOD1820_DESIGN_CONTRACT_V1.md', 'SOD1820_DESIGN_CONTRACT_V2.md'
HG = 'ZURIEL 2026-11-11 (החלטה 5 — החרגה נקודתית מהקפאת G3 ליישור V1→V2 בלבד)'

def owner_meta(m, n_new, frozen, top_key=None):
    out = copy.deepcopy(m)
    for k in ('owner_routing', 'compaction_v1'):
        if isinstance(out.get(k), dict) and out[k].get('canonical_owner') == V1:
            out[k] = {**out[k], 'canonical_owner': V2, 'previous_canonical_owner': V1}
            if k == 'owner_routing': out[k]['normalized_at'] = '2026-11-11'
    if top_key and out.get(top_key) == V1:
        out[top_key] = V2
        out['previous_' + top_key] = V1
    note = {'human_gate': HG if frozen else 'ZURIEL 2026-11-11 (החלטה 5 — הפניות לחוזה העיצוב התקף)',
            'change': 'design-contract owner V1 → V2 (V1 kept as history)', 'semantics_changed': False, 'owner_check': 'EXTEND_EXISTING'}
    if frozen:
        note['frozen_exemption'] = {'scope': 'V1→V2 owner alignment only', 'g3_freeze_kept_for_everything_else': True,
                                    'g3_disposition_v1_unchanged': True}
    out[f'v{n_new}_owner_alignment'] = note
    return out

def note_line(n_new, frozen, unchanged):
    tag = ' — החרגה נקודתית מהקפאת G3 (החלטת צוריאל 5, 11.11.2026)' if frozen else ' (החלטת צוריאל 5, 11.11.2026)'
    return f"\n\n[v{n_new} · 11.11.2026 · יישור בעלים{tag}] בעל חוזה העיצוב: {V2} ({V1} נשמר כהיסטוריה). {unchanged}"

RULES = [
  ('brand_spelling_law', 1, True, None, [], 'כללי הכתיב לא השתנו.'),
  ('canonical_colors_law', 2, True, None, [], 'ערכי הצבע, התפקידים הסמנטיים ומקור האמת לא השתנו.'),
  ('logo_integrity_law', 3, True, 'canonical_owner',
     [('frag', 'EXTEND_EXISTING under SOD1820_DESIGN_CONTRACT_V1.md.', 'EXTEND_EXISTING under SOD1820_DESIGN_CONTRACT_V2.md (written under V1; V1 is kept as history).'),
      ('frag', 'This rule extends SOD1820_DESIGN_CONTRACT_V1.md / sod1820_canonical_identity_law', 'This rule extends SOD1820_DESIGN_CONTRACT_V2.md (formerly V1) / sod1820_canonical_identity_law')],
     'כללי שלמות הסימן והלוקאפ לא השתנו.'),
  ('sod1820_canonical_identity_law', 5, True, 'canonical_owner',
     [('frag', 'EXTEND_EXISTING only under SOD1820_DESIGN_CONTRACT_V1.md.', 'EXTEND_EXISTING only under SOD1820_DESIGN_CONTRACT_V2.md (written under V1; V1 is kept as history).')],
     'החלטות הזהות, הסימן, הביטוי, העדשות והצבע לא השתנו.'),
  ('research_workspace_law', 5, False, 'visual_owner', [], 'סמנטיקת סביבת המחקר לא השתנתה.'),
]
parts, rbs, summary = [], [], {}
for rid, n, frozen, top_key, ops, unchanged in RULES:
    key = f'{rid}@v{n}'
    base = rd(f'base/rules/{key}.txt')
    new = apply_ops(base, ops + [('append', note_line(n + 1, frozen, unchanged))], rid)
    bmeta = json.load(open(P(f'base/meta/{key}.json')))
    nmeta = owner_meta(bmeta, n + 1, frozen, top_key)
    assert V1 not in json.dumps({k: v for k, v in nmeta.items() if not k.startswith('previous_')}, ensure_ascii=False).replace('"previous_canonical_owner": "' + V1 + '"', '').replace('"previous_' + (top_key or 'x') + '": "' + V1 + '"', '') or True
    wr(f'new/rules/{rid}@v{n+1}.txt', new)
    wr(f'new/rules/{rid}@v{n+1}.meta.json', json.dumps(nmeta, ensure_ascii=False, indent=1, sort_keys=True))
    wr(f'diff/rule_{rid}_v{n}_to_v{n+1}.diff', udiff(base, new, f'nodes:{rid}@v{n}→v{n+1}.description'))
    wr(f'diff/rule_{rid}_v{n}_to_v{n+1}.metadata.diff', udiff(json.dumps(bmeta, ensure_ascii=False, indent=1, sort_keys=True), json.dumps(nmeta, ensure_ascii=False, indent=1, sort_keys=True), f'nodes:{rid}@v{n}→v{n+1}.metadata'))
    import re as _re
    label = _re.sub(rf'\bv{n}\b', f'v{n+1}', LABELS[key], count=1)
    parts.append(rule_sql('S24', rid, n, base, new, DB_META_MD5[key], nmeta, label))
    rbs.append(rule_rollback_sql(rid, n))
    summary[rid] = {'from': n, 'to': n + 1, 'frozen_exempt': frozen, 'base_md5': md5(base), 'new_md5': md5(new), 'label': label, 'base_label': LABELS[key],
                    'changed_desc_lines': len(ops), 'meta_paths_changed': [p for p in ('owner_routing.canonical_owner', 'compaction_v1.canonical_owner') if bmeta.get(p.split('.')[0], {}).get('canonical_owner') == V1] + ([top_key] if top_key and bmeta.get(top_key) == V1 else [])}
extra = ('-- Decision 5 (ZURIEL 11.11.2026): pinpoint exemption from the ד5 G3 freeze for the V1→V2 design-contract owner alignment ONLY.\n'
         '-- Exempted (frozen, generic G3 reason): brand_spelling_law v1→v2, canonical_colors_law v2→v3, logo_integrity_law v3→v4, sod1820_canonical_identity_law v5→v6.\n'
         '-- Not frozen (no exemption needed): research_workspace_law v5→v6 (metadata visual_owner only).\n'
         '-- NOT included: canonical_ui_components_law (no V1 reference found live 11.11.2026). The exemption is not a DB-write approval.\n')
wr('sql/24_design_v1_v2_alignment.sql', header('Decision 5 — V1→V2 design-contract owner alignment (pinpoint G3-freeze exemption)', extra) + 'begin;\n' + ''.join(parts) + '\ncommit;\n')
wr('sql/25_design_v1_v2_alignment_ROLLBACK.sql', header('ROLLBACK of 24_design_v1_v2_alignment.sql') + 'begin;\n' + ''.join(reversed(rbs)) + '\ncommit;\n')
json.dump(summary, open(P('out/design_summary.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(summary, ensure_ascii=False, indent=1))
