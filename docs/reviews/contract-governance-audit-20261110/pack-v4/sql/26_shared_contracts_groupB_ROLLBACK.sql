-- SOD1820 · ROLLBACK of 23_shared_contracts_groupB.sql — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 10–11.11.2026 against origin/main 932aba4bdd8eaa7030c57932ce9606f9ca5ebe18 and live DB rows read the same day.
-- Requires ZURIEL's explicit approval of this exact file (md5 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Every block refuses to run if the live row differs from the reviewed base (md5 guards) and verifies its result. Nothing is deleted.
begin;

-- rollback project_codex #12 golden_entities: restore the exact base body (md5 b523eba9b6b76085dd3452a37ac790d1)
do $sod_rb$
begin
  if (select md5(body) from public.project_codex where id=12) <> 'fd4711e2e78d330289bceaf297aff9f3' then raise exception 'rollback codex golden_entities: body is not the applied version'; end if;
  update public.project_codex set body=$sod_txt$ישות זהב (metadata.tier=gold) = הדרגה הגבוהה ביותר בתוצאות, מעל weight 1-5 הרגיל. החוק: nodes type=rule, rule_id=golden_entity_law.
סימון: כוכב/סמל זהב + מסגרת זהב, ומוקפצת לראש בכל מקום שמופיע המספר שלה (metadata.value).
מופעים נדרשים: /cross, /number/<value>, דף הישות, וגם פוסט/תגית שמכילים את המספר — בכולם צריך לראות את ישות הזהב.
שמורה אך ורק לפלאים חשבוניים סגורים שאי אפשר לסתור. דרגה עתידית שמורה: tier=diamond (מעל זהב).

חברת הזהב הראשונה: "סוד אלף שמונה מאות עשרים כי לה המלוכה" = 1820 ברגיל (חתימת המערכת; השם המלא של האתר עולה בדיוק למספר הופעות שם ה׳ בתורה). מקושרת ל-gematria_word source='sod1820' (החתימה המקורית של צוריאל). מטא: tier=gold, display='כי לה׳ המלוכה', world='חתימת המערכת', value=1820. בונוס: סידורי=326 (ממספרי ההתכנסות).
זיהוי ב-SQL: select * from nodes where type='entity' and metadata->>'tier'='gold';

ישויות-על / חתימות 1820 (role=signature, world="חתימות 1820", tier=gold): 👑 חתימת האתר "סוד אלף שמונה מאות עשרים כי לה המלוכה"=1820 · 📜 חתימת המחקר "מספר שמות יהוה בכל התורה"=1820 (גם גדול). מתכנסות לאותו מספר = "טבעת חתימות". אזהרת אמת: ערך הגימטריה=עובדה מחושבת; טענה היסטורית נלווית (מספר הופעות בתורה) טעונה מקור נפרד. חוק: golden_entity_law v2.

שכבת זהב משותפת: src/lib/goldTier.js (useGold + sortGoldFirst), מקור יחיד שמזהה tier=gold (labels + values). מוחל ל"זהב-ראשון + כוכב": /cross, דף המספר (מילים שוות), בית המדרש (עוגנים+תגית), GematriaCalculator. נותר להחיל גם על GematriaCalculator3D וחיפוש כללי.

---

## GOLD AXIS MODEL · 604 · Human Gate ZURIEL · 2026-09-23

EXTEND_EXISTING — no Gold store, graph, registry or scoring system.

Gold is not inherited by every numerical match. Gold is Human Curation attached to a qualified core identity/anchor. The surrounding verified calculation relations are witnesses of that Gold axis.

### First canonical example: 604
- Number 604 → tier=gold, role=anchor
- תדר → Gold core identity
- משיח בן דוד → Gold core identity
- canonical engine:
  - תדר = 604 in ragil
  - משיח בן דוד = 604 in misratar
  - משיח בן דוד = 424 in ragil
- existing typed graph edges equals_word and equals_by_depth carry the calculation identity and are curated as gold_witness.

### Growth rule
When new methods/engines/corpus work discover additional verified expressions that converge on 604, those results may automatically join the witness field through the canonical engine/graph/convergence flow. They do not become Gold identities merely by matching 604.

AI may:
- discover a new witness;
- explain which method produced it;
- compare evidence independence/dependency;
- recommend a witness for Human promotion.

AI may not:
- assign tier=gold;
- infer Gold from match count/popularity;
- turn every witness into a core identity.

Only ZURIEL/Human Gate promotes another stable identity/anchor to Gold.

### Projection meaning
A Gold Axis should render as:
core anchor / core identities first → bounded verified witnesses → why this axis matters → next research action.
Do not dump every equality by default. Contextual Prominence / Silence Gate chooses what is worth showing.

### David / Gold semantic calibration
Canonical engine verifies דוד=14 and זהב=14. This is a SOD1820 semantic calibration for the Gold vocabulary, not an automatic rule that every item mentioning David/redemption becomes Gold.


---

## GOLD CORE · דוד / גאולה · Human Gate ZURIEL · 2026-09-23

Approved Gold Core identities:
דוד · גאולה · משיח · בן דוד · משיח בן דוד · תדר · ביאת המשיח · גאולה שלמה · מלך הגאולה · גואל ישראל · שורש דוד בן ישי · התגלות משיח · תשועת יהוה · קיבוץ גלויות · בית המקדש השלישי · תחיית המתים.

These are Human-curated core identities, not automatic outcomes of numeric matching. Each retains its own canonical calculations, provenance, graph relations and truth axes.

Semantic calibration:
- דוד = 14
- זהב = 14
This supports the internal Gold vocabulary of the David/Geula family but does not auto-promote every David/Geula expression.

Witness rule remains:
method-specific equalities / discoveries / crossings may support a Gold identity or Gold Anchor without inheriting tier=gold.


---

## HUMAN CURATION v4 · DIAMOND CROWN / GOLD AXIS · Human Gate ZURIEL · 2026-09-23

### Active hierarchy
- DIAMOND CORE — exceptionally rare Crown Signature identities, Human Gate only.
- DIAMOND WITNESS — typed source/calculation/structure/time/corpus support around a Crown; no tier inheritance.
- GOLD CORE — Human-curated core identity/anchor.
- GOLD WITNESS — typed support around Gold; no tier inheritance.
- SILVER — preserved legacy curation; meaning TBD after census.
- REGULAR — all other qualified identities/findings remain fully valid in the One Reality Graph.

### Current Diamond Crown
Crown Anchor: 1820.
Exactly two Diamond Core identities:
1. סוד אלף שמונה מאות עשרים כי לה המלוכה
2. מספר שמות יהוה בכל התורה

The Number 1820 is Crown Anchor, not a third Diamond.

### Current 1820 Diamond Witness classes
- SOURCE — אהבת תורה, HebrewBooks 5635, p.6 / DS-01: book subtotals 165+398+311+396+550=1820.
- CALCULATION / STRUCTURE — סוד=70 and יהוה=26 → 70×26=1820, plus governed arithmetic relations.
- TIME / REVELATION — עת, המשיח בימינו, זה היום עשה יהוה at 1820 through canonical methods.
- CORPUS GEMATRIA CLUSTER — seven independently replayed regular-gematria expressions at 1820 from post 5009.
- SPATIAL STRUCTURE — Birkat Kohanim outer-frame sum = 1820 in regular gematria.

These Witnesses strengthen/explain the Crown but remain their native Source/Finding/Calculation identities. They do not become Diamond Core and do not inherit tier=diamond.

### Growth law
Future verified 1820 hits may join the Diamond Witness field through existing Engine/Graph/Research flows. They remain witnesses until ZURIEL explicitly promotes a stable identity to Diamond Core. No amount of match count automatically creates a new Diamond.


---

## GOLD NUMBER ANCHORS · CORE IDENTITY SPLIT · Human Gate ZURIEL · 2026-09-23

Semantic lock:
- Gold Entity = stable semantic core identity; role=core_identity.
- Gold Number Anchor = numeric research center; type=number, tier=gold, role=anchor.
- Witness = typed relation/finding that states how an identity reaches a Number Anchor, preserving exact method/source/provenance.
- Crown Anchor = higher presentation role currently used by 1820; the number itself is not a Diamond Core identity.

Approved Gold Number Anchors:
14 · 45 · 358 · 424 · 604 · 776 · 1202.

Current examples:
- דוד —[רגיל]→ 14
- גאולה —[רגיל]→ 45
- משיח —[רגיל]→ 358
- משיח בן דוד —[רגיל]→ 424
- משיח בן דוד —[מסתתר]→ 604
- תדר —[רגיל]→ 604
- ביאת המשיח —[רגיל]→ 776
- התגלות משיח / תשועת יהוה —[רגיל]→ 1202

Numbers 140 · 420 · 581 · 1192 · 1323 · 1516 remain ordinary Number identities for now even though a Gold Core Identity currently has that value. A Gold Entity does not automatically promote its numeric value to a Gold Number Anchor.

14 is explicitly anchored as 14 = דוד = זהב. Canonical engine replay verified דוד=14 and זהב=14 in regular Gematria.

One identity may connect to several Number Anchors through different methods. One Number Anchor may gather several identities. Number and identity never collapse into each other.


---

## 2029 PROJECTION CONTRACT · CURATION MARKS / TREASURES · Human Gate ZURIEL · 2026-09-24

This is presentation-only and 2029-only.

- Diamond Core identity: always exposes Diamond mark when the identity is surfaced.
- Gold Core identity: always exposes Gold mark when the identity is surfaced.
- Gold Number Anchor: exposes Gold Anchor mark when the Number itself is surfaced as a curated research center.
- Crown Anchor 1820: crown-anchor presentation; never counted/rendered as a third Diamond identity.
- Diamond/Gold Witness: does not inherit Core tier mark; may expose a secondary “linked to / witness of” hint.
- Clicking a curation mark explains the class, why it was curated, its Anchor/Core relation and a bounded witness preview.
- Full collection is on-demand and grouped separately: Diamonds / Gold Core / Number Anchors. Witnesses stay contextual under the selected item. Silver is omitted until its semantics are decided.
- Number2029 remains compact: local curation only + one disclosure entry; never dump the full global collection into the page.

Global projection reads the existing One Reality Graph and curation metadata. It creates no new store.
$sod_txt$, updated_at=now() where id=12;
end
$sod_rb$;

-- rollback project_codex #5 gematria_engine: restore the exact base body (md5 f4202db738aae4e67297eb673378e00a)
do $sod_rb$
begin
  if (select md5(body) from public.project_codex where id=5) <> 'e7bd907a3585c990bfac0c2805188f24' then raise exception 'rollback codex gematria_engine: body is not the applied version'; end if;
  update public.project_codex set body=$sod_txt$G2 FINAL COMPACTION · Human-Gate ZURIEL · 15.9.2026

PURPOSE
`project_codex.gematria_engine` owns deterministic Gematria execution/verification routing. It is not the Method Registry and it no longer carries a fixed method count or duplicate method-definition catalog.

CURRENT OWNER TREE
- Method identity / labels / lifecycle-capable metadata: `public.gematria_methods`, governed by active `canonical_methods_registry_law` (current v5).
- Method lifecycle: `method_lifecycle`.
- Execution/scanning authority: `engine_governance_registry_authority_law`.
- Canonical execution/verification gate: active `gematria_engine_law` (current v2) + registered SQL/function execution path.
- System/ZURIEL numeric research operators that are not Gematria-method identity live under `project_codex.numeric_rule_family_index`, not in this engine body.

NO FIXED METHOD COUNT
The engine must resolve the live Registry; it must never assume “8 methods” or another hard-coded total. Registered != executable != engine_verified != active != scannable != published. The Registry owns those distinctions.

METHOD DEFINITION ONCE
Exact current method identity/behavior metadata comes from `gematria_methods` and canonical execution/Trace: `method_key`, `display_label`, mathematical family, word-boundary behavior, final-letter sensitivity, derived/dependency rules, execution kind/function/operator, source/provenance and verification state. Legacy `nodes` method-definition rules are historical provenance/on-demand evidence after their semantics are represented by the Registry/engine; they are not normal startup authority.

