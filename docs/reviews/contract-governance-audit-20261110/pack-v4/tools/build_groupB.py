"""Group B (shared contracts) DB proposals — NOT EXECUTED. Non-frozen rules + codex rows only (ד5 freeze respected)."""
import json, os, sys, copy
sys.path.insert(0, os.path.dirname(__file__))
from lib import *

RULES = [
  ('worlds_color_law', 1, 'חוק צבעי העולמות v2 — פלטה גלובלית אחידה · בעלים: Design Contract V2',
   [('append', "\n\n[v2 · 11.11.2026 · יישור בעלים] בעל החוזה: SOD1820_DESIGN_CONTRACT_V2.md (V1 הוחלף והוא היסטוריה בלבד). ערכי הצבע ומקור האמת src/lib/worlds.js לא השתנו.")],
   lambda m: {**m,
              'owner_routing': {**m['owner_routing'], 'canonical_owner': 'SOD1820_DESIGN_CONTRACT_V2.md', 'previous_canonical_owner': 'SOD1820_DESIGN_CONTRACT_V1.md', 'normalized_at': '2026-11-11'},
              'compaction_v1': {**m['compaction_v1'], 'canonical_owner': 'SOD1820_DESIGN_CONTRACT_V2.md', 'previous_canonical_owner': 'SOD1820_DESIGN_CONTRACT_V1.md'},
              'v2_owner_alignment': {'human_gate': 'ZURIEL 2026-11-10 (§4 shared contracts)', 'change': 'canonical owner V1 → V2; values unchanged', 'owner_check': 'EXTEND_EXISTING'}}),
  ('subscription_funnel_law', 22, '🧲 חוק מנוע-המשפך — Follow → הרשמה לאורח / ערוצים לרשום (v23 · יישור להסרת Legacy)',
   [('frag', '(UserCenter)', '(UserCenter — רכיב Legacy שהוסר ב-5.11.2026; האזור האישי ב-2029: /2029/me/*)'),
    ('frag', '(ToolActions/QuickActions · הוסף למחקר/ספרייה)', '(ToolActions/QuickActions — הוסרו ב-5.11.2026 · הוסף למחקר/ספרייה)'),
    ('frag', '【שערי-הרשמה שכבר קיימים — לא לבנות חדשים, לחבר אליהם】',
             '【שערי-הרשמה שכבר קיימים — לא לבנות חדשים, לחבר אליהם】 [עדכון 11.11.2026: מתוך הרשימה שלהלן קיימים ב-2029 רק MaintenanceLock ו-SubscribeGate; CollectiveBadge, ForumThreadPage, Discourse, SubmitChidush, RecentSearches, JoinPage, ProfilePage ו-Navbar הוסרו עם Legacy ב-5.11.2026 — אין לחבר אליהם.]'),
    ('frag', '1. QuickActions שמור/הוסף-למחקר', '1. QuickActions (הוסר ב-5.11.2026) שמור/הוסף-למחקר'),
    ('append', "\n\n[v23 · 11.11.2026 · יישור להסרת Legacy — EXTEND_EXISTING] רכיבים שהוסרו עם Legacy ב-5.11.2026 סומנו במקומם (UserCenter, ToolActions/QuickActions, CollectiveBadge, ForumThreadPage, Discourse, SubmitChidush, RecentSearches, JoinPage, ProfilePage, Navbar). SubscribeGate, MaintenanceLock, WatchButton, ShareActions ו-ResearchProvider (כיום src/lib/research/) קיימים. סמנטיקת המשפך, המעקב, ההסכמה והערוצים לא שונתה.")],
   lambda m: {**m, 'v23_legacy_removal_alignment': {'human_gate': 'ZURIEL 2026-11-10 (§4 shared contracts)', 'semantics_changed': False, 'removed_components_marked': ['UserCenter', 'ToolActions', 'QuickActions', 'CollectiveBadge', 'ForumThreadPage', 'Discourse', 'SubmitChidush', 'RecentSearches', 'JoinPage', 'ProfilePage', 'Navbar'], 'owner_check': 'EXTEND_EXISTING'}}),
  ('experience_governance_foundation_v1_law', 10, 'Experience Governance v11 — Focused Loading, Fresh Core, On-Demand + Legacy removal alignment',
   [('frag', "BrandTicker.jsx's duplicate marquee gets no grandfathering",
             "BrandTicker.jsx's duplicate marquee gets no grandfathering [closed 5.11.2026: BrandTicker.jsx and Marquee.jsx were removed with Legacy]"),
    ('frag', '(BrandTicker fix, any future accessibility law', '(BrandTicker fix — moot since its removal on 5.11.2026, any future accessibility law'),
    ('append', "\n\n[v11 · 11.11.2026 · Legacy removal alignment — EXTEND_EXISTING] The BrandTicker/Marquee open item is closed by the removal of both components on 5.11.2026. No ownership, lifecycle, loading or cutover-gate semantics changed; §8 CAPABILITY PARITY BEFORE RETIREMENT stays in force.")],
   lambda m: {**m, 'v11_legacy_removal_alignment': {'human_gate': 'ZURIEL 2026-11-10 (§4 shared contracts)', 'semantics_changed': False, 'closed_items': ['BrandTicker duplicate marquee (component removed 2026-11-05)'], 'owner_check': 'EXTEND_EXISTING'}}),
  ('identity_architecture_law', 1, 'ארכיטקטורת זהות v2 — UGC + קהילה: אנונימי → מזוהה-רך → חשבון → חוקר → תורם (יישור להסרת Legacy)',
   [('line', 17, "הפיצ'ר הראשון לבנות", "הפיצ'ר הראשון (נבנה — ReportHint.jsx + טבלת community_hints): ➕ דווח רמז"),
    ('line', 20, '- Admin: טאב אישור ב-AdminPage', '- Admin: טאב אישור ב-AdminPage (community_review) — [מסוף הניהול הישן הוסר ב-5.11.2026; מסלול האישור ב-2029 לא אומת בסבב זה]'),
    ('append', "\n\n[v2 · 11.11.2026 · יישור להסרת Legacy] מסלול הזהות והמשמעות לא שונו.")],
   lambda m: {**m, 'v2_legacy_removal_alignment': {'human_gate': 'ZURIEL 2026-11-10 (§4 shared contracts)', 'semantics_changed': False, 'owner_check': 'EXTEND_EXISTING'}}),
]

