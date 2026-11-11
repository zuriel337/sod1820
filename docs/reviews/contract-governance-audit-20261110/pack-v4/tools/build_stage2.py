"""Stage 2/3 proposals (NOT EXECUTED):
  20  number principles carried to active 2029 owners (ד1 → canonical_methods_registry_law v7, ד4 → platform_tiers_law v6)
  21  deactivate the 9 unconditional Legacy specs (bnei_haheichal excluded, ד3)
  22  STALE banners on 4 codex rows (prepend only; body kept)
  30  STAGE 3 — deactivate number_page_law + no_row_without_number_law, only after 20 is applied and verified
"""
import json, os, sys, copy
sys.path.insert(0, os.path.dirname(__file__))
from lib import *

summary = {}

# ---------- 20: principles ----------
PT_APPEND = """

[v6 · Human-Gate ZURIEL · 10.11.2026 (ד4) — NUMBER VISIBLE, DEPTH GATED · carried from number_page_law v1 (14.6.2026) · EXTEND_EXISTING]

19. NUMBER VISIBLE, DEPTH GATED («המספר לא מוסתר, העומק כן»). Carried from number_page_law v1 within its original scope: the display model of foundation numbers and golden entities (especially 1820) and their number pages. A subscription never hides the number itself there: the number, its gematria values, its signatures and its basic DNA stay open to everyone, and the free layer may show a bounded sample of its matches. What a subscription opens is depth — for example advanced AI analysis, all graph paths, a personal message from the data, rare cross-references, unlimited journeys and depth reports. People do not pay to see the secret; they pay to go deeper into it.
20. CARRY-OVER BOUNDARY. Only the access principle of number_page_law v1 is carried, without widening it to other numbers or other gates. Its three-layer page composition, the layer-1 hints, the example quota (~20 of 250 matches) and the tier name are not carried: page composition belongs to the current Number/Experience owners; quotas, plan names and prices remain future Human-Gate product decisions (§18). The tier name «בני ההיכל» is not carried (ZURIEL 11.11.2026: the name will be replaced; the new name awaits a Human-Gate decision).
21. NO PERMISSION CHANGE. §§19–20 change no current permission, gate, flag or content lock; they state the invariant that the existing server-authoritative gates (§15) must keep.

OWNER CHECK: EXTEND_EXISTING platform_tiers_law. No new entitlement engine, store, tier or plan."""

CM_V7 = """

[UPDATE v7 · Human-Gate ZURIEL · 10.11.2026 (ד1) — VALUE BESIDE A GEMATRIA MATCH ROW · carried from no_row_without_number_law v1 (7.7.2026) · EXTEND_EXISTING]
26. VALUE BESIDE A GEMATRIA MATCH ROW. Carried from no_row_without_number_law v1 within its original context: lists of expressions, entities or signatures that a surface presents as gematria matches or value connections (as on the convergence page and the «signatures and connected entities» list where the law was born). Every such row shows its gematria value beside it: the stored value, or, when none is stored, the value computed by the canonical engine at render time (as v1 required: calcGem / fn_ragil). A value already stated once for the whole list (such as the page's own number) may be shown once instead of on every row (narrowing per ZURIEL 10.11.2026, ד1).
27. SCOPE AND TRUTH BOUNDARY. §26 does not require a number on rows that are not presented as gematria matches (titles, posts, people, navigation, plain text) — per ZURIEL 10.11.2026 (ד1) it is not a requirement to add a number to every row of every interface — and it does not override the truth discipline for authored content (truth_axes_foundation_law): an authored phrase without an authored value is shown without a number, and an authored value keeps the author's method label and is never re-resolved. The former universal wording («בכל משטח באתר — כל שורה שמציגה ביטוי/ישות/חתימה חייבת להציג לצידה את הערך הגימטרי») and its first implementation (TopicPage, removed 5.11.2026) are history in no_row_without_number_law v1.
OWNER CHECK: EXTEND_EXISTING canonical_methods_registry_law. No new registry/store/engine; formulas, method keys, scannability, verification and entitlement are unchanged."""

PT_HEAD = ("[v6 · 10.11.2026 · ZURIEL (ד4): נוסף §19 «המספר לא מוסתר, העומק כן» — בדגם התצוגה של מספרי יסוד וישויות זהב (במיוחד 1820) מנוי פותח עומק "
           "ואינו מסתיר את המספר, הגימטריות והחתימות. מקור: number_page_law v1. ללא שינוי הרשאות (§21).]\n\n")