ALIASES / CONDITIONAL EQUIVALENCE
Use active `canonical_methods_registry_law` v5. Alias is one method identity; conditional equivalence is input-dependent projection, not method merge. Equivalence must not inflate evidence and must fail closed unless explicitly governed and engine/formula-proven.

EXECUTION TRUTH
When verification matters, use the canonical registered engine/functions/Trace. General-model arithmetic, memory or guessed formulas are NOT authoritative SOD1820 output. Source claim != engine verified.

RESEARCH / INTERPRETATION BOUNDARY
Mathematical/algorithmic result is engine truth. Method meaning, research priority, convergence and interpretation remain under their current Research/Truth owners and never rewrite deterministic results.

WRITE / GOVERNANCE
Adding a method identity, formula, dependency/equivalence or execution path must obey Registry/Method Lifecycle/Engine Governance/Human Gate. No local screen, post, calculator, AI agent or research session may create a parallel Gematria engine or private method catalog.

ARCHIVE
Pre-compaction body is preserved at `docs/archive/project-codex/GEMATRIA_ENGINE_PRE_G2_COMPACTION_20260915.md` on the G2 compaction branch and in repository history.

OWNER CHECK: EXTEND_EXISTING. One Registry, one execution authority, no parallel engine/store/registry.

G2 COMPACTION ADDENDUM · 15.9.2026
- ATOMIC CALCULATION IDENTITY: a deterministic Gematria result is preserved as exact Expression/operand + canonical method identity/version + value + Trace/provenance. Historical `bidim` view may remain an implementation/read model; it is not a separate truth owner.
- ANAGRAM DEPENDENCY: expressions with the same normalized letter multiset do not create independent novelty/convergence merely because order-insensitive additive methods return the same value. Order-sensitive/transform methods may still yield distinct results. Dependency/novelty classification belongs to the current Convergence/Research owners, not a second anagram law family.
- COMPUTE VS WRITE: canonical deterministic calculations may execute without per-calculation Human approval when the registered engine permits them. Calculation does not authorize DB/core mutation, method registration, canonicalization, publication, merge or deploy; those remain under current write/governance/Human-Gate owners.
- Source-specific interpretive method research (including historical Christina/key-method material) belongs in Research OS/provenance unless a method identity is admitted through the Method Registry.


[UPDATE · Human-Gate ZURIEL · 24.9.2026 — CALCULATOR 2029 CONSUMER-ONLY EXECUTION BOUNDARY]

Calculator 2029 is a CONSUMER of the canonical Gematria execution fabric. Its public interaction contract is owned by experience_governance_foundation_v1.

Execution invariants:
- Calculator 2029 MUST resolve live method identity/order/state from the canonical Registry.
- Authoritative calculation/verification uses the registered engine/Profile/Trace path.
- Calculator 2029 MUST NOT create or treat local screen formulas, legacy JavaScript method arrays or a copied method catalog as canonical authority.
- A fast UI may cache/project already-authoritative calculation results, but performance optimization never creates a second calculation truth source.
- Heichal, Number, Beit Midrash, Raziel and Calculator must converge on the same method/result identity and provenance.
- Legacy GematriaCalculator/GematriaCalculatorLegacy remain compatibility/reference surfaces until cutover; they are not architectural authority for Calculator 2029.
- No new RPC/engine is implied when existing fn_method_profile/registered execution is sufficient.

OWNER CHECK: EXTEND_EXISTING. No parallel engine/Registry/store.



[UPDATE · Human-Gate ZURIEL · 24.9.2026 — METHOD LENS NORMALIZATION / EVIDENCE BOUNDARY]

Method Lens consumes canonical execution plus existing relation/dependency normalization. Its normalization may group/label/order evidence but may not replace actual matching items with aggregate prose.

- Exact method/value matches remain inspectable.
- Dependency/equivalence normalization determines effective independence, not existence.
- Raw and effective counts must remain distinguishable when shown.
- fn_relation_candidate / dependency-group semantics may be consumed for deterministic relation classification; a UI must not reimplement those rules locally.
- General-model/LLM prose is not required for deterministic Method Lens output and is never calculation authority.

OWNER CHECK: EXTEND_EXISTING. No parallel relation engine/search engine.

$sod_txt$, updated_at=now() where id=5;
end
$sod_rb$;

-- rollback project_codex #15 convergence_law: restore the exact base body (md5 0b14ba287ad2c7bc2c8017b0c76f847d)
do $sod_rb$
begin
  if (select md5(body) from public.project_codex where id=15) <> '85e9ec4561efc3eea4c962ec2e2509f8' then raise exception 'rollback codex convergence_law: body is not the applied version'; end if;
  update public.project_codex set body=$sod_txt$[2029 AUTHORITY NOTE · 20.9.2026] This document is historical architecture guidance. Where it says topic_cards is the source of convergence truth, that is superseded by reality_graph_law v8 + cross_vs_convergence_criteria v4 + writer_material_home_law v3. In 2029, topic_cards is legacy/projection/migration material; canonical semantics live under Reality Graph + Research OS + Truth/Human Gate. Preserve history, do not build new Topic truth from this document alone.

זהו הגזע של SOD1820. כל סוכן/מנוע חייב לקרוא זאת לפני שהוא נוגע בגלריות, מספרים, כרטיסים או כל פיצ׳ר. החומר כאן הוא זהב — וכשהוא מחובר יחד הוא יהלום. אסור לאבד חיבורים ואסור ליצור מערכות מקבילות.

■ עיקרון-העל: עץ ידע אחד.
כל האתר הוא גרף אחד (nodes + edges). אין "גלריות", "גימטריה", "פוסטים" כעולמות נפרדים — יש ישויות וקשרים. כל דבר הוא node: number, entity (כולל זהב), convergence (צירי התכנסות), event, year, post, word, phrase, image. כל עמוד באתר הוא רק "עדשה" על אותו גרף.

■ הכלל המעשי: מציירים פעם אחת, מפנים מכל מקום.
לכל ישות עמוד קנוני אחד: מספר → /number/:n · התכנסות → /topic/:slug · ישות/ביטוי → /number/:label. בכל מקום אחר (מגירת מספר, רצועת בית, שורה עליונה, /cross, ציר ההתגלות) מופיע רק תקציר/צ׳יפ שמקשר לעמוד הקנוני — לעולם לא עותק של התוכן. אסור לבנות מערכת שנייה לאותו דבר.

■ לא לאבד הצלבות (זה הלב).
לפני הוספת פיצ׳ר — לחבר אותו לגרף. number ↔ convergence ↔ /cross ↔ ישות זהב ↔ גלריה ↔ פוסט ↔ אירוע חייבים לראות זה את זה דרך edges. דוגמה חיה: 1820 ↔ שתי ישויות הזהב (=שתי החתימות) ↔ /topic/1820 ↔ תמונות מירון ↔ אירוע מירון.

■ מלמטה למעלה: שורשים → גזע → ענפים → עלים.
שורשים = נתון (OCR, gematria_words, ocr_numbers, nodes). גזע = הגרף (nodes/edges). ענפים = העדשות (/number, /topic, /cross, /timeline, בית המדרש). עלים = משטחי UI (רצועת הבית, השורה העליונה, מגירות). מתחילים תמיד מהשורש; משטח חדש = שאילתה על הגרף, לא טבלה חדשה.

■ שכבת ההתכנסות (convergence).
topic_cards = המקור הערוך של צירי ההתכנסות (כותרת, ממצאים, רמז משלים, הסתייגות, מספרים מובלטים, איכות, status). באישור — מוקרן לגרף כ-node type=convergence + edges (contains→number, related→entity, reveals→event). convergence_meter (0-100) מזין quality/weight. כל החלונות (שורה עליונה, רצועת הבית, מדור בית המדרש, /topic) קוראים אותו מקור.

■ כבוד לרמז + יושר מחקרי: תמיד להפריד גימטריה (עובדה) מפרשנות (רמז משלים).

■ SEO: לכל ציר URL קבוע (/topic/:slug) + meta/canonical/OG; חובה ב-sitemap (scripts/gen-sitemap.mjs) + JSON-LD.

קבצים: src/pages/TopicPage.jsx, src/components/ConvergenceAxis.jsx, src/lib/topicCards.js, src/pages/CrossMethodPage.jsx, src/pages/EntityPage.jsx, src/pages/BeitMidrashPage.jsx, src/components/layout/LiveActivityBar.jsx.$sod_txt$, updated_at=now() where id=15;
end
$sod_rb$;