CODEX = [
  (1, '_index', [
    ('after_line', 39, '- Release/merge/deploy → deploy_on_request',
     "- Product plan and dated decision record («מסמך 37») → project_codex id 37 (sod1820_reality_stream_os_master_v3_20261016_draft): dated records — a later explicit ZURIEL decision supersedes an earlier one; not proof of live state and not release authorization (CLAUDE.md §0.1)."),
    ('frag', '→ reality_graph_law (+ unified_graph_law where referenced).', '→ reality_graph_law (unified_graph_law is inactive — history only).'),
    ('frag', '- Public product language/visual language/typography/icons → SOD1820_DESIGN_CONTRACT_V1.md.',
             '- Public product language/visual language/typography/icons → SOD1820_DESIGN_CONTRACT_V2.md (2029 active; V1 = historical/Legacy provenance).'),
    ('frag', '- Release/merge/deploy → deploy_on_request + live git/deploy state.',
             "- Release/merge/deploy → deploy_on_request (active version) + live git/deploy state; every merge and every Production deployment needs ZURIEL's explicit approval for the specific action (10.11.2026)."),
    ('frag', 'ואת subscribe_gate_law.', 'ואת subscribe_gate_law (כיום לא פעיל — היסטוריה בלבד; השער הקיים SubscribeGate.jsx מתועד ב-subscription_funnel_law).'),
  ]),
  (30, 'experience_governance_foundation_v1', [
    ('frag', 'governs publicIdentity.js/authors.js/community.js/ContributorPage.jsx/ReportHint.jsx/EntityPage.jsx/WelcomePage.jsx.',
             'governs publicIdentity.js/authors.js/community.js/ContributorPage.jsx/ReportHint.jsx/EntityPage.jsx/WelcomePage.jsx [11.11.2026: ContributorPage.jsx, EntityPage.jsx and WelcomePage.jsx were removed with Legacy on 5.11.2026].'),
    ('frag', "3. BrandTicker.jsx's duplicate marquee (violates ticker_marquee_law/canonical_ui_components_law) gets no grandfathering",
             "3. [closed 5.11.2026 — BrandTicker.jsx and Marquee.jsx were removed with Legacy] BrandTicker.jsx's duplicate marquee (violates ticker_marquee_law/canonical_ui_components_law) gets no grandfathering"),
    ('frag', 'DESIGN CROSSWALK (contract section 11): theme.js + lib/palette.js (usePalette) + lib/themeMode.js confirmed',
             'DESIGN CROSSWALK (contract section 11): [11.11.2026: lib/palette.js, lib/themeMode.js and src/components/ui.jsx were removed on 5.11.2026; the 2029 token system is lib/paletteTokens2029.js + lib/palette2029.js + lib/themePreset2029.js under SOD1820_DESIGN_CONTRACT_V2.md; theme.js is a documented removal residue] theme.js + lib/palette.js (usePalette) + lib/themeMode.js confirmed'),
  ]),
  (15, 'convergence_law', [
    ('frag', 'קבצים: src/pages/TopicPage.jsx, src/components/ConvergenceAxis.jsx, src/lib/topicCards.js,',
             '[היסטורי — כל הקבצים ברשימה הוסרו עם Legacy ב-5.11.2026] קבצים: src/pages/TopicPage.jsx, src/components/ConvergenceAxis.jsx, src/lib/topicCards.js,'),
  ]),
  (5, 'gematria_engine', [
    ('frag', '- Legacy GematriaCalculator/GematriaCalculatorLegacy remain compatibility/reference surfaces until cutover; they are not architectural authority for Calculator 2029.',
             '- Legacy GematriaCalculator/GematriaCalculatorLegacy were compatibility/reference surfaces until the cutover and were removed with Legacy on 5.11.2026; Calculator 2029 is the active surface.'),
  ]),
  (12, 'golden_entities', [
    ('frag', 'שכבת זהב משותפת: src/lib/goldTier.js (useGold + sortGoldFirst),',
             '[היסטורי — goldTier.js, GematriaCalculator, GematriaCalculator3D, /cross ודף בית המדרש הישן הוסרו עם Legacy ב-5.11.2026; היישום הנוכחי של «זהב-ראשון» ב-2029 לא אומת בסבב זה] שכבת זהב משותפת: src/lib/goldTier.js (useGold + sortGoldFirst),'),
  ]),
]