CM_HEAD = ("[v7 · 10.11.2026 · ZURIEL (ד1): נוסף §26 — ברשימות שמוצגות כהתאמות גימטריות כל שורה מציגה את ערכה (ערך שמור, או חישוב המנוע הקנוני). "
           "מקור: no_row_without_number_law v1; לא חל על שורות שאינן התאמה (§27).]\n\n")

PRINCIPLES = [
    ('platform_tiers_law', 5, '👑 Access & Entitlement Foundation v6 — Number Visible, Depth Gated · המספר לא מוסתר, העומק כן',
     [('frag', '[v4 · Human-Gate ZURIEL · 17.9.2026 — CAPABILITY PRESERVATION TREE · EXTEND_EXISTING]',
               PT_HEAD + '[v4 · Human-Gate ZURIEL · 17.9.2026 — CAPABILITY PRESERVATION TREE · EXTEND_EXISTING]'),
      ('append', PT_APPEND)],
     lambda m: {**m, 'v6_number_visible_depth_gated': {
         'human_gate': 'ZURIEL 2026-11-10 (ד4)', 'carried_from': 'number_page_law v1 (2026-06-14)',
         'principle': 'המספר לא מוסתר, העומק כן',
         'scope': 'original scope only: foundation numbers and golden entities (especially 1820) and their number pages',
         'not_carried': ['three_layer_page_composition', 'layer1_hints', 'example_quota_20_of_250', 'tier_name_bnei_haheichal'],
         'permission_change': False, 'owner_check': 'EXTEND_EXISTING', 'no_new_system': True}}),
    ('canonical_methods_registry_law', 6, 'רישום השיטות הקנוני v7 — One-Tree Method Presentation + ערך ליד כל שורת התאמה',
     [('frag', 'public.gematria_methods הוא מקור האמת היחיד לזהות ולמחזור-החיים של שיטות גימטריה;',
               CM_HEAD + 'public.gematria_methods הוא מקור האמת היחיד לזהות ולמחזור-החיים של שיטות גימטריה;'),
      ('frag', '(admin_set_lead_ranks / LeadOrderEditor / getAllValuePhrases)',
               '(admin_set_lead_ranks / getAllValuePhrases; the old LeadOrderEditor admin screen was removed on 5.11.2026, the RPC remains)'),
      ('append', CM_V7)],
     lambda m: {**m, 'v7_value_beside_gematria_match_row': {
         'human_gate': 'ZURIEL 2026-11-10 (ד1)', 'carried_from': 'no_row_without_number_law v1 (2026-07-07)',
         'scope': 'original context only: lists of expressions/entities/signatures presented as gematria matches or value connections',
         'value_source': 'stored value, else the canonical engine at render time (as in v1: calcGem / fn_ragil)',
         'narrowing': 'a value stated once for the whole list may be shown once (ZURIEL 2026-11-10, ד1)',
         'truth_boundary': 'truth_axes_foundation_law: authored phrase without authored value shows no number; authored value keeps the author method label; never re-resolved',
         'behavior_change': False, 'owner_check': 'EXTEND_EXISTING', 'no_new_system': True}}),
]
parts, rbs = [], []
for rid, n, label, ops, mfun in PRINCIPLES:
    base = rd(f'base/rules/{rid}@v{n}.txt')
    new = apply_ops(base, ops, rid)
    bmeta = json.load(open(P(f'base/meta/{rid}@v{n}.json')))
    nmeta = mfun(copy.deepcopy(bmeta))
    wr(f'new/rules/{rid}@v{n+1}.txt', new)
    wr(f'new/rules/{rid}@v{n+1}.meta.json', json.dumps(nmeta, ensure_ascii=False, indent=1, sort_keys=True))
    wr(f'diff/rule_{rid}_v{n}_to_v{n+1}.diff', udiff(base, new, f'nodes:{rid}@v{n}→v{n+1}.description'))
    wr(f'diff/rule_{rid}_v{n}_to_v{n+1}.metadata.diff', udiff(json.dumps(bmeta, ensure_ascii=False, indent=1, sort_keys=True), json.dumps(nmeta, ensure_ascii=False, indent=1, sort_keys=True), f'nodes:{rid}@v{n}→v{n+1}.metadata'))
    parts.append(rule_sql('S20', rid, n, base, new, DB_META_MD5[f'{rid}@v{n}'], nmeta, label))
    rbs.append(rule_rollback_sql(rid, n))
    summary[rid] = {'from': n, 'to': n + 1, 'base_md5': md5(base), 'new_md5': md5(new), 'label': label}