-- rollback project_codex #30 experience_governance_foundation_v1: restore the exact base body (md5 db2d0806e3a10df6b25a04f5388dac16)
do $sod_rb$
begin
  if (select md5(body) from public.project_codex where id=30) <> '1c95f7fdbeaf94b1b4f70a057574f304' then raise exception 'rollback codex experience_governance_foundation_v1: body is not the applied version'; end if;
  update public.project_codex set body=$sod_txt$STATUS: FOUNDATION SUFFICIENT (contract-level). APPROVED — Human-Gate ZURIEL, 2026-08-29, work_log id f4811264-b47e-4020-b14f-bbfd187c1d04. Full document: audits/experience_governance_foundation_v1/EXPERIENCE_GOVERNANCE_V1_FOUNDATION_CONTRACT.md (branch claude/experience-governance-foundation-v1-1ki2s6, PR #234, head 633c709a at approval time -- pass 3 correction commit follows this closure). nodes.rule_id='experience_governance_foundation_v1_law' carries the machine-readable summary. This entry is the project_codex home for the architectural reasoning.

PURPOSE: answer, for any future Experience-layer decision (mobile acceptance, locale, identity display, design tokens, accessibility) -- who owns this kind of truth today, who may write it, how implementation discovers it applies, what counts as acceptance proof, and how a v2 supersedes a v1 without losing history -- reusing existing primitives (nodes, project_codex, decision_ledger, work_log, Master State, Roadmap, git/main), never inventing a parallel store.

CANONICAL OWNERSHIP MATRIX (see full table in the contract doc, section 3): Decision=Human-Gate outcome in its produced artifact (never work_log, which is provenance-only per work_log_authority_law) · Rule/Law=nodes type='rule' · Long-form Contract=project_codex (live on INSERT) or audits/<slug> (canonical only once merged to main / registered here -- an unmerged branch file is PROPOSED, not canonical) · Project State=Master State (pointer/index, not a duplicate of full bodies -- authority hierarchy unchanged: live DB + origin/main + Master State > Roadmap > conversation) · Navigation=Master Roadmap · Implementation=origin/main · Acceptance Evidence=work_log narrative today, decision_ledger reuse PROPOSED not yet live for this domain · Release State=git merge + Vercel deploy per deploy_on_request.

EXPERIENCE LAW LIFECYCLE: PROPOSED -> HUMAN-GATE APPROVED -> ACTIVE -> IMPLEMENTATION CONSUMES -> ACCEPTANCE VERIFIED -> RELEASE ELIGIBLE -> SUPERSEDED, mapped onto existing nodes columns (rule_version/supersedes_version/depends_on/metadata jsonb) with zero schema change. Proven via mobile_acceptance_law worked example: it already fits this model with no changes needed.

EIGHT HUMAN-GATE DECISIONS (ZURIEL, 2026-08-29, work_log f4811264), applied by the closure pass:
1. identity_architecture_law promoted to a locked nodes rule (this pass), meaning preserved verbatim from CLAUDE.md -- governs publicIdentity.js/authors.js/community.js/ContributorPage.jsx/ReportHint.jsx/EntityPage.jsx/WelcomePage.jsx.
2. 16px-font/44px-touch-target accessibility principles APPROVED as principles, but NOT folded into mobile_acceptance_law until an owning law is decided -- named Extension Point, not enforced yet.
3. BrandTicker.jsx's duplicate marquee (violates ticker_marquee_law/canonical_ui_components_law) gets no grandfathering -- must be corrected to reuse canonical Marquee.jsx. Decision made; the code fix itself is a separate future implementation task, out of scope for this docs-only closure.
4. Date/number formatting (formatDateHe/HumanDateInput, human_date_input_law) stays Hebrew-first by design; locale-parameterization remains an Extension Point.
5. research_contributions.author_contributor_id preserved (not dropped); wiring deferred to a future Public Identity Projection decision.
6. Reality Stream attribution: source-field provenance preserved as-is; visible "by" credit is a deferred Projection/UI choice, not a Foundation blocker.
7. Master State section 0 governance wording clarified additively (applied this pass, section 23.17 + section 0 item 16): Master State indexes/points to canonical owners rather than duplicating full rule/contract bodies -- standing authority hierarchy explicitly preserved, not altered.
8. UI-copy localization confirmed EXTENSION POINT NOW under one Localization/Representation Governance shared with content_translation_law (distinct domains and consumers, sharing a locale-identity concept -- not parallel systems, not built now).

LOCALE/DIRECTION CROSSWALK (live findings, contract section 8): index.html's <html dir="rtl"> is the sole document-direction owner. Physical CSS (marginLeft/right:/border-left, 147+543 occurrences) coexists with CSS logical properties already adopted in newer components (marginInlineStart/End, 40+ instances) -- logical properties declared canonical for new/touched Experience-layer components, Navbar.jsx's absolute-positioned dropdowns named as highest-risk specimen for a future locale, not fixed retroactively. dir="ltr" islands (Marquee.jsx, HumanDateInput.jsx, theme.js .sgx-date) are the correct, sanctioned pattern for numeric/Latin content inside the RTL document.

BRAND/IDENTITY CROSSWALK (contract section 10): confirmed a clean, already-correct "one canonical identity per role" pattern in live code -- users.display_name=account handle, profiles.full_name=private Raziel-only personalization, posts.author (free text, resolved via publicIdentity.js/authors.js)=public byline, contributors.display_name=curated public contributor, research_contributions.author_user_id/author_name=research provenance (documented precedence). No new Person/Identity store needed.

DESIGN CROSSWALK (contract section 11): theme.js + lib/palette.js (usePalette) + lib/themeMode.js confirmed as the real, working, route-aware light/dark token system -- canonical, assign don't rebuild. src/components/ui.jsx is a partial (dark-only, no Card/Modal/Drawer) canonical primitive kit -- extending it is Extension Point Now. No shared 320/360/390 breakpoint utility exists yet -- mobile_acceptance_law works today by per-component convention, a shared constant is Extension Point Now once a 2nd component needs it.

ACCESSIBILITY CROSSWALK (contract section 12): foundation already sound -- Navbar.jsx's useAccessibleMenu() hook, real semantic <button>/<a> elements throughout (div-as-button appears only 6 times total in src/), prefers-reduced-motion correctly handled where custom animations exist. Gaps (dialog semantics on NumberDrawer/modals, reduced-motion as a systemic convention) are targeted Extension Points, not a redesign.

WHAT WAS EXPLICITLY NOT DONE: no Experience Center UI, no Design System build, no i18n/UI-translation engine, no identity-table rewrite or rename, no mass CSS refactor, no BrandTicker code fix, no new schema/migration/table, no merge, no deploy. All of it stays docs/DB-governance-level, per foundation_closure_protocol_v1's own anti-patterns list (no building UI to prove Foundation, no bulk backfill to test a contract).

PROVENANCE: work_log chain (all 2026-08-29) -- b26475aa (BEFORE) -> c3ce5850 (pass 1 AFTER) -> 86daaade (GPT cross-verification, CHANGES_REQUESTED) -> 5a4b6756 (pass 2 AFTER, 7 corrections applied) -> f4811264 (ZURIEL Human-Gate approval, 8 decisions) -> this closure pass (pass 3: DB writes + Master State/Roadmap reconciliation + final AFTER memo for GPT). PR #234 remains open, not merged, not deployed -- per explicit ZURIEL instruction to stop before merge/deploy.


—— EXPERIENCE PUBLIC LANGUAGE / ADAPTIVE DEPTH 2029 · Human-Gate ZURIEL · 17.9.2026 ——
Owner: experience_governance_foundation_v1_law v3. EXTEND_EXISTING only.

ONE VOICE, ADAPTIVE DEPTH: SOD1820 speaks in one calm, curious, natural, accessible voice. Surfaces alter depth and vocabulary by task, not personality or truth. Precision increases as the user goes deeper; it must not become cold or bureaucratic.

ROLE GRAMMAR:
• World = “מה מתחבר?” — discovery, context, picture, story, connections, sources, events, people, verses and hints. Research-lab language is not the default opening.
• Heichal = “איך בודקים?” — explicit deep research/action language: calculate, compare, inspect source, run method, search, Trace, add to research. Backend jargon still stays behind the user-facing layer unless decision-relevant.
• Journey = “לאן זה מוביל?” — path, continuity, why-transition, next branch and exact return.
• Raziel = “מה כדאי לעשות עכשיו?” — one fixed companion personality under raziel_voice_law; context changes action/depth, not voice identity.
• Inspector / Trace / Explain-Why = “למה ואיך בדיוק?” — home of the densest verification/provenance/replay/uncertainty vocabulary.
• Post/Public content = narrative/wonder/hint language under publishing_conventions with truth-safe substrate preserved.

PROGRESSIVE DISCLOSURE: ordinary public Hebrew first; research language on deliberate depth; internal implementation/governance terms only in advanced/inspection/admin contexts where useful. Simple copy must not erase meaningful uncertainty/state. Technical wording does not create truth weight; beautiful wording does not upgrade truth.

ONE SEMANTIC ACTION, CONTEXTUAL COPY: shared actions keep one capability identity even when visible wording adapts between World/Heichal/etc. No page-specific voice law, copy engine, registry or parallel localization system is authorized.

Implementation consequence: World should foreground discovery/connection; Heichal may intentionally sound more research/action-oriented; Inspector/Trace carries maximum precision. This decision itself changes governance only, not runtime UI.


—— CONTEXTUAL MULTILINGUAL VOICE 2029 · Human-Gate ZURIEL · 17.9.2026 ——
Owner: experience_governance_foundation_v1_law v4. EXTEND_EXISTING.

Same SOD1820 voice across every locale; locale adapts natural phrasing/direction, not product personality or semantic depth. Context controls tone: World=clear discovery/connection; Heichal=research/action; Journey=path/continuity; Raziel=same calm curious companion; Inspector/Trace=maximum precision. Authored/public narrative such as posts may intentionally use a more wondrous, spiritual, mystical or poetic register when fitting, while Truth semantics remain unchanged. General UI defaults to clear discovery rather than laboratory jargon or mystical abstraction. No locale-specific voice owner, copy engine/registry or parallel localization system.


—— WORLD HUMAN PROJECTION / HUMAN-FIRST DISCOVERY · Human-Gate ZURIEL · 17.9.2026 ——
Owner: experience_governance_foundation_v1_law v6. EXTEND_EXISTING.

Locked implementation direction from live World audit: (1) bounded “העיקר סביב…” first; (2) type-specific human rendering for Gematria/Verse/Book-Source/Person; (3) Human first -> structure second -> raw last; (4) human source labels with exact raw provenance preserved below; (5) people/researchers as a lens over existing identity/attribution, never a contributor store; (6) preferred scan order עיקר -> גימטריות וביטויים -> פסוקים ומקורות -> אנשים וחוקרים -> חיבורים -> מחקר נוסף -> זמן, collapsing empty families; (7) temporal labels must distinguish real occurrence/publication/discovery from research-ingestion created_at; (8) “מומלץ כאן” consumes research_gold_hints contextual prominence dimensions and Explain-Why, never a universal truth score. No new Store/Engine/Graph/Truth/Ranking owner.

Hebrew/raw presentation is governed jointly with content_translation_law v4: original source/provenance remains intact; public/default Hebrew is a human representation, not a rewrite of historical evidence.


—— COMMUNITY CORE 2029 · ONE COMMUNITY / AI-NATIVE SOCIAL LAYER · Human-Gate ZURIEL · 23.9.2026 ——
OWNER CHECK: EXTEND_EXISTING. Public composition owner = experience_governance_foundation_v1_law. Data/identity/truth remain with their existing domain owners: identity_architecture_law, research_intake_foundation_contract_law, research_workspace_law, raziel_companion_layer_law, research_strategy_layer_law, truth_axes_foundation_law. No Community Law, Chat System, Forum System, Community Store, second graph or second truth owner is created.

HUMAN-GATE PRODUCT DECISION:
1. ONE PUBLIC SURFACE. Public product name is "הקהילה". "צ׳אט" and "פורום" are legacy presentation concepts, not separate future products. /community/chat and /forum remain compatibility addresses until a separately authorized cutover; no route change is authorized by this decision.
2. ONE FREEFORM INPUT. The visitor writes naturally and submits one message/reply. No public taxonomy chooser (question/source/observation/idea/correction/etc.). This ratifies and extends work_log 36f4ca42-dd54-4a1b-bdb4-3638d1752ffb.
3. CLASSIFICATION BEHIND THE SCENES. System/AI may infer zero/one/multiple semantic roles, links, numbers, sources, entities, questions, observations and candidate relations after submission. Classification is routing/research metadata only and never approval, moderation, verification, governance, publication or canonicality.
4. COMMUNITY MEMORY. The OpenWeb export for spot sp_OVtajBTj (reported by OpenWeb as 41,080 messages) is treated as the historical community conversation corpus. Historical homepage article_url values are not interpreted as semantic attachment to Home merely because the widget lived there. Only real internal links/source context supported by the record or message content may create site relationships.
5. LOSSLESS HISTORY. Preserve source-native message identity, author identity, timestamps, parent/reply lineage, original text, original moderation status, likes/dislikes when present, and source provenance. Deleted/blocked/hidden history never becomes public merely because it was imported. Missing values stay unknown/null; do not invent zeros or statuses.
6. IDENTITY BRIDGE. Existing verified email matches may link historical identity to an existing SOD1820 account. Never auto-create auth accounts from export email. Unmatched legacy identities remain private/soft/claimable; future verified account proof may attach history. Email/PII never appears in public message projections.
7. ONE COMMUNITY CORE, MANY PROJECTIONS. The same semantic message/conversation may be projected in Community, under a Post, around a Number/Expression, on a Researcher/Person surface, in World, or inside a contextual Raziel flow. Projection references the same underlying identity/context; it is not copied into parallel stores.
8. REALTIME IS A CAPABILITY, NOT A SECOND STORE. Future live chat behavior uses the existing governed contribution/conversation substrate with RLS-aware realtime/fanout. No live_messages/chat_messages parallel truth store is authorized.
9. RAZIEL AS ACTIVE PARTNER, NOT NOISE. Raziel may notice useful links, retrieve prior community conversations, summarize long threads, verify calculable claims through canonical engines, suggest next actions and answer when invoked/valuable. It does not respond to every message, does not dominate the room, and does not convert popularity into truth.
10. AI-NATIVE COMMUNITY CAPABILITIES. Target end-state includes semantic search across historical/current community; conversation resurrection when context becomes relevant again; "what changed since I was here"; contextual people/topic expertise; thread summaries; internal-link/entity extraction; voice/transcript as another representation of the same interaction; notifications/presence where privacy-safe; and adaptive suggestions through existing owners.
11. SITE-WIDE SOCIAL LAYER. Community is allowed to become the live social layer across SOD1820 and may eventually participate in the Home experience ("עכשיו ב-SOD1820") as an Experience projection over existing events/content/community sources. This decision does not itself cut over Home or replace existing routes.
12. PUBLIC LANGUAGE. Outside language stays ordinary, warm and simple. Avoid forcing research/governance vocabulary on visitors. Internal precision remains exact under Truth/Intake/Workspace/Inspector layers.
13. LEGACY research_contribution_law. Do NOT reactivate it as the future product owner. Existing research_contributions/contribution_links and their useful semantics may remain implementation substrate/legacy compatibility under active 2029 owners until migration/supersession is proven. Preserve capability/history; do not preserve the legacy public taxonomy/interface merely because it exists.
14. BUILD ORDER (hidden first): Foundation runtime -> real archive audit/identity map -> idempotent import dry-run -> privacy/security/RLS challenge -> realtime-ready core -> AI classification/extraction -> Raziel partner seam -> semantic search/history -> Shadow Preview -> Human Gate -> optional cutover. OpenWeb remains untouched until a separate Human Gate.
15. RELEASE SAFETY. No live DB import, no public UI/route change, no OpenWeb removal, no merge/deploy/cutover is authorized by this architecture decision alone. Each destructive/public transition remains separately gated.

ACCEPTANCE PRINCIPLE: simple like a familiar chat on the outside; one deeply connected, AI-native, truth-safe, identity-aware, replayable Community Core on the inside.


—— COMMUNITY HISTORICAL MODERATION CARRY-FORWARD · Human-Gate ZURIEL · 23.9.2026 ——
For historical Community migrations, source moderation visibility is preserved as source history, not reinterpreted as research governance. WordPress status=publish and OpenWeb moderation=approved may project as historically visible community content. OpenWeb/legacy blocked/deleted remain non-public/hidden; pending remains pending. This carry-forward is a migration/visibility decision only: it does NOT mean research approved, engine verified, canonical, factual or promoted. AI/classification has no authority to change these states. Missing moderation stays unknown/pending rather than invented.



—— EXPERIENCE PROJECTION — «העת עכשיו» ACROSS HOME / POST / WORLD / AXIS · Human-Gate ZURIEL · 24.9.2026 ——
Owner: experience_governance_foundation_v1_law. EXTEND_EXISTING.

PUBLIC EXPERIENCE CONTRACT:
- Home = DISCOVER: surfaces a bounded «עכשיו ב-SOD1820» / temporal discovery when materially important. It is not a raw chronological feed.
- Post = SIGNAL: may show a compact Temporal Spark near the top only when the post has a direct material connection to the current temporal context. It must not displace the source/story.
- World = EXPLORE: canonical deep public projection for the temporal family. The user can open «העת עכשיו», «העת של המקור», and «ציר ההתגלות» around the same anchor/context.
- Revelation Axis = NARRATE: historical/temporal story across stations.
- Journey = TRAVERSE: moves between stations while preserving why the transition occurred and exact return.

POST ORDER WHEN TEMPORAL RELEVANCE IS STRONG:
Hero → Post Pulse (what changed in the post) → Temporal Spark (what reality-now connects to the post) → original source/media → authored story → later additions → deeper «מה מתחבר לעת הזאת?» → exits to World/Revelation Axis/Topic/Journey.
Post Pulse and Temporal Spark are distinct semantics and must not be merged.

PROMINENCE RULE:
Do not place «העת עכשיו» prominently in every Post/World. Promote it only when there is material current-time relevance. Empty/weak temporal families collapse quietly. Temporal prominence never upgrades truth.

COPY PRINCIPLE:
Home מגלה אותה · Post רומז עליה · World חוקר אותה · ציר ההתגלות מספר אותה לאורך הזמן.


---

## 2029 CURATION MARKS / TREASURE DISCLOSURE · Human Gate ZURIEL · 2026-09-24

SCOPE: 2029 ONLY. Legacy Number/Research/Post/UI surfaces are explicitly out of scope and receive no migration work from this decision.

### 1. ONE MARK LANGUAGE
Every 2029 projection that surfaces a Human-curated Core identity or curated Number Anchor must expose its curation mark consistently:
- Diamond Core → diamond mark.
- Gold Core → gold mark.
- Gold Number Anchor → gold anchor mark/variant from the same curation-mark family.
- Crown Anchor 1820 → crown-anchor presentation; it is not a third Diamond Core.

The mark is presentation over canonical tier/role metadata. Surfaces never infer tier from numeric equality, match count, phrase wording or local code.

### 2. MARK IS INTERACTIVE, NOT DECORATION
Pressing/tapping the mark opens a lightweight contextual explanation:
- what this mark means;
- whether the current item is Diamond Core, Gold Core, Gold Number Anchor or Crown Anchor;
- why this item was Human-curated;
- the active Number Anchor(s) / core relation(s);
- a bounded set of strongest relevant witnesses;
- a deeper action such as “ראה את כל הזהב”, “ראה את כל היהלומים”, “פתח את העוגן”, or Explain-Why.

The first interaction must remain light. Full provenance/Trace belongs behind deliberate deepen/Explain-Why.

### 3. WITNESS DOES NOT INHERIT CORE ICON
A calculation/finding/source that merely supports or equals a Diamond/Gold Anchor does not receive the Diamond/Gold Core mark unless the underlying stable identity itself is curated at that tier.
Examples:
- עת=1820 במשולש is a Diamond Witness around the 1820 Crown; עת does not become Diamond by inheritance.
- a new phrase=604 may be Gold Witness; it does not become Gold Core automatically.

Witness projection may show a secondary relation hint such as “מחובר ל־Diamond 1820” / “עד בציר Gold 604”, without mislabeling the witness as Core.

### 4. NUMBER PAGE MUST STAY LIGHT
2029 Number Page default composition must not dump all curation data.

Default local view:
- current number identity;
- if curated: one compact Anchor/Crown mark beside the number;
- at most the strongest 1–3 local Core identities / curation connections when contextually useful;
- a compact count/entry point for the rest;
- ordinary gematria/results remain readable without a permanent curation dashboard.

No giant “all Gold / all Diamond / all Anchors” block inside every Number Page.

### 5. GLOBAL “TREASURES” DISCLOSURE
A single canonical 2029 disclosure surface/action may show the full curated collection on demand. It is a projection over existing nodes/relations, never a new store.

It must separate:
- Diamonds — Core Signature identities.
- Gold — Core semantic identities.
- Number Anchors — Gold Number Anchors + Crown Anchor, presented as numeric research centers rather than semantic entities.
- Witnesses — only when the user deliberately deepens into a selected Core/Anchor; not as one global noisy master list.
- Silver — hidden from this public collection until Silver semantics are explicitly decided.

The same disclosure can be opened from a curation mark or another 2029 “Treasures” entry point.

### 6. LOCAL LIST ROWS
Whenever a curated identity itself appears in a 2029 gematria/result/search/topic/world/post list, its mark appears directly beside that row/name.
Whenever the current numeric result is a curated Number Anchor, the numeric anchor mark may appear beside the value.
Do not duplicate both entity and anchor marks if that creates visual noise; use one primary mark and reveal the relationship on interaction.

### 7. PROGRESSIVE DISCLOSURE / MOBILE
Mobile-first:
- mark target remains accessible/tappable;
- explanation uses compact popover/sheet/drawer according to existing 2029 primitive patterns;
- first view is human-language, not governance jargon;
- lists collapse by default and preserve scanability;
- no horizontal overflow and no dense badge stacks.

### 8. ONE CANONICAL COMPONENT FAMILY
Implementation must extend canonical UI primitives rather than page-local icons. Conceptually this is one shared CurationMark/TreasureDisclosure family consuming canonical tier/role state. Surface-specific layout is allowed; semantic mark logic is not duplicated.
Use semantic theme roles/palette; no independent per-page Gold/Diamond hex system.

### 9. 2029 SURFACE COVERAGE
The invariant applies wherever relevant in the new system: Number 2029, World, Search, Topic/Post 2029 projections, Heichal result lists, Journey, Raziel result projections and future 2029 consumers.
It does not authorize a bulk legacy retrofit.

### 10. TRUTH BOUNDARY
Visual prominence and the Diamond/Gold mark communicate Human curation, not stronger calculation truth. Verification/provenance remain separately inspectable.

OWNER CHECK: EXTEND_EXISTING Experience + canonical UI primitives + golden_entity_law. No Treasure Store, Badge Registry, curation graph or parallel truth/ranking system.


—— READING SURFACE / GLOBAL FRAME COMPOSITION V1 · Human-Gate ZURIEL · 24.9.2026 ——

This is a cross-surface Experience composition decision under the existing System Frame / Research Workspace / Raziel owners. It creates no new shell, panel system, context store, navigation owner, AI companion or truth layer.

1. ONE GLOBAL FRAME. Every native 2029 surface consumes the same System Frame semantics: global orientation/navigation, one Bottom Command Island action surface, one Raziel presence, one transient Panel Host and one Research Context continuity model.

2. BOTTOM COMMAND ISLAND = CONTROL, NOT NAVIGATION. The island remains the global action surface. Its semantic slots are contextual command/action/Raziel/attention/tools. It must not be duplicated inside a page-local side rail.

3. ONE RAZIEL. Raziel stays anchored globally in the System Frame. A reading surface may expose a contextual trigger such as “שאל את רזיאל על החלק הזה”, but that trigger opens the same Raziel companion with the active Reading Focus. No post-Raziel, world-Raziel or surface-specific conversation system.

4. ONE TRANSIENT PANEL HOST. Deep inspect, capability detail, tools and Raziel expand through the existing Panel Host. A page-local rail is preview/orientation only; it is not a second inspector/dashboard.

5. SURFACE GEOMETRY FOLLOWS ROLE, NOT FORCED VISUAL SAMENESS.
- Reading Surfaces (Post, Book/Source and comparable long-form reading) may use Source/Reading Canvas + Context Spine + bounded Context Rail/Living Margin.
- World/Topic/Number are already rich Hub/Explorer/Detail canvases and do not receive a permanent Reading Rail by default; deepen through contextual actions/Panel or transition to the correct product home.
- Heichal/ELS and similar tools are Workbench/Focus surfaces and do not receive a permanent Reading Rail.
This preserves one system while allowing different surface geometry.

6. CONTEXT RAIL = INTELLIGENCE PREVIEW. It answers only “what is worth noticing here?” for the active reading region: one primary connection plus a small bounded set of signals (verified calculation/source/time/curation/etc.) and continuation actions. Contextual Prominence + Silence Gate apply. If nothing materially improves the reading, the rail stays quiet.

7. CONTEXT SPINE = READING-TO-SYSTEM SEAM. A thin non-intrusive spine/marker may indicate that a source region has relevant depth without injecting system prose into authored paragraphs. Markers are projection affordances, never source text or truth state.

8. DEPTH MODEL = READ → PEEK → DEEPEN.
- READ: source text remains primary.
- PEEK: Context Rail shows bounded context.
- DEEPEN: existing Panel Host or the correct product home (World/Number/Source/ELS/Heichal/Journey) opens with exact Research Context and exact-return state.
No new page-specific depth engine.

9. MOBILE EQUIVALENCE. On mobile, the permanent side rail disappears. The same Reading Focus may surface as a small marker/count and opens through the existing bottom-sheet Panel Host. Bottom Command Island and Raziel remain globally consistent.

10. EXACT RETURN. Transition from a reading region to World/Number/Source/ELS/Heichal/Journey preserves Post/source identity, exact reading locator/region, why-transition and returnTo so “חזרה” returns to the exact reading context, not merely the top of the post.

11. VISUAL OWNER. Placement, typography, motion and rail/spine styling consume the active Design Contract / semantic palette. This decision owns semantics and surface-role composition only, not hard-coded colors or page-local design systems.

OWNER CHECK: EXTEND_EXISTING experience_governance_foundation_v1_law + research_workspace_law + raziel_companion_layer_law. No new global UI owner.


—— HEICHAL RESEARCH-LAB ENVIRONMENT PROJECTION · Human-Gate ZURIEL · 24.9.2026 ——

OWNER CHECK: EXTEND_EXISTING. This is a visual/environment projection under the existing Experience + SOD1820_DESIGN_CONTRACT_V1 / Visual Foundation tree. It creates no Heichal theme owner, no second palette system and no new product identity.

1. HEICHAL = RESEARCH_LAB ENVIRONMENT.
The existing Experience Context already classifies Heichal as RESEARCH_LAB. The visual projection now intentionally differentiates Heichal from narrative/discovery surfaces while preserving the same SOD1820 System Frame, typography, component family, Raziel identity, semantic status colors and capability owners.

2. DARK PROJECTION — MIDNIGHT LAB.
Heichal dark mode uses a colder deep navy/indigo/graphite laboratory atmosphere, restrained scenery, precise glass/data surfaces, research-blue interaction and Raziel indigo continuity. Sacred gold remains brand/curation accent only and must not become truth/status ranking.

3. LIGHT PROJECTION — PEARL LAB.
Heichal light mode uses pearl/silver/off-white laboratory surfaces, deep ink, cool blue-gray structure, research-blue interaction and restrained gold brand accents. It is the daylight counterpart of the same Heichal, not a separate brand.

4. TRANSITION, NOT TELEPORT.
Entering/leaving Heichal may use a short restrained environment transition so the user senses “entered a workbench” while global identity/orientation remains stable. Motion is optional/ambient, respects reduced-motion, and carries no information.

5. GEOMETRY / DENSITY.
Heichal may use more precise grids, separators, instrument-like spines, denser inspector surfaces and lower scenery than Home/Post/World. Global System Frame components remain the same owners; surface-local visuals may adapt to the RESEARCH_LAB role.

6. SCOPE BOUNDARY.
Do not recolor the whole site blue. Do not hard-code page-local hex values when semantic palette/environment tokens already exist or can be extended. Do not create HeichalTheme.js. Extend the existing palette/environment projection cleanly for both dark and light.

7. CONNECTED GOLDEN ACCEPTANCE.
The Connected Golden must visibly demonstrate the transition from ordinary 2029 discovery environment into Heichal in both dark and light modes, with no capability/context/Raziel discontinuity and no readability/accessibility regression.


—— COMMUNITY HISTORY SEARCH INDEX GATE · Human-Gate ZURIEL · 24.9.2026 ——
Historical/community retention and research/search indexing are separate capabilities.

1. ALL community history may be retained for chronological/thread continuity.
2. SEARCH / RESEARCH INDEX eligibility is opt-in by signal, not default-by-message.
3. A message enters the research/search index only when it contains a material Remez/Research signal: an actual numeric/gematria relation or claim, method/cipher/ELS operation, source-text/verse/name/entity relation, explicit interpretive connection, or another research-bearing statement that can be routed into the canonical Research Intake/engines.
4. Mere presence of a number is NOT sufficient. Mere presence of a URL is NOT sufficient.
5. VIDEO/LINK-ONLY/SOCIAL CHAT/REACTION/SMALL TALK content is NOT indexed and is NOT searchable through the research/search layer. It remains accessible only through its original conversation chronology/thread unless a separate human-authored research statement exists.
6. Video/media itself is never indexed into Community research merely because it was shared. If accompanying authored text independently contains a material Remez/Research signal, only that text/derived research object may become index-eligible; the media remains source/provenance.
7. Popularity, likes, replies, author identity, or historical visibility never make a message index-eligible.
8. Classification is candidate-only. It may propose index_eligible=true/false with reasons, but cannot promote to Canonical/Fact/Published. Existing Truth/Human-Gate boundaries remain unchanged.
9. Performance intent: non-indexed social history must not participate in search/retrieval/semantic indexing jobs, embeddings, or Raziel research retrieval. It should impose only normal storage/thread-access cost.
10. ONE TREE: extend existing Research Intake/Search/Strategy owners; do not create a parallel Community search store.



—— COMMUNITY SEARCH INDEX GATE · CORPUS CALIBRATION · Human-Gate ZURIEL · 24.9.2026 ——
REAL-CORPUS CALIBRATION OVERRIDES OVER-BROAD HEURISTIC ELIGIBILITY.

1. Regex/keyword detection is PRE-FILTER ONLY. It may produce scan_candidate=true + candidate_reasons, but MUST NOT by itself set index_eligible=true.
2. index_eligible=true requires at least one reconstructable research-bearing unit, e.g.:
   - explicit numeric/gematria relation with operands/relation (not a number appearing in prose/URL/timecode);
   - canonical method/cipher/ELS application with identifiable operation/input;
   - source-text/verse/name/entity relation together with an authored interpretive/research connection;
   - another structured research claim/finding that can route into existing Research Intake / canonical engines.
3. Before any numeric/source heuristics, strip/segregate URL payload/query strings from authored-text analysis. URL query parameters, article ids, timestamps, video offsets, etc. are never numeric-relation evidence.
4. Hebrew book/entity names require contextual disambiguation. Substrings such as "שמות" inside ordinary language ("השמות") MUST NOT qualify as Biblical-source evidence.
5. Internal SOD links must be hostname/relative-route validated. An external URL whose path happens to contain /world/, /person/, etc. is NOT an internal research-object reference.
6. Mere mention or rejection of research vocabulary ("גימטריה לא תופס אצלי", bibliographic "רמז ע״ו", etc.) does not automatically create a research finding.
7. Default remains FALSE. When uncertain, preserve the message only in chronological Community history and do not index.
8. One-time historical scan may cheaply prefilter candidates, but only structured extraction/classification under existing Research Intake/Search Strategy may promote a candidate to index_eligible.
9. No new Community search store. Eligibility remains derived metadata / decision candidate under existing owners.

Real-corpus evidence triggering this calibration: current PR #636 heuristic marked 2,860/41,080 rows eligible; 2,196 were eligible solely via broad verse/entity keyword matching. Observed false positives included ordinary "השמות" matching ספר שמות and external news URLs with /world/... matching the internal-route regex.



—— SOURCE-FIRST DISCOVERY HANDOFF · Human-Gate ZURIEL · 24.9.2026 ——

SOD HASHMAL / סוד החשמל is an approved future calibration consumer of the existing Research Strategy / Discovery capability fabric.

1. PIPELINE TARGET.
source intake → authored headings / Reading Regions → region-bounded Research Context → existing Research Plan chooses relevant capabilities → canonical engines/readers verify/extract → normalize/dedup/dependency grouping → Truth/Provenance classification → contextual prominence + Silence Gate → bounded projections to Living Margin / mobile cue / Raziel / World / Number.

2. NO NEW “HINT ENGINE”.
Do not create a Post-specific hint engine. Reuse research_strategy_layer_law v15 capability planning, canonical Gematria/method registry, Reality Graph relations, Research Gold Hints contextual prominence and existing source/provenance owners.

3. REGION IS CONTEXT, NOT IDENTITY INVENTION.
A Reading Region is a bounded source locator/context. The discovery pass may return Findings/Connections/Evidence/verified calculations associated with that region, but a region label itself is not automatically a new canonical Topic/Claim/Fact.

4. DISCOVERY ≠ PRESENTATION.
A full scan may discover many candidates. Source-first UI shows only bounded, decision/useful connections after filtering, verification, dedup and prominence. The rest may remain available in World/Research depth without polluting the reading surface.

5. SOD HASHMAL TARGET BEHAVIOR.
After the full scan is wired, each authored section (for example תשפ״ז; “שכר האדם לא נהיה” / AI; יתמו חטאים; השיר; צפנים) should automatically receive a contextual result bundle appropriate to that region. Verified gematria remains clickable and explainable; source text remains visually calm. Raziel receives the exact active region + bounded result bundle; World receives the same context for deep exploration; exact return restores the source position.

6. AUTOMATION GOAL.
For future eligible source-first publications, this scan/handoff should run by default through the governed intake/publishing workflow rather than requiring ZURIEL to ask separately each time. Automatic discovery does not auto-canonicalize, auto-publish claims, or rewrite the source.



[UPDATE · Human-Gate ZURIEL · 24.9.2026 — CALCULATOR 2029 INTERACTION CONTRACT V1 · EXTEND_EXISTING]

PURPOSE
Calculator 2029 is the fast public calculation surface over the existing Gematria Capability Fabric. It is not a second Gematria system, not a Heichal clone and not a reduced Research OS.

1. INSTANT CALCULATION IS A PRODUCT INVARIANT.
Typing a word/expression MUST surface its method profile immediately without requiring a “Calculate” button. The primary surface stays fast, direct and low-friction. Deeper research capabilities must not make ordinary calculation feel like entering a workbench.

2. ONE CAPABILITY, MULTIPLE PROJECTIONS.
Calculator, Number, Heichal, Beit Midrash and Raziel consume the same canonical method identity/Registry/execution/Trace/Research Context. They may expose different depth, but MUST NOT own separate formulas, method catalogs or incompatible calculation state.

3. SELECTED CALCULATION IS THE INTERACTION UNIT.
Selecting a result creates/updates a bounded Calculation Selection carrying at minimum:
- exact expression;
- canonical method identity/version when available;
- computed result;
- calculation/engine provenance;
- relevant representation/context.
Selection != publication, research finding or canonical claim.

4. CLICK DOES NOT FORCE NAVIGATION.
Clicking a method/result in Calculator first MAY open a local contextual Panel/Inspector while remaining on the calculator. A user MUST NOT be forced into Heichal merely to inspect מילוי, ריבוע, a Trace, letter breakdown or another ordinary calculation explanation.

5. LOCAL EXPLANATION VS DEEP RESEARCH.
Calculator may show bounded in-place calculation detail: Trace, transformed letters/text, per-letter/per-word decomposition, method status, Hebrew-number display and equivalent calculation explanation.
“Open in Heichal” is an explicit deep-research action. Heichal receives the SAME Calculation Selection and surrounds it with deeper capabilities; it does not open a different or “more authoritative” calculator.

6. ROLE SEPARATION.
- Calculator = Calculate → Select → Explore.
- Number = Explore the numeric result/identity and its governed connections.
- Beit Midrash = Understand the method.
- Heichal = Investigate deeply using the same context.
- Raziel = Explain/connect/assist over the same context.
No surface duplicates another surface’s semantic ownership.

7. RESULT / METHOD / EXPRESSION ARE DISTINCT TARGETS.
- Result click: selects the exact calculation; may then offer “Open Number”.
- Method click: method Trace/explanation/“Learn in Beit Midrash”.
- Expression click: expression-focused Research Context.
- Crossing click: crossing-focused research projection.
These targets must not collapse into “always go to number page”.

8. EXACT CONTINUITY.
When moving from Calculator to Number/Heichal/Beit Midrash/Raziel, preserve the originating expression + method + result + return context. Exact return should restore the Calculator state rather than dropping the user into a generic destination.

9. SAVE SEMANTICS.
A save affordance on a calculation should preserve the calculation identity (expression + method + result + provenance) when the receiving owner supports it, rather than silently reducing the saved object to a bare number. Calculation/save remains separate from publication/community/canonicalization.

10. ADVANCED COMPARE REMAINS, BUT ITS OPERATIONS ARE DISTINCT.
The useful legacy two-expression comparison capability is retained conceptually, rebuilt over canonical execution:
- Compare = inspect two calculations side-by-side.
- Crossing = two expressions/methods meeting at the same result, with dependency/equivalence checks before research significance is implied.
- Combine/Sum = a DERIVED_OPERATION with operand provenance, not a new Gematria method/result identity.
- Split = continue each calculation independently.
Do not overload one “combine” action with multiple incompatible meanings.

11. TRANSFORM / “SEND UP” PRESERVES PROVENANCE.
Using a method-transformed output as a new calculator input is allowed, but the transformation lineage must remain reconstructable. A transformed string/value is not silently treated as an unrelated fresh source expression.

12. OPENING / DECOMPOSITION.
Ordinary method opening/decomposition that directly explains the selected deterministic calculation may appear inline in Calculator when supported by canonical Trace/engine adapters. Derived operations (such as per-word prefix opening) remain explicitly labeled DERIVED_OPERATION and never become independent method identity/evidence merely because they are displayed in Calculator.

13. INTERPRETIVE LAB CAPABILITIES.
Interpretive features such as “שיטת המפתח”, AI interpretation or research hypothesis layers are NOT Calculator Core. Calculator may expose an entry/action into the appropriate Heichal/Raziel/Research surface while preserving the current Calculation Selection. Deterministic calculation facts and interpretive layers remain visibly distinct.

14. LANGUAGE / ENGLISH BOUNDARY.
Transliteration may remain a Language Router capability. English Gematria methods are not automatically admitted into the Hebrew canonical Gematria Registry merely because the legacy calculator implemented them. Any retained English method family requires its own canonical owner/registry/execution decision; no silent port.

15. HISTORY / COMMUNITY / TELEMETRY BOUNDARY.
Calculation does not inherently publish, add to a public wall, create community content or promote research truth. Telemetry, personal save/history, community contribution and publication are separate governed capabilities and must be reconnected explicitly if retained.

16. PERFORMANCE / PROGRESSIVE DISCLOSURE.
The initial calculator view prioritizes input + immediate method results. Deep details, Trace, crossings, research actions and interpretive tools are progressively disclosed after selection. The system must not load the full Heichal/World/Research experience merely to provide instant calculation.

17. OWNER CHECK.
EXTEND_EXISTING only. No Calculator Engine, Calculator Registry, Calculator Research Store, Calculator Context or parallel method system is authorized by this contract. Runtime implementation must consume existing Registry/Profile/Trace/Presentation/Research Context/Opening owners.



[UPDATE · Human-Gate ZURIEL · 24.9.2026 — CALCULATOR 2029 · RAZIEL PREMIUM INVOCATION]

Calculator 2029 preserves an AI-free instant typing path. Deterministic method results must appear without invoking Raziel, LLM, deep search or broad research retrieval.

After a stable Calculation Selection exists, the user may explicitly invoke “Ask Raziel / Analyze this Gematria”. That action consumes the SAME expression + method + result + provenance/context and routes to the existing Raziel/Research capability fabric.

Entitlement for this action is owned by active platform_tiers_law: raziel_gematria_analysis is PREMIUM-REQUIRED, server-gated before expensive I/O. Locked/non-entitled presentation must not execute hidden AI work.

Calculator Core remains calculate/select/explore; Raziel is optional deep intelligence, not part of the keystroke/render critical path. Premium depth never changes deterministic truth quality.

OWNER CHECK: EXTEND_EXISTING. No Calculator-specific Raziel, AI engine, context store or entitlement system.



[UPDATE · Human-Gate ZURIEL · 24.9.2026 — METHOD LENS 2029 · EVIDENCE-FIRST PROJECTION · EXTEND_EXISTING]

PURPOSE
Method Lens is a shared deterministic projection for Calculator 2029 and Number 2029 over a selected Calculation Selection / method result. It answers: “what is actually inside this method/result?” It is not an AI summary surface and not a second search engine.

1. SHOW THE EVIDENCE, NOT A SUMMARY OF THE EVIDENCE.
The primary Method Lens result MUST render the actual matching expressions/relations/items available for the selected method+value. If there are 11 independent connections, the user must be able to see/open the 11 connections themselves. A count such as “11 independent” may accompany the view but may never substitute for the list.

2. NEVER SUMMARIZE AWAY THE EVIDENCE.
Normalization, dependency collapse, rarity, ranking and relation classification may change labels/order/grouping/weight, but MUST NOT silently erase the underlying evidence from inspection. Hidden-by-default low-value/dependent items require an explicit “show dependent/all” affordance rather than permanent disappearance when they remain relevant to replay.

3. ENGINE NORMALIZATION IS UNDERLAY.
Dependency/equivalence/anagram/word-order normalization runs beneath the projection to prevent inflated significance. The default display should emphasize effective independent relations while preserving transparent access to dependent/raw matches.

4. ACTUAL ITEM FIRST.
Each visible item should lead with its real expression/entity/connection and exact deterministic relation to the selected method/value. Secondary badges may expose: method identity, additional independent method families, dependent/equivalent status, rarity/frequency, source/evidence presence, curation marks and relation type. Badges are metadata; they do not replace the content.

5. SELECTED-METHOD SCOPE.
The lens is anchored to a selected calculation: expression + canonical method + value + provenance. It must be able to answer specifically “what else is here in THIS method at THIS value?” rather than only returning root-wide or cross-method discovery.

6. CROSS-METHOD DISCOVERY IS ADDITIVE.
When an item also meets the active expression through additional methods, show those crossings as additional structure. Dependency-normalized independent-family count may be shown, but raw method count must not be mistaken for independent strength.

7. FREE DETERMINISTIC ANALYSIS.
Method Lens deterministic lookup, dependency normalization, relation-engine classification, canonical Trace and honest structured explanation are core engine/research projection capabilities and MUST NOT require Raziel/LLM merely to reveal what the engine/database already knows, subject to ordinary access policy for the underlying data.

8. HUMAN-READABLE STRUCTURED MESSAGE WITHOUT LLM.
The projection MAY generate concise deterministic sentences from structured engine facts (for example “2 independent method families; רגיל+גדול collapse under this input condition”), provided every statement is reproducible from canonical engine/Registry/relation outputs. This is presentation logic, not AI interpretation.

9. AI / RAZIEL IS A SEPARATE DEPTH.
Raziel may interpret significance, search broader governed context, synthesize sources or recommend next research steps after explicit invocation and entitlement. Raziel does not own the base matching list and must not be required to expose deterministic Method Lens results.

10. SHARED PROJECTION.
Calculator and Number consume the SAME Method Lens projection/semantics. Calculator may open it in an in-place Inspector/Panel; Number may render it inside its Method Inspector. No duplicate normalization logic, query semantics or separate “Calculator Method Lens” vs “Number Method Lens”.

11. PERFORMANCE.
Method Lens is NOT part of keystroke critical path. Instant Calculator typing remains Profile-only. Method Lens may load lazily after explicit result/method selection. Bounded reverse lookup and deterministic relation normalization are allowed at selection depth; LLM/deep search remains explicit-action only.

12. TRUTH BOUNDARY.
Match/equality is deterministic engine fact when verified. Independent-family count/dependency classification is relation-engine analysis. Rarity/rank is an attribute. Interpretation/significance remains separate. None of these automatically canonicalizes or publishes a research claim.

OWNER CHECK: EXTEND_EXISTING experience_governance_foundation_v1 + gematria_engine + canonical_methods_registry + cross_vs_convergence_criteria. No new engine, Registry, Search Store, Method Store or AI system.



[UPDATE · Human-Gate ZURIEL · 24.9.2026 — GEMATRIA METHOD ACTION GRAMMAR 2029 · ALL SURFACES · EXTEND_EXISTING]

PURPOSE
Any 2029 surface that exposes a canonical Gematria method must reuse one interaction grammar over the SAME Calculation Selection. This is a presentation/transition invariant, not a new Calculator, Heichal, Beit Midrash, Registry or engine.

1. ONE CALCULATION SELECTION.
The stable interaction identity is exact expression + canonical method/version + deterministic result + provenance/context. Moving between Beit Midrash, Calculator, Number and Heichal preserves this identity and exact-return context.

2. CANONICAL USER ACTION GRAMMAR.
Where applicable, method surfaces should use these semantic actions:
- “נסה כאן” = bounded in-place single-method test using canonical Profile/engine only.
- “ראה פירוט” = deterministic calculation detail / Trace / decomposition for the selected method when available.
- “ראה פתיחה” = canonical Opening/decomposition projection when supported; derived totals remain DERIVED_OPERATION.
- “פתח במחשבון” = continue the SAME expression+method+result in Calculator 2029, where all methods / Method Lens / Compare may be available.
- “חקור בהיכל” = continue the SAME Calculation Selection into Heichal deep research.
Visible wording may adapt slightly to context/locale, but semantic action identity and handoff must remain the same.

3. BEIT MIDRASH ROLE.
Beit Midrash = learn one method and try one method. Its inline tester is a MINI METHOD TESTER, not another full calculator:
- one active method at a time;
- one expression input;
- canonical result only;
- optional bounded Trace/detail/opening;
- explicit exits to Calculator and Heichal with exact context.
It MUST NOT expand into all-method browsing, broad Method Lens discovery, Compare workspace, World scan or Raziel/deep-research orchestration merely because those exist elsewhere.

4. CALCULATOR ROLE.
Calculator = calculate/select/explore across canonical methods. Selecting a method/result first stays local and may reveal detail/opening/Method Lens/Compare progressively. It does not force navigation to Heichal.

5. HEICHAL ROLE.
Heichal = deep research over the SAME calculation identity. “חקור בהיכל” means deeper tools/context, not a more authoritative calculation and not a different formula. Calculator/Beit Midrash deterministic truth must match Heichal because all consume the same engine/Registry.

6. COMPLEX METHODS.
Rich methods (for example cumulative/triangle/square/miluy-depth families) may expose large decompositions locally through progressive disclosure: compact summary first, then “ראה פירוט/ראה את כל השלבים”. Large output alone is NOT a reason to force the user into Heichal.

7. INPUT IS AN ANCHOR.
Opening/detail MUST NOT silently replace the main input expression. The original expression stays the current anchor. A transformed output may become a fresh Calculator input only through an explicit user action and only when canonical transformed text/lineage is available; provenance must remain reconstructable.

8. NO DUPLICATE CALCULATORS.
A mini tester in Beit Midrash, Method Inspector in Number or local detail panel in Calculator are projections of the same engine capability. They MUST NOT own local formulas, copied method arrays, private method catalogs, alternate result truth or separate calculation history.

9. PROGRESSIVE DISCLOSURE.
Default public flow: result first → bounded detail/opening on demand → full Calculator if broader calculation work is desired → Heichal if deep research is desired. Deep research is not loaded merely to test or understand one method.

10. TRUTH / INTERPRETATION BOUNDARY.
Deterministic result/Trace/opening comes from canonical engine/Profile/Trace/Opening readers. Method meaning/“רעיון מחקרי” is shown only when canonically sourced. Missing interpretation stays missing; UI does not invent it.

11. SHARED ACTION IDENTITY ACROSS SURFACES.
The same semantic actions should route consistently from Beit Midrash, Calculator, Number Method Inspector and future method cards. Placement may differ by surface, but “Try / Detail / Opening / Calculator / Heichal” must not change meaning or lose context.

OWNER CHECK: EXTEND_EXISTING experience_governance_foundation_v1 + research_workspace_law + canonical_methods_registry_law + gematria_engine_law. No new method-interaction system/store/engine/context.




—— CONTEXTUAL PROJECTOR PLACEMENT LOCK · Human-Gate ZURIEL · 6.10.2026 ——
EXTEND_EXISTING only. This is an Experience placement decision, not a new Projector system/store/engine.

1. INTERNAL ROLE.
The contextual projector is an internal composition capability over existing canonical owners: Reality Graph + governed Findings/Claims + Time/Axis data + Explainable Prominence + Research Context. It does not own truth, identity, ranking, follow state, notifications, media or persistence.

2. PRIMARY DAILY PROJECTION = CONTEXTUAL SIDECAR.
Desktop primary projection is the shared left Contextual Sidecar / Contextual Inspector. Mobile projects the same state as the Bottom Context Sheet. This is where a user sees “what is connected now” while reading/browsing without leaving the current surface. Keep the visible set bounded and explainable.

3. DEPTH PROJECTION = WORLD.
World is the deep-expansion surface for the same context: full convergence neighborhood, timeline, typed relations, branches, media, sources, people/places, cross-time links and journey continuation. World does not fork identity from the Sidecar; it expands the same canonical context.

4. DISCOVERY PROJECTION = HOME.
Home receives only high-signal/prominent discovery cards selected through the existing explainable prominence/curation owners. Home is not the full graph and must not become a raw relationship dump. Examples: “new strong connection to 7.10”, “FZ1073 convergence strengthened”, “new connection in Lebanon/Hezbollah family”. Clicking preserves context into Sidecar/World/Post.

5. ENTITY/SURFACE PROJECTIONS.
Post, Number, Date, Event, Person, Place, Topic/Series and other eligible 2029 surfaces consume the same projector/result bundle, each through its own projection contract. A Number page emphasizes numeric relations; an Event/Date surface emphasizes occurred-time and event family; a Post emphasizes story/provenance; none creates a parallel semantic truth.

6. RAZIEL.
Raziel consumes the same Research Context + projector explanation payload. Raziel explains why something is relevant, can suggest a next action/follow choice, and may traverse governed relations. Raziel does not own or invent the graph/projector, cannot independently canonicalize, and cannot dispatch follow notifications.

7. FOLLOW.
Projector/prominence may recommend which durable identity is worth offering to Follow. Actual Follow identity resolution/state/dispatch remains under subscription_funnel_law and explicit user consent. “Worth showing” != “subscribed”.

8. ONE-WRITE PROPAGATION PRINCIPLE.
A new governed observation/finding is written once to its canonical owner/identity/provenance. Number/Event/Timeline/Post/World/Home/Raziel/Follow surfaces learn about it by projection/query; they are never manually synchronized with copies. If a new 1073 finding is added, no separate updates to 7.10, World or Raziel are required.

9. DISTANCE + CONTEXT.
Direct typed relations normally outrank distant paths. Distant “gates” may surface when contextual prominence supports them through independent evidence, specificity, cross-domain diversity or journey value. The projector must return the reason/path so UI can say “why this is connected”.

10. NO PROJECTOR PAGE.
There is no standalone public “Projector” destination. Users encounter its output in context:
- daily/current: left Sidecar / mobile Bottom Sheet;
- depth: World;
- discovery: Home;
- exact identity: entity/page surfaces;
- explanation/navigation: Raziel;
- continued attention: Follow/Personal Area.

Acceptance: one context, one identity tree, multiple projections; bounded Sidecar; World is depth not duplicate; Home is discovery not dump; Raziel/Follow consume but do not own; one governed write propagates by projection.


## V10 — טעינה ממוקדת ותוכן טרי ב־2029 · Human Gate ZURIEL · 16.10.2026

מצב: APPROVED GOVERNANCE POLICY / NOT IMPLEMENTATION ACCEPTANCE.
OWNER CHECK: EXTEND_EXISTING experience_governance_foundation_v1_law.
מקור ההחלטה: project_codex id=37, slug=sod1820_reality_stream_os_master_v3_20261016_draft, פרקים 17, 25, 28.1, 29.3 ו־29.5, יחד עם הבהרת צוריאל בשיחה ב־16.10.2026: המסרים החדשים במרכז, הגלריות כארכיון נגיש לפי דרישה, ובקשתו לקבע זאת בחוקים כדי למנוע עבודה כפולה.
המקור הוא תכנון והיסטוריית החלטה. סעיף זה הוא הגוף הקנוני היחיד למדיניות הטעינה שאומצה; שאר V3 נשאר DRAFT לפי פרק 29.

1. תוכן רלוונטי תחילה. הכניסה הרגילה ל־2029 מובילה בתוכן חדש ומאושר, ובתוכן שהמשתמש בחר לקרוא או לחקור. ארכיון הגלריות וכל ההיסטוריה אינם נטענים או מוצגים בשלמותם כברירת מחדל. בקשת ארכיון מפורשת פותחת תוצאה תחומה ממנו. מקור ישן עם קשר ישיר, מוסבר ומורשה למוקד הנוכחי יכול להשתלב בתוצאה הראשונה לפי research_gold_hints_law; ישן אינו מחוק, וחדש אינו אמת או חשיבות אוטומטית.

2. תוכן ראשי אינו ממתין להעמקה. כרטיס מבקש כותרת/תקציר/זהות/תאריך בעל תפקיד ברור/תמונת תצוגה ושדות ההרשאה הנחוצים. הוא אינו מבקש גוף פוסט מלא או גרף מלא כדי לצייר תקציר. דף פוסט שנפתח בכוונה מציג את התוכן הקריא שביקש המשתמש; אין לדחות אותו בשם lazy loading. תמונה או מדיה החיוניות להבנת המקור שומרות כיתוב, ייחוס ועוגן. שלד, הודעת תקלה וספירה שטרם הושלמה אינם תוכן שמיש או תוצאה מאומתת.

3. עומק לפי דרישה. גלריה מלאה, היסטוריה מלאה, קשרים רחוקים, גרף מורחב, חלונית מספר עמוקה, רזיאל ומסעות אינם מחסום לכניסה רגילה. קוד ונתונים שלהם נטענים בעת פתיחה/בחירה או טעינה מקדימה תחומה המוצדקת בכוונת המשתמש. דחיית כל אותה עבודה ל־timer אחרי הציור אינה הוכחת חיסכון. גלילה אינה מפעילה סריקה כבדה של הארכיון. שיטות/ספירות/סדר/תוצאות נשמרים; חלון תוצאות קטן אינו מוצג כמכלול מלא.

4. עיבוד מקור מתרחש מחוץ לקריאת המבקר. חילוץ, OCR, מיפוי מקטעים/תאריכים והכנת קשרים מתבצעים דרך בעלי Intake/Research/Graph הקיימים בעת קליטה או שינוי מתאים, ובמנות תחומות. לאחר שינוי מקור, אישור, שיטה או הרשאה מעדכנים/מבטלים רק נגזרות מושפעות לפי התלויות. "פעם אחת" פירושו שימוש חוזר בתוצאה תקפה, לא תוצאה שאינה מתעדכנת. המלצה ל־index/cache/precompute אינה אישור לטבלה, מנוע, job או store חדשים; נדרשת הוכחת צורך ושיוך בעלים במשימת המימוש.

5. זכאות לפני שליפה ומטמון. רק נתונים המותרים לקורא נכנסים לתוצאה ולספירותיה. אין הסתמכות על הסתרת רכיב או גלריה כתחליף להרשאה בשרת. מטמון ציבורי אינו מכיל טיוטה, מידע פרטי או תוצאת מנהל. גרסת מקור, מוקד והרשאות נשמרים לפי חוזי הבעלים, וביטול פרסום/הרשאה חייב למנוע הגשת נגזרת ישנה שאינה מותרת. אינדקס או מד לא מרחיבים הרשאות.

6. עולם אחד. Research OS / Reality Graph, זהויות, חישובים, מקור, תאריך ופרסום נשארים אצל בעליהם. יחידות תוכן הן מקטעי מקור, לא יסוד/חוזה־על חדש. העולם, הבית, הפוסט, המספר והארכיון מקרינים אותן זהויות בלי העתקי אמת. פרסום מקור, עדכון מקור, יבוא ומועד האירוע נשארים מובחנים. שוויון מספר או תגית אינם יוצרים קשר מאושר, אירוע או הורות.

7. סדר עבודה וקבלה. ממשיכים תיקוני ביצועים קיימים מהבסיס המאומת; אין התחלה מחדש ואין חובת מיפוי כל הארכיון כתנאי להאצת הליבה או לסגירת G4. בוחרים תיקון לפי תרומתו הנמדדת למסלול הראשי, עם בדיקה תואמת ל־SHA/קלט/פרופיל, cold מול ניווט, תוכן נראה, קריאות/בתים, זמן מסד מיוחס, כשל/ריק, חזרה והרשאות. מסכים עתידיים צורכים את הכלל הזה ואת שערי הביצועים הקיימים. המד המשותף החדש, מסעות מתקדמים ו־VR אינם תנאי לסגירת ביצועי הליבה.

8. גבול האימוץ. אושרה מדיניות הטעינה והקדימות שבסעיף זה בלבד. מיקום/עיצוב המד המשותף, נוסחתו ומשקלותיו, חוויית הזרם הכוללת, שינוי ציונים, מיתוג/נתיבים חדשים, מיפוי הארכיון והפיילוטים החדשים נשארים DRAFT עד ההחלטות הרלוונטיות. quality, convergence_meter ו־Gold/Diamond אינם מתאחדים לציון אמת אחד. אין בתוספת אישור לשינוי קוד, נתוני מוצר, RLS/מתגים חיים, Legacy, merge, CI או פריסה. ביצוע ושחרור נשארים משימות נפרדות תחת הבעלים והשערים הקיימים.

מניעת כפילות: ממשיך קורא את הסעיף הזה דרך Experience Governance. V3 והמסירות מצביעים אליו; אין ליצור "חוזה זרם" או "חוק מהירות" מקביל לאותה אחריות. פרקים שטרם אומצו ב־V3 נשארים תכנון מקור, ואימוצם העתידי נעשה אצל בעליהם בנפרד.
$sod_txt$, updated_at=now() where id=30;
end
$sod_rb$;

-- rollback project_codex #1 _index: restore the exact base body (md5 fd0ac4629412ea51965cf9213fda18e2)
do $sod_rb$
begin
  if (select md5(body) from public.project_codex where id=1) <> 'a409c228c4e561282d42659f87449807' then raise exception 'rollback codex _index: body is not the applied version'; end if;
  update public.project_codex set body=$sod_txt$טבלה זו (project_codex) היא ספריית מפרטים/הקשר ותיעוד של SOD1820. היא אינה bootstrap חובה, אינה Owner Index ואינה מקור-אמת מקביל. ברירת-המחדל: פתור owner קודם דרך `SOD1820_MASTER_OWNER_INDEX.md` + הבעלים החיים, ואז קרא רק את ה-slug/המפרט שאליו אותו owner מפנה. אין לקרוא את כל project_codex לפי הסדר בתחילת משימה.

מקורות ידע משלימים בתוך ה-DB (לא רק כאן):
- `work_log` — Coordination/Provenance Ledger בלבד. לבוטסטרפ קוראים רק רשומות CURRENT ורלוונטיות לסקופ (`work_log_current` או שאילתה שקולה), לא dump היסטורי מלא.
- `nodes where type='rule' and is_active` — חוקי המערכת הפעילים (מנוהלי-גרסאות, לא נמחקים).
- `nodes where type='entity' and metadata->>'source'='entity_seed_v1'` — גרף ישויות הגימטריה (+ `edges`, + `gematria_words`).
- בריפו: `CLAUDE.md` (הנחיות פרויקט) ו-`docs/`.

עקרון-על של הפרויקט: "אני הכי למטה בעץ ותמיד אפשר להרחיב" — ליבה קטנה, מדויקת ומקובעת, שכל תוספת נתלית עליה. מעדיפים עומק על פני כמות. הרחבות = batch קטן ובדוק, לא מרוץ למספרים.

━━━━━━━━━━━━━━━━━━━━━━━━
■ G1 AUTHORITY SPLIT / LIVE-FIRST (עודכן 12.9.2026)\nהקודקס הוא pointer/context בלבד. אין startup chain קבוע של Roadmap + Master + CLAUDE + כל rules.\nAuthority נשמר לפי תפקיד: live DB + `origin/main` + Production הרלוונטי = live reality; owner דומייני פעיל = semantics; Master State = documented state; Roadmap = navigation/priority; work_log = coordination/provenance; adapters/codex/memory = pointers/context.\nאם pointer בקודקס סותר owner/live state — מדווחים DRIFT וה-owner/live state גוברים. Master/Roadmap נטענים רק כשהמשימה דורשת documented-state/navigation או reconciliation.\n\nשורות מסומנות ⚠️ STALE אינן משקפות מצב נוכחי. שורה בקטגוריה pointer היא שלט-הפניה בלבד.

━━━━━━━━━━━━━━━━━━━━━━━━
■ AGENT GOVERNANCE OWNER ROUTER v1 — קרא לפני יצירת חוזה/חוק/מערכת (ZURIEL Human-Gate, 7.9.2026)

מטרה: זהו Router/Index בלבד — לא Source of Truth חדש, לא חוזה נוסף, לא טבלה חדשה. הוא מפנה כל סוכן לבעל-הבית הקנוני הנכון לפני עבודה.

BOOTSTRAP / G1 TASK START (pointer-only):\n1. natural-language task → intent/capability/domain (Task Profile רק כשמועיל).\n2. resolve current canonical owner from Owner Index + live owner infrastructure.\n3. load owner + smallest direct dependencies under Read Budget.\n4. read recent relevant CURRENT work_log/assignment context בלבד.\n5. verify the live source appropriate to the claim, then execute/verify/handoff.\nFull Master State, full Roadmap, all active rules, all project_codex, broad branch archaeology and unrelated contracts are NOT default startup reads.\n\nOWNER CHECK חובה לפני Contract/Law/System/Store/Engine/Registry/global UI owner חדש:
- בדוק owners קיימים ב-nodes/project_codex/main.
- החזר verdict אחד בלבד: EXTEND_EXISTING / SUPERSEDE_EXISTING / GENUINELY_NEW_DOMAIN.
- ברירת-מחדל = EXTEND_EXISTING. GENUINELY_NEW_DOMAIN דורש הוכחה שאף owner קיים אינו מתאים.
- שמות דומים אינם הוכחה לכפילות; בודקים אחריות/סמכות/צרכנים.

ROUTING MAP — בעלי-בית מרכזיים:
- One Tree / Reality Graph / identity-vs-representation / contextual center → reality_graph_law (+ unified_graph_law where referenced).
- Research intake/source/provenance/orchestration → research_intake_foundation_contract_law / project_codex research_intake_foundation_contract.
- Research OS / Context / Finding / Journey / Workspace composition → docs/research-studio-v1-contract.md + docs/research-universal-finding-contract.md + existing ResearchProvider/Workspace owners.
- Truth / verification / governance / publication-access separation → truth_axes_foundation_law.
- Experience ownership/lifecycle/localization/design crosswalk → experience_governance_foundation_v1_law.
- Public product language/visual language/typography/icons → SOD1820_DESIGN_CONTRACT_V1.md.
- Global navigation/context rail/bottom controls → docs/sod1820-system-frame-contract-v1.md.
- Traffic/analytics measurement truth → traffic_intelligence_law. Product experiments consume it; they do not create a second analytics truth owner.
- Follow/notifications/channels → subscription_funnel_law.
- Gematria method identity/registry/lifecycle/execution-scan governance → canonical_methods_registry_law + method_lifecycle + engine_governance_registry_authority_law; no local method truth.
- ELS → els_single_engine_law + els_research_layer_law; one engine, many projections.
- Person/personal-data identity foundation → person_foundation_contract_law + identity_architecture_law where applicable.
- Inter-agent scope/owner/specialist coordination → inter_agent_coordination_law (current active version).
- Release/merge/deploy → deploy_on_request + live git/deploy state.

STATE CHECK — לעולם לא לערבב:
PROPOSED ≠ APPROVED ≠ IMPLEMENTED ≠ MERGED ≠ DEPLOYED ≠ LIVE ≠ VERIFIED. Branch-only ≠ missing; work_log claim ≠ implementation; canonical ≠ published.

PRESERVATION / NO-LOSS:
- אין מחיקת היסטוריה כדי 'לנקות'. supersede/archive/deprecate עם provenance.
- לפני איחוד: שמור כל משמעות ייחודית, identity, truth, provenance, decisions ו-release evidence; מותר להחליף interface/wording/legacy owner.
- work_log נשאר provenance/coordination ויכול להיארכב מאוחר יותר; הוא אינו Product SSOT.
- Codex/Rule ישן שסותר owner מאוחר יותר מסומן HISTORICAL/STALE/SUPERSEDED — לא נשאר בעל-בית פעיל במקביל.

Agent mantra: FIND OWNER → VERIFY LIVE → EXTEND FIRST → PRESERVE HISTORY → HUMAN GATE → IMPLEMENT → VERIFY RELEASE STATE.


■ FOLLOW COMPLETION ROUTER — 7.9.2026
לכל בניית משטח תוכן עם מעקב, גם עתידי: קרא את הגרסה הפעילה של subscription_funnel_law, במיוחד סעיף v18 SHARED FOLLOW → VERIFIED IDENTITY → CONSENTED CHANNEL, ואת subscribe_gate_law. WatchButton (כל variants) + EmailVerify + notification_prefs + Dispatcher הקיימים הם אותו מנגנון; אין פתרון מיוחד למימד חמש. טבלת-קבלה למשטח חדש וגבולות identity/consent/delivery מפורטים בחוק, לא משוכפלים כאן. יומן התיאום: SHARED_FOLLOW_SIGNUP_COMPLETION_V1. GOVERNANCE APPROVED אינה הוכחת יישום/מסירה; מצב שחרור נבדק מול main/DB/tests. זהו pointer בלבד.

━━━━━━━━━━━━━━━━━━━━━━━━
■ LAW TREE / CLASSIFICATION ROUTER v1 — 8.9.2026 (ZURIEL Human-Gate)

מטרה: למנוע Law Sprawl ובלבול-סוכנים. החוקים מסודרים לפי אחריות, לא לפי עמוד/feature/שפה. Feature חדש אינו מקבל אוטומטית חוק חדש.

שרשרת הקריאה המחייבת:
0. META / OWNER ROUTER → project_codex._index + SOD1820_MASTER_OWNER_INDEX.md
1. FOUNDATION / GOVERNANCE → בעל-הבית הארכיטקטוני של התחום
2. DOMAIN STATE OWNER → חוק אחד שמחזיק את הסמנטיקה של התחום
3. CONFIG / DATA → רשומות מצב/קונפיגורציה תחת אותו owner; אינן חוקים
4. PROJECTION OWNERS → שפה/ייצוג/עיצוב/ניווט; צורכים את ה-state ואינם משכפלים אותו
5. IMPLEMENTATION CONSUMERS → routes/components/readers/writers/SEO adapters

CLASSIFICATION PATHS מרכזיים:
- governance/agents/owners → inter_agent_coordination_law + live_state_sync_law
- foundation/reality → reality_graph_law
- experience/governance → experience_governance_foundation_v1_law
- experience/access/availability → site_flags_lock_law (ACTIVE v3)
- experience/localization/content → content_translation_law
- experience/ui/components → canonical_ui_components_law
- experience/frame/navigation → docs/sod1820-system-frame-contract-v1.md
- research/* → Research OS owners listed above

INHERITANCE RULE: חוק-על אינו משוכפל בחוקי-ילד. הילד מצביע לבעל-הבית ומוסיף רק סמנטיקה ייחודית לתחום שלו. Feature-specific state (למשל lock_forum) הוא DATA תחת site_flags_lock_law, לא forum_lock_law. שפה היא Projection: אין lock_forum_en/ru ואין availability נפרד לכל locale.

AGENT DECISION: לפני חוק חדש, מצא classification_path + owner קיים. אם ניתן לתלות את השינוי ב-owner קיים → EXTEND_EXISTING. מסך/שם/שפה/feature חדשים לבדם לעולם אינם GENUINELY_NEW_DOMAIN.

GLOBAL CHANGE EXAMPLE: "סגור פורום" → update אחד ב-site_flags.lock_forum → resolver קנוני → כל routes/home/community/post/entity/cipher/nav/feed/counters/write-actions וכל locale מציגים אותו מצב. תרגום משנה copy בלבד, לא access semantics.


━━━━━━━━━━━━━━━━━━━━━━━━
■ AGENT MEDIA UPLOAD CAPABILITY POINTER — 9.9.2026

Current live capability: GPT can upload real image binaries to canonical Supabase Storage through the existing AGENT_MEDIA_UPLOAD_BRIDGE_V1 / agent-upload Edge path. The release is recorded in work_log AFTER id 0010c1de-aebd-4051-90ef-c2a5a6c6052a (MERGED · EDGE LIVE · E2E real PNG verified). Base64 mode exists specifically for GPT runtime and supports image uploads up to 8 MiB; larger binaries use the bridge raw/signed modes.

ROUTING RULE: when ZURIEL asks GPT to upload a generated/selected image to the site, do NOT infer inability merely because the GitHub connector cannot write binary files. Resolve the live media-upload capability first and use the existing bridge if still live. This is a runtime-capability pointer, not a permanent guarantee: freshness-check the bridge/live project before write. Reuse only; no second upload system. Canonical project remains linswmnnkjxvweumprav.


━━━━━━━━━━━━━━━━━━━━━━━━
■ AGENT MEDIA STORAGE / INGRESS 2029 — Human-Gate ZURIEL · 17.9.2026

OWNER CHECK=EXTEND_EXISTING. Transport owner remains AGENT_MEDIA_UPLOAD_BRIDGE_V1 / agent-upload; media/source/provenance semantics remain under the live Research Intake / Representation owners. No new media registry/store/graph/truth owner. `media_map` is not repurposed as a 2029 registry.

FORWARD-ONLY PHYSICAL STORAGE CONVENTION for all NEW AGENT-ORIGINATED 2029 media:
- bucket: `media`
- root: `sod1820/agent/2029/<kind>/YYYY/MM/<asset-id>/...`
- kind: image | video | audio | document
- asset-id: UUID generated once; title/slug is not identity.
- original source binary: `original.<ext>`
- derivatives: `derivatives/<role>.<ext>` (hero/card/thumb/og/poster/preview etc.)
- captions: `captions/<lang>.vtt` under the same video asset-id.
- immutable default: no overwrite of original; preserve original separately from web derivatives.

CURRENT VERIFIED CHATGPT MOBILE IMAGE INGRESS:
ChatGPT attachment/generated file → Dropbox temporary file → Dropbox single-use temporary download URL → live `agent-upload?mode=url` → canonical Supabase `media` path → read-back size/MIME/SHA/public-URL verification. Dropbox is transport only and may be cleaned after verified persistence.

VIDEO: storage location is already locked to the same tree (`.../video/...`). Large-video transport is NOT yet declared implemented: do not push large video through the buffered image URL relay. Build/use resumable/direct TUS/signed/multipart transport as a separate bounded implementation that lands in this SAME tree.

LEGACY: do not move/rename/backfill historical paths merely for cleanliness (`gallery/sod1820/videos`, `media/uploads/*`, `gallery/posts/*`, `media/sod1820/videos`, etc.). They remain compatibility/provenance until an explicit migration gate.

Repo implementation convention candidate: `docs/sod1820-media-ingress-storage-convention-v1.md` + `scripts/agent-media-path.mjs` on task G3_MEDIA_INGRESS_STORAGE_CONVENTION_2029_V1. Until merged, exact repo state remains BRANCH-ONLY; this Codex block records the Human-Gate storage decision and routing only.
$sod_txt$, updated_at=now() where id=1;
end
$sod_rb$;

-- rollback identity_architecture_law: v2 → v1 (no row is deleted; v2 stays as an inactive row)
do $sod_rb$
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='identity_architecture_law' and rule_version=2 and is_active) then
    raise exception 'rollback identity_architecture_law: v2 is not the active version'; end if;
  update public.nodes set is_active=false where type='rule' and rule_id='identity_architecture_law' and rule_version=2;
  update public.nodes set is_active=true  where type='rule' and rule_id='identity_architecture_law' and rule_version=1;
end
$sod_rb$;

-- rollback experience_governance_foundation_v1_law: v11 → v10 (no row is deleted; v11 stays as an inactive row)
do $sod_rb$
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='experience_governance_foundation_v1_law' and rule_version=11 and is_active) then
    raise exception 'rollback experience_governance_foundation_v1_law: v11 is not the active version'; end if;
  update public.nodes set is_active=false where type='rule' and rule_id='experience_governance_foundation_v1_law' and rule_version=11;
  update public.nodes set is_active=true  where type='rule' and rule_id='experience_governance_foundation_v1_law' and rule_version=10;
end
$sod_rb$;

-- rollback subscription_funnel_law: v23 → v22 (no row is deleted; v23 stays as an inactive row)
do $sod_rb$
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='subscription_funnel_law' and rule_version=23 and is_active) then
    raise exception 'rollback subscription_funnel_law: v23 is not the active version'; end if;
  update public.nodes set is_active=false where type='rule' and rule_id='subscription_funnel_law' and rule_version=23;
  update public.nodes set is_active=true  where type='rule' and rule_id='subscription_funnel_law' and rule_version=22;
end
$sod_rb$;

-- rollback worlds_color_law: v2 → v1 (no row is deleted; v2 stays as an inactive row)
do $sod_rb$
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='worlds_color_law' and rule_version=2 and is_active) then
    raise exception 'rollback worlds_color_law: v2 is not the active version'; end if;
  update public.nodes set is_active=false where type='rule' and rule_id='worlds_color_law' and rule_version=2;
  update public.nodes set is_active=true  where type='rule' and rule_id='worlds_color_law' and rule_version=1;
end
$sod_rb$;

commit;