summary = {'rules': {}, 'codex': {}}
parts, rbs = [], []
for rid, n, label, ops, mfun in RULES:
    base = rd(f'base/rules/{rid}@v{n}.txt'); new = apply_ops(base, ops, rid)
    bmeta = json.load(open(P(f'base/meta/{rid}@v{n}.json'))); nmeta = mfun(copy.deepcopy(bmeta))
    wr(f'new/rules/{rid}@v{n+1}.txt', new)
    wr(f'new/rules/{rid}@v{n+1}.meta.json', json.dumps(nmeta, ensure_ascii=False, indent=1, sort_keys=True))
    wr(f'diff/rule_{rid}_v{n}_to_v{n+1}.diff', udiff(base, new, f'nodes:{rid}@v{n}→v{n+1}.description'))
    wr(f'diff/rule_{rid}_v{n}_to_v{n+1}.metadata.diff', udiff(json.dumps(bmeta, ensure_ascii=False, indent=1, sort_keys=True), json.dumps(nmeta, ensure_ascii=False, indent=1, sort_keys=True), f'nodes:{rid}@v{n}→v{n+1}.metadata'))
    parts.append(rule_sql('S23', rid, n, base, new, DB_META_MD5[f'{rid}@v{n}'], nmeta, label)); rbs.append(rule_rollback_sql(rid, n))
    summary['rules'][rid] = {'from': n, 'to': n + 1, 'base_md5': md5(base), 'new_md5': md5(new), 'label': label}
for cid, slug, ops in CODEX:
    base = rd(f'base/codex/{cid:02d}_{slug}.txt'); new = apply_ops(base, ops, slug)
    wr(f'new/codex/{cid:02d}_{slug}.txt', new)
    wr(f'diff/codex_{cid:02d}_{slug}.diff', udiff(base, new, f'project_codex#{cid}:{slug}.body'))
    parts.append(codex_sql('S23', cid, slug, base, new)); rbs.append(codex_rb(cid, slug, base, new))
    summary['codex'][slug] = {'id': cid, 'base_md5': md5(base), 'new_md5': md5(new)}
HELD = ("-- Held, NOT in this file: 9 group-B rules frozen by ד5 (canonical_colors_law, logo_integrity_law, brand_spelling_law,\n"
        "-- sod1820_canonical_identity_law, canonical_ui_components_law, reality_stream_law, raziel_voice_law, els_single_engine_law,\n"
        "-- video_transcription_law); unified_tags_law (open decision G5 / PR #1296); P3 wording-only rules without another reason\n"
        "-- to bump (els_research_layer_law, raziel_response_contract).\n")
wr('sql/23_shared_contracts_groupB.sql', header('Group B — shared contracts aligned to the Legacy removal (non-frozen rules + codex)', HELD) + 'begin;\n' + ''.join(parts) + '\ncommit;\n')
wr('sql/26_shared_contracts_groupB_ROLLBACK.sql', header('ROLLBACK of 23_shared_contracts_groupB.sql') + 'begin;\n' + ''.join(reversed(rbs)) + '\ncommit;\n')
wr('out/groupB_summary.json', json.dumps(summary, ensure_ascii=False, indent=1))
print(json.dumps(summary, ensure_ascii=False, indent=1))