wr('sql/20_number_principles_to_2029_owners.sql', header('ד1+ד4 — number principles carried to active 2029 owners') + 'begin;\n' + ''.join(parts) + '\ncommit;\n')
wr('sql/29_number_principles_ROLLBACK.sql', header('ROLLBACK of 20_number_principles_to_2029_owners.sql') + 'begin;\n' + ''.join(reversed(rbs)) + '\ncommit;\n')

# ---------- 21: 9 Legacy specs ----------
specs = json.load(open(P('base/spec/_specs.json')))
retire = [s for s in specs if not s['label'].startswith('בני ההיכל')]
assert len(retire) == 9, len(retire)
vals = ',\n    '.join(f"('{s['id']}'::uuid, '{s['d_md5']}', {q('$sod_lbl$', s['label'])})" for s in retire)
spec_sql = header('Legacy retirement — deactivate 9 unconditional spec rows (bnei_haheichal excluded per ד3)',
  '-- Effect: is_active=false only. label/description/metadata unchanged; the rows stay in public.nodes as history.\n'
  '-- Re-verified at HEAD 932aba4bd and in the live DB on 11.11.2026: zero consumers (code, CI, docs, DB functions, views, edges; no reader of type=\'spec\').\n') + f"""begin;
do $sod_blk$
declare
  r record; n int;
begin
  for r in select * from (values
    {vals}
  ) as t(id, d_md5, label) loop
    perform 1 from public.nodes where id=r.id and type='spec' and is_active and label=r.label and md5(coalesce(description,''))=r.d_md5 for update;
    if not found then raise exception 'S21 spec drift or missing: % (%)', r.label, r.id; end if;
  end loop;
  if exists (select 1 from public.nodes where type='spec' and label like 'בני ההיכל%' and not is_active) then
    raise exception 'S21: bnei_haheichal must stay untouched';
  end if;
  update public.nodes set is_active=false
   where type='spec' and is_active and id in ({', '.join(f"'{s['id']}'" for s in retire)});
  get diagnostics n = row_count;
  if n <> 9 then raise exception 'S21: expected 9 rows, updated %', n; end if;
  if (select count(*) from public.nodes where type='spec' and is_active) <> 1 then raise exception 'S21: exactly one spec (bnei_haheichal) must remain active'; end if;
end
$sod_blk$;
commit;
"""
wr('sql/21_retire_9_legacy_specs.sql', spec_sql)
wr('sql/28_retire_9_legacy_specs_ROLLBACK.sql', header('ROLLBACK of 21_retire_9_legacy_specs.sql') + f"""begin;
update public.nodes set is_active=true where type='spec' and not is_active and id in ({', '.join(f"'{s['id']}'" for s in retire)});
commit;
""")
summary['specs_retire'] = [{'id': s['id'], 'label': s['label'], 'd_md5': s['d_md5']} for s in retire]

# ---------- 22: STALE banners ----------
BANNER = ("⚠️ STALE (סומן לפי הכרעת צוריאל 10.11.2026 · פרישת Legacy) — התוכן להלן משקף את האתר הראשון (Legacy) נכון ל-14.6.2026 בלבד ולא אומת מאז. "
          "Legacy פרש ב-5.11.2026; 2029 הוא המוצר הפעיל היחיד. קרא כרקע/כוונה מקורית, לא כמצב נוכחי. מצב נוכחי: SOD1820_MASTER_STATE.md ב-main + סכמת ה-DB החיה + work_log.")
NOTES = {
    2: 'project_overview', 3: 'data_model_map', 8: 'system_rules_index', 13: 'number_page_1820'}
EXTRA = {
    2: ' תיקון לעובדות למטה: מיזוג ל-main אינו פורס; פריסת Production היא פעולה נפרדת לקומיט מדויק, באישור מפורש של צוריאל (deploy_on_request, הגרסה הפעילה; codex branches_deploy). אתר ה-WordPress המקורי הוחלף ביוני 2026.',
    3: ' המספרים בשורה (למשל ~1181 פוסטים) הם של 14.6.2026; מבנה הטבלאות עשוי להיות שונה כיום — לבדוק בסכמה החיה.',
    8: ' רכיבי הקוד הנזכרים (למשל VerifiedBadge.jsx, InsightCard.jsx) אינם קיימים עוד, וחלק מהחוקים כאן אינם פעילים. רשימת החוקים הפעילים: nodes (type=\'rule\' AND is_active) + SOD1820_MASTER_OWNER_INDEX.md.',
    13: ' זו תאומה של number_page_law (14.6.2026). העיקרון «המספר לא מוסתר, העומק כן» מועבר ל-platform_tiers_law (דוח ממשל החוזים 10–11.11.2026); הרכב שלוש השכבות כאן אינו מחייב את דף המספר של 2029.',
}
cparts, crbs = [], []
for cid, slug in NOTES.items():
    base = rd(f'base/codex/{cid:02d}_{slug}.txt')
    assert not base.startswith('⚠️ STALE'), slug
    new = BANNER + EXTRA[cid] + '\n\n---\n\n' + base
    wr(f'new/codex/{cid:02d}_{slug}.txt', new)
    wr(f'diff/codex_{cid:02d}_{slug}.diff', udiff(base, new, f'project_codex#{cid}:{slug}.body'))
    cparts.append(codex_sql('S22', cid, slug, base, new))
    crbs.append(codex_rb(cid, slug, base, new))
    summary['codex_' + slug] = {'id': cid, 'base_md5': md5(base), 'new_md5': md5(new)}
wr('sql/22_codex_stale_banners.sql', header('STALE banners on 4 Legacy-era codex rows (prepend only; history and references kept)') + 'begin;\n' + ''.join(cparts) + '\ncommit;\n')
wr('sql/27_codex_stale_banners_ROLLBACK.sql', header('ROLLBACK of 22_codex_stale_banners.sql') + 'begin;\n' + ''.join(reversed(crbs)) + '\ncommit;\n')

# ---------- 30: STAGE 3 retirement of the two number laws ----------
npl, nrw = rd('base/rules/number_page_law@v1.txt'), rd('base/rules/no_row_without_number_law@v1.txt')
s30 = header('STAGE 3 — deactivate number_page_law v1 and no_row_without_number_law v1',
  '-- RUN ONLY AFTER 20_number_principles_to_2029_owners.sql was applied AND verified (successor checks below enforce it).\n'
  '-- Effect: is_active=false only (number_page_law carries metadata.immutable=true — its row content is not touched). Provenance lives in the successors\' metadata and in the BEFORE/AFTER work_log.\n') + f"""begin;
do $sod_blk$
declare n int;
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='platform_tiers_law' and is_active and rule_version >= 6
                  and description like '%NUMBER VISIBLE, DEPTH GATED%' and metadata ? 'v6_number_visible_depth_gated') then
    raise exception 'S30: successor missing — platform_tiers_law v6 §19 not active'; end if;
  if not exists (select 1 from public.nodes where type='rule' and rule_id='canonical_methods_registry_law' and is_active and rule_version >= 7
                  and description like '%VALUE BESIDE A GEMATRIA MATCH ROW%' and metadata ? 'v7_value_beside_gematria_match_row') then
    raise exception 'S30: successor missing — canonical_methods_registry_law v7 §26 not active'; end if;
  perform 1 from public.nodes where type='rule' and rule_id='number_page_law' and rule_version=1 and is_active and md5(description)='{md5(npl)}' for update;
  if not found then raise exception 'S30: number_page_law v1 drift or not active'; end if;
  perform 1 from public.nodes where type='rule' and rule_id='no_row_without_number_law' and rule_version=1 and is_active and md5(description)='{md5(nrw)}' for update;
  if not found then raise exception 'S30: no_row_without_number_law v1 drift or not active'; end if;
  update public.nodes set is_active=false
   where type='rule' and is_active and ((rule_id='number_page_law' and rule_version=1) or (rule_id='no_row_without_number_law' and rule_version=1));
  get diagnostics n = row_count;
  if n <> 2 then raise exception 'S30: expected 2 rows, updated %', n; end if;
end
$sod_blk$;
commit;
"""
wr('sql/30_STAGE3_retire_number_laws.sql', s30)
wr('sql/39_STAGE3_retire_number_laws_ROLLBACK.sql', header('ROLLBACK of 30_STAGE3_retire_number_laws.sql') + """begin;
update public.nodes set is_active=true where type='rule' and not is_active and rule_version=1 and rule_id in ('number_page_law','no_row_without_number_law');
commit;
""")
summary['stage3'] = {'number_page_law_md5': md5(npl), 'no_row_without_number_law_md5': md5(nrw)}
wr('out/stage2_summary.json', json.dumps(summary, ensure_ascii=False, indent=1))
print(json.dumps(summary, ensure_ascii=False, indent=1)[:2500])
