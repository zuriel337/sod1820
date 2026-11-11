# SQL 10 — הנוסח המלא אחרי השינוי (נבנה מהליטרלים של `10_p0_release_policy.sql`, SHA-256 `d1ac658b…`)

כל טקסט כאן הוא בדיוק מה שייכתב למסד. טביעת האצבע מופיעה ליד כל יעד, כך שאפשר לבדוק את הטקסט מול המסד אחרי ההרצה. ‏`10e_` מייצר בדיוק את אותם טקסטים.

## 1. deploy_on_request v4 — הנוסח המלא · תווית: «⛔ Release v4 — Explicit Approval per Merge & Deployment · No Standing Authorization»
md5 `78d80d2264e0b5062b425319b25a3e3a` · SHA-256 `9e0aac2829ffaef94170a515df3b808d73fde48a28e2e2d8455f47188e831061` · 6,532 תווים

```text
[v4 · Human-Gate ZURIEL · 10.11.2026 — אישור מפורש לכל מיזוג ולכל פריסה · אין הרשאה עומדת · 2029 הוא המוצר הפעיל היחיד]
צוריאל מחליט על כל שחרור. כל מיזוג ל-main וכל פריסה ל-Production מחייבים אישור מפורש של צוריאל לפעולה המסוימת — לקומיט ולפריסה המדויקים שהוצגו לו. אין הרשאה עומדת, ואישור אינו עובר מסשן לסשן, מפעולה לפעולה או מ-PR שמוזג. מיזוג אינו פריסה: push או מיזוג ל-main אינם יוצרים פריסה (git.deploymentEnabled=false בשני קובצי vercel.json, ולפי CLAUDE.md גם Ignored Build Step מדלג על main); פריסת Production היא פעולה נפרדת ומאושרת לפי הנוהל המתועד ב-CLAUDE.md («נוהל פריסה ל-Production מסשן ענן»). 2029 הוא המוצר הפעיל היחיד — Production מאז 4.11.2026; Legacy פרש ב-5.11.2026 ואינו יעד פריסה, Preview או חזרה.
צוברים שינויים בענף העבודה, מציגים לצוריאל מה מוכן וממתין עם המלצת שחרור (§4), ושואלים. שינויי נתונים ב-Supabase (DB, SQL, מיגרציות, Edge Functions) חיים מיד ואינם תלויים בפריסה, ולכן גם הם דורשים אישור מפורש לפעולה המדויקת (CLAUDE.md §0.4).

[v4 · consolidated release protocol — replaces the standing authorization of v2 (17.9.2026, §§1, 2, 8)]

1. EXPLICIT APPROVAL PER ACTION. ZURIEL's explicit approval is required for each specific action on its exact object: merge to main (exact head SHA); Production deployment (exact SHA and deployment); alias/domain change or rollback (exact target); DB/SQL/migration, Edge Function deployment, flag or protected Preview (exact statement/version). Approval is not inherited from an earlier session, a merged PR, a passing workflow or a general instruction, and it does not extend to another action. «תעלה»/«העלה» counts as approval only for the exact commit and deployment presented.
2. MERGE ≠ DEPLOY. A merge to main never deploys by itself. After every merge re-read the live alias before reporting deployed / not deployed (a parallel session may deploy). Report DEPLOYED only after READY + alias + live verification.
3. DEPENDENCY-AWARE BATCHING. Release follows the canonical dependency DAG/batch, not PR creation order. A higher layer waits for required lower layers. Independent clean lanes may be presented for approval independently when doing so cannot create a temporary incompatible state. Stacked/dependent PRs are composed/rebased/reconciled before release rather than blindly merged one by one.
4. RELEASE RECOMMENDATION IS MANDATORY. Every material completion/handoff classifies its release state as exactly one of: READY_FOR_APPROVAL · BUNDLE_WITH(<scope>) · BLOCKED_BY(<dependency/gate>) · SAFE_INDEPENDENT_WAITING_RUNTIME · DO_NOT_RELEASE_SUPERSEDED/PARKED, and explains the decisive dependency in plain language. READY_FOR_APPROVAL (formerly AUTO_RELEASE_NOW) means ready to be presented to ZURIEL for explicit approval — never an automatic merge or deploy.
5. RELEASE PREFLIGHT. Before presenting a release, and again immediately before executing an approved action, refresh live sync and verify at minimum: canonical owner/current main; exact head/base; open dependency/blocker state; required tests/checks; migration/RLS/security gates when touched; no active overlapping writer; rollback/recovery path; release batch compatibility. Any uncertainty that can change safety = BLOCKED, not guessed.
6. POST-RELEASE PROOF. A release is not complete at merge. Verify actual production/live object state, exact deployed version/bundle/function/migration as applicable, critical smoke/golden path, and record AFTER with MERGED/APPLIED/DEPLOYED/LIVE/VERIFIED separately. Silent deployment failure remains failure.
7. SEPARATE HUMAN DECISIONS. Release approval does not cover: canonicalizing/publishing governed research truth when the owner requires Human Gate; destructive/non-recoverable data loss; new paid prices/economics; materially weakening privacy/security; permanent deletion/retirement of preserved capability/history; or an explicit active law that names a separate Human decision. Each needs its own explicit ZURIEL decision.
8. HOLD. «תעלה» never bypasses a failed or missing gate. If ZURIEL says wait/hold, that hold applies to the named scope until lifted.
9. VERCEL/RESOURCE SAFETY REMAINS. Batch releases sensibly, preserve quota safeguards and avoid duplicate deployments. Ready work is reported to ZURIEL as READY_FOR_APPROVAL rather than held silently.

מקור וקדימות: הכרעת צוריאל 10.11.2026 — «כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.» — מחליפה את ההרשאה העומדת של v2 לפי כלל הקדימות הקיים (החלטה מאוחרת ומפורשת של צוריאל גוברת על מוקדמת). v1–v3 נשמרות כגרסאות לא פעילות.

OWNER CHECK: EXTEND_EXISTING deploy_on_request. No release scheduler/store/registry/second deployment system.

[UPDATE v3 · G3_RELIABILITY_PRECLOSE · EXTEND_EXISTING — PRODUCTION CANARY GATE FOR THE NEXT RELEASE]
1. PREFLIGHT ADDITION. RELEASE PREFLIGHT (§5) additionally requires the latest GitHub commit status with context sod1820/post-deploy-canary on the current successful Production deployment SHA to be success, unless public.fn_release_canary_override_status() reports an active bounded Human-Gate override. GitHub Actions/commit status is the release evidence; arbitrary events rows are never release evidence.
2. BLOCK, DO NOT ROLL BACK. Missing, failed or pending canary status for the exact Production SHA blocks the NEXT release only. There is no automatic rollback. Recovery = a fixing/deploy canary that passes, or an explicit audited Human-Gate override.
3. EXPLICIT AUDITED OVERRIDE. Only ZURIEL Human Gate may authorise select public.fn_release_canary_override(<reason>, <hours 1..72>); it writes work_log and expires. The public override-status reader exposes only active/expiry state, never grants an override.
4. SYNTHETIC ≠ GOLDEN. A synthetic canary PASS is a small deterministic zero-AI smoke set. GitHub workflow budget allows at most four scheduled/manual runs per UTC day; deploy-triggered runs are always evaluated. Canary never substitutes Golden/CI/security gates.
5. HEARTBEAT IS PART OF CANARY TRUTH. The external canary calls public.fn_reliability_heartbeat_status(); missing or >45m heartbeat makes the GitHub canary fail and records failure on the exact deployed SHA. The reader is read-only and exposes only age/health.
6. ONE-TIME INSTALL BOOTSTRAP. The single PR that first installs this gate may pass preflight only when its base-main does not yet contain scripts/release-canary-gate.mjs and no prior canary status exists. Once the gate runtime exists on main, every later release fails closed without exact-SHA success or explicit audited Human-Gate override.
```

**דגלי ההרשאה במטא־דאטה החדשה** (md5 של jsonb ‏`4620b9f9d94ecf9c3ca603910b12691c`):

```text
{
 "standing_auto_release": false,
 "separate_taale_required": true,
 "explicit_approval_required_per_action": true,
 "merge_is_not_deploy": true,
 "human_gate_v4": "ZURIEL 2026-11-10",
 "release_preconditions": [
  "gate_clean",
  "dependencies_closed",
  "current_main_reconciled",
  "required_checks_green",
  "security_privacy_clean_if_applicable",
  "no_overlapping_writer",
  "rollback_recovery_known"
 ],
 "explicit_human_gate_remaining": [
  "governed_truth_canonicalization_or_publication",
  "destructive_irreversible_data_loss",
  "pricing_economics",
  "privacy_security_weakening",
  "permanent_capability_history_retirement"
 ],
 "release_advice_states": [
  "READY_FOR_APPROVAL",
  "BUNDLE_WITH",
  "BLOCKED_BY",
  "SAFE_INDEPENDENT_WAITING_RUNTIME",
  "DO_NOT_RELEASE_SUPERSEDED/PARKED"
 ],
 "release_advice_state_aliases": {
  "AUTO_RELEASE_NOW": "READY_FOR_APPROVAL"
 },
 "v4_explicit_release_approval": {
  "active_product": "2029",
  "decided_at": "2026-11-10",
  "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.",
  "legacy_retired": "2026-11-05",
  "no_new_system": true,
  "owner_check": "EXTEND_EXISTING",
  "procedure_ref": "CLAUDE.md — נוהל פריסה ל-Production מסשן ענן",
  "production_since": "2026-11-04",
  "supersedes": "v2 standing authorization (§§1, 2, 8)"
 }
}
```

הוסר מהמטא־דאטה: `auto_release_preconditions` (הוחלף ב־`release_preconditions`, אותם שבעה תנאים).

## 2. inter_agent_coordination_law v18 — כל פסקה שהשתנתה, בנוסחה המלא החדש · תווית: «Inter-Agent Coordination v18 — 2029 Production · Explicit Release Approval»
md5 `0ce1688c34a59353b42c2e1b53322c78` · SHA-256 `09a21eaba07b1301e9fdeb6991f22b36856386fbf3a163dc21872b79f8bbb130` · 42,309 תווים

**שורות 5–6** (מחליפות 0 שורות בבסיס):

```text
הוראת צוריאל מחייבת — 10.11.2026 (v18): 2029 הוא Production והמוצר הפעיל היחיד; אין הרשאת שחרור עומדת.
2029 עלה ל-Production ב-4.11.2026 ו-Legacy פרש ב-5.11.2026 (קוד Legacy נשמר בהיסטוריית Git בלבד ואינו יעד פריסה, Preview או חזרה). סעיפים 75, 79 ו-80 (v12) תיארו את המצב שלפני המעבר והם היסטוריים; 76–78 נשארים בתוקף כעיקרון: חומר Legacy הוא ראיה היסטורית בלבד, לא סמכות עיצוב או ארכיטקטורה. כל מיזוג ל-main וכל פריסה ל-Production מחייבים אישור מפורש של צוריאל לפעולה המסוימת (deploy_on_request, הגרסה הפעילה). ההרשאה העומדת והשחרור האוטומטי של v13 (סעיפים 82, 86, 87) בוטלו; ייעוץ השחרור (81, 83–85, 88) נשאר, ותוצאתו המלצה לצוריאל — לעולם לא פעולה אוטומטית.
```

**שורות 8–9** (מחליפות 1 שורות בבסיס):

```text

--- HISTORICAL V1–V16: conflicting communication clauses superseded by v17; production/release clauses 75–82 and 86–88 updated by v18 ---
```

**שורות 122–123** (מחליפות 2 שורות בבסיס):

```text
[UPDATE v12 · Human-Gate ZURIEL · 16.9.2026 — 2029 TARGET / TEMPORARY LEGACY PRODUCTION BOUNDARY, additive; EXTEND_EXISTING only] — HISTORICAL PRE-CUTOVER STATE: superseded by v18 (10.11.2026); 2029 = Production since 4.11.2026
75) [HISTORICAL · superseded by v18] TEMPORARY LEGACY PRODUCTION. Until ZURIEL explicitly declares cutover, the currently deployed legacy site remains the operational production surface for real users, production verification, urgent fixes and release safety. Its being live does NOT make its routes, components, information architecture, page composition or local implementation patterns the target architecture.
```

**שורות 127–128** (מחליפות 2 שורות בבסיס):

```text
79) [HISTORICAL · cutover executed 4.11.2026 by explicit ZURIEL decision; Legacy retired 5.11.2026] CUTOVER IS EXPLICIT. No agent may assume the new site is production merely because 2029 work exists, and no agent may assume the legacy site is the long-term system merely because it is currently live. The transition point is a Human-Gate decision by ZURIEL and must be recorded with exact release/live state.
80) FRESH-AGENT ACCEPTANCE (updated by v18). A project-entry agent must be able to state without prior conversation memory: CURRENT PRODUCTION = 2029 (since 4.11.2026); Legacy is retired (5.11.2026) and is not a production, Preview or rollback target; TARGET ARCHITECTURE = 2029. Treating Legacy as current production is an entry-routing failure and must be reported as DRIFT. [Historical pre-cutover wording: CURRENT PRODUCTION = legacy/transitional until explicit cutover.]
```

**שורות 132–134** (מחליפות 3 שורות בבסיס):

```text
[UPDATE v13 · Human-Gate ZURIEL · 17.9.2026 — DEPENDENCY-AWARE RELEASE ADVICE · EXTEND_EXISTING · standing auto-release revoked by v18 (10.11.2026)]
81) AGENT OWNS RELEASE RECOMMENDATION. At completion/checkpoint, Primary Owner must tell ZURIEL what should happen operationally, not merely “waiting for תעלה”. It classifies the exact scope using the canonical release-advice states from deploy_on_request (active version) and names dependencies/bundle order.
82) [REVOKED by v18 · 10.11.2026] EXPLICIT APPROVAL, NO AUTO-RELEASE. A clean live preflight (GATE-CLEAN + DEPENDENCIES-CLOSED + CI/GOLDEN/SECURITY CLEAN as applicable + NO OVERLAP) makes a scope READY_FOR_APPROVAL; the Primary Owner presents the exact commit/deployment to ZURIEL and merges, applies migrations or deploys only after his explicit approval of that specific action. [Former v13 text: auto-release on clean state under standing authorization, without a second user prompt.]
```

**שורות 138–140** (מחליפות 3 שורות בבסיס):

```text
86) RELEASE APPROVAL DOES NOT CANONICALIZE. There is no standing release authorization (v18). Approval of a release does not grant autonomous governed-truth publication, destructive irreversible changes, pricing/economics, or other explicitly Human-Gated product decisions. Those remain separately gated.
87) USER HOLD. Explicit ZURIEL “hold/wait/do not release” for a scope creates a release hold in coordination context until lifted.
88) AFTER MUST INCLUDE RELEASE ADVICE/RESULT. Every material AFTER includes: release_advice; dependency_state; exact branch/PR/head; merged/applied/deployed/live/verified booleans/states; blocker if any; next proposed action (a merge, deploy or DB action still awaits ZURIEL's explicit approval). Session end must leave enough information for a fresh agent to continue release choreography without asking ZURIEL what to upload; approval of the action itself is still required.
```

**שורה 142** (מחליפות 1 שורות בבסיס):

```text
OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law + deploy_on_request (active version). No new queue/release store/registry.
```

**שורה 145** (מחליפות 1 שורות בבסיס):

```text
89) VISUAL DESIGN LANE. For 2029 surfaces CLAUDE is the primary writer of the visual layer: shared frame composition (rails, Raziel presence, Now), the shared component kit, per-surface composition/layout, and the final visual acceptance pass. Semantic authority stays with the existing owners: SOD1820_DESIGN_CONTRACT_V2.md + paletteTokens2029.js/designTokens.js (values; palette.js was removed on 5.11.2026), SystemFrame (frame contract), canonical_ui_components_law, experience_governance_foundation_v1_law v9. This assigns a writer lane only; it creates no design owner and changes none of those contracts. Token/contract/icon-family changes go through their owner with Human Gate.
```

**המטא־דאטה של ההרשאה:**

```text
{
 "v18_2029_production_explicit_release": {
  "current_production": "2029",
  "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.",
  "explicit_approval_per_merge_and_deploy": true,
  "human_gate": "ZURIEL 2026-11-10",
  "label_corrected": "label read 'v16' while rule_version was 17",
  "legacy_is_current_production_runtime": false,
  "legacy_retired": "2026-11-05",
  "no_new_system": true,
  "owner_check": "EXTEND_EXISTING",
  "production_since": "2026-11-04",
  "release_advice_state_aliases": {
   "AUTO_RELEASE_NOW": "READY_FOR_APPROVAL"
  },
  "release_advice_states": [
   "READY_FOR_APPROVAL",
   "BUNDLE_WITH",
   "BLOCKED_BY",
   "SAFE_INDEPENDENT_WAITING_RUNTIME",
   "DO_NOT_RELEASE_SUPERSEDED/PARKED"
  ],
  "standing_auto_release": false
 },
 "v13_auto_release": {
  "auto_canonicalization": false,
  "dependency_order_agent_owned": true,
  "human_gate": "ZURIEL 2026-09-17",
  "owner_check": "EXTEND_EXISTING",
  "release_advice_states": [
   "AUTO_RELEASE_NOW",
   "BUNDLE_WITH",
   "BLOCKED_BY",
   "SAFE_INDEPENDENT_WAITING_RUNTIME",
   "DO_NOT_RELEASE_SUPERSEDED/PARKED"
  ],
  "release_recommendation_required": true,
  "separate_taale_required": false,
  "standing_auto_release": true,
  "status": "STANDING_AUTO_RELEASE_REVOKED_2026-11-10",
  "superseded_by": "v18_2029_production_explicit_release",
  "user_hold_overrides": true
 },
 "v12_2029_temporary_legacy_boundary": {
  "current_production": "LEGACY_TRANSITIONAL_UNTIL_EXPLICIT_CUTOVER",
  "fresh_agent_must_distinguish_current_vs_target": true,
  "human_gate": "ZURIEL 2026-09-16",
  "legacy_is_current_production_runtime": true,
  "legacy_is_design_authority": false,
  "new_site_cutover_declared": false,
  "no_new_owner": true,
  "owner_check": "EXTEND_EXISTING",
  "status": "HISTORICAL_PRE_CUTOVER",
  "superseded_by": "v18_2029_production_explicit_release",
  "target_architecture": "2029"
 }
}
```

## 3. foundation_closure_protocol_law v8 — כל פסקה שהשתנתה, בנוסחה המלא החדש · תווית: «Foundation Closure Protocol v8 — Bottom-Up Closure + Explicit Release Approval»
md5 `eb603a65f8a4a9a58e8d4548f0663e65` · SHA-256 `03bd388c36ef418053874b85c8f717af024320cd8ce1badabd43a56bec104e86` · 17,029 תווים

**שורות 93–97** (מחליפות 5 שורות בבסיס):

```text
[UPDATE v6 · Human-Gate ZURIEL · 17.9.2026 — RELEASE BINDING · EXTEND_EXISTING · standing auto-release revoked by v8 (ZURIEL 10.11.2026)]
RELEASE BINDING (v8). Once a bounded release scope has satisfied every applicable lower MUST, gate, dependency, current-main reconciliation, required specialist/security/privacy acceptance and release recovery condition, it is READY_FOR_APPROVAL: the Primary Owner presents the exact commit/deployment to ZURIEL and releases only after his explicit approval of that specific action (deploy_on_request, active version). Gate-clean is a precondition, never an authorization; there is no standing release authorization.
NO-SKIP REMAINS ABSOLUTE. Explicit approval does not weaken any Foundation MUST or acceptance standard. קדימה/תעלה never waive a blocker.
HUMAN-DECISION RESERVE. Explicit Human Gate remains for decisions that change canonical governed truth/publication where required, destructive irreversible state, paid product economics, material privacy/security weakening, permanent deletion/retirement of preserved history/capability, or another owner-specific Human decision.
RELEASE ADVICE. Gate closure/handoff must expose whether the scope is READY_FOR_APPROVAL (formerly AUTO_RELEASE_NOW), BUNDLE_WITH, BLOCKED_BY, SAFE_INDEPENDENT_WAITING_RUNTIME, or DO_NOT_RELEASE_SUPERSEDED/PARKED, so ZURIEL is not required to infer dependencies.
```

**שורה 99** (מחליפות 1 שורות בבסיס):

```text
OWNER CHECK: EXTEND_EXISTING foundation_closure_protocol_law + deploy_on_request (active version). No new gate system.
```

**המטא־דאטה של ההרשאה:**

```text
{
 "v8_explicit_release_approval_binding": {
  "explicit_approval_per_merge_and_deploy": true,
  "human_gate": "ZURIEL 2026-11-10",
  "no_new_system": true,
  "no_skip_unchanged": true,
  "owner_check": "EXTEND_EXISTING",
  "standing_auto_release": false
 },
 "v6_auto_release_binding": {
  "human_decision_reserve": true,
  "human_gate": "ZURIEL 2026-09-17",
  "no_skip_unchanged": true,
  "owner_check": "EXTEND_EXISTING",
  "separate_taale_required": false,
  "standing_auto_release_for_gate_clean_routine_scope": true,
  "status": "STANDING_AUTO_RELEASE_REVOKED_2026-11-10",
  "superseded_by": "v8_explicit_release_approval_binding"
 },
 "command_semantics": {
  "kadima": "within_current_gate_only",
  "taale": "explicit_approval_for_exact_presented_scope",
  "waiver": "explicit_replan_or_supersession_only"
 }
}
```

## 4. system_suggestions_law v6 — כל פסקה שהשתנתה, בנוסחה המלא החדש · תווית: «System Intelligence v6 — Resource-Aware Reliability + Explicit Release Approval»
md5 `98d4d88e16d2ec5f70dac6e5a7f98ea5` · SHA-256 `b29d2c5fa2b16c5911301872bb2b0762964fe2694dd90b4e27fcce7d6c97dca2` · 17,885 תווים

**שורה 1** (מחליפות 1 שורות בבסיס):

```text
החלטת צוריאל 12.7.2026 (הרחבת ai_style_learning_law לכל המערכת, לפי פרוטוקול שהציע וצוריאל אישר): «המערכת לעולם אינה משנה את עצמה. היא רק לומדת, מסבירה ומציעה.» חמישה שלבים: (1) Observe — כל רכיב רושם תצפיות (ai_analysis_log, relation_evidence, אירועים). (2) Detect — detect_suggestions() רץ מחזורית ומזהה דפוסים חוצי-סף (כרגע גלאי style_continue_rate: סגנון עם ≥40 ניתוחים ופער continue-rate ≥10 נק׳; ו-pending_ratings ≥20). (3) Suggest — יוצר שורה ב-system_suggestions (category ai/ux/research/performance/knowledge, title, dedupe_key אנטי-ספאם; לא מעלה שוב משהו שנדחה ב-30 יום). (4) Explain — כל המלצה נושאת reason + observed(jsonb הנתונים) + confidence(0-100, היוריסטיקה מסומנת ככזו) + sample_size + estimated_impact. (5) Decide — רק צוריאל: admin_suggestion_decide → accepted/rejected/later/pending. UI: טאב אדמין «🧠 המלצות המערכת» (כרטיסי Confidence/Reason/Observed/Impact + קבל/דחה/המתן, טאבי-סטטוס). ⛔ אין ביצוע אוטומטי של המלצה — קבלה = החלטה אנושית, המימוש ידני. השומר (system-watchman): edge function + cron שבועי (jobid 19, ראשון 08:00) — מריץ גלאים, בונה site_pulse(7), ושולח דייג׳סט (אימייל Resend + וואטסאפ wa_send) רק כשיש משהו מעל-סף (worth); admin_notify (server-only) מחזיק יעדים; admin_fire_watchman = «שלח עכשיו». תלות-קונפיג של צוריאל: (א) וואטסאפ דורש chat_id פרטי (@c.us) שהוא מזין בפאנל — לא נשמר בקוד/אתר; (ב) אימייל דורש RESEND_API_KEY ב-Edge secrets (בבדיקה חזר no_resend_key). RPCs: suggest_add/detect_suggestions/site_pulse (service) · admin_suggestions_list/decide/notify_get/set/fire_watchman (rd_is_admin). רכיב: SystemSuggestionsTab.jsx (מסוף הניהול הישן; הוסר ב-5.11.2026, #1239). הרחבה עתידית: גלאי UX/Performance/Knowledge + A/B כשתצטבר תנועה.
```

**שורה 40** (מחליפות 1 שורות בבסיס):

```text
19. RELEASE REUSES deploy_on_request. Patch/minor routine maintenance may be released only after current-main reconciliation, dependency closure, peer-resolution, CI/Golden/security checks and no writer overlap, and then only with ZURIEL's explicit approval of the exact merge/deploy (deploy_on_request, active version; no standing authorization). Major runtime/framework upgrades remain Foundation changes: they may be prepared after Human acceptance but require Foundation redesign-risk challenge and any applicable Human Gate before release.
```

**המטא־דאטה של ההרשאה:**

```text
{
 "human_gate_v6_release": {
  "changed": [
   "§19: release reuses deploy_on_request (active version) only with explicit approval",
   "SystemSuggestionsTab.jsx marked removed (5.11.2026, #1239)"
  ],
  "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.",
  "human_gate": "ZURIEL 2026-11-10",
  "no_new_system": true,
  "owner_check": "EXTEND_EXISTING"
 }
}
```

## 5. project_codex #9 branches_deploy — הגוף המלא החדש
md5 `8d87b8459f2fec3c25f9bf7cea443d3b` · SHA-256 `e2e955afda91c3b5affc3fec6ee5aa853c019f72fb2a1dd8fd323cbed49aba9a` · 3,079 תווים

```text

# Branches & Deploy — vercel.json re-read at main 932aba4bd (11.11.2026); release policy per ZURIEL 10.11.2026

Canonical owner: `deploy_on_request` (active version).
This codex is an operational projection of the live owner + current `vercel.json`; it is not a second deployment law.

## Production
- 2029 is the only active product: Production since 2026-11-04. Legacy was retired on 2026-11-05 and is not a deployment, Preview or rollback target.
- `main` is the release source, not an automatic deployment. A merge or push to `main` does not create a Production deployment: `git.deploymentEnabled=false` in both `vercel.json` roots (repository root and `public-reading-deploy`), and per CLAUDE.md the project's Ignored Build Step skips `main` builds.
- A Production deployment is a separate, manual action for an exact `main` SHA (Vercel MCP, per CLAUDE.md «נוהל פריסה ל-Production מסשן ענן»). Every merge to `main` and every Production deployment, alias change or rollback requires ZURIEL's explicit approval for that specific action. There is no standing authorization.
- Never use production as a workaround for Preview tooling.

## Development branches
Current `vercel.json` (both roots) sets `git.deploymentEnabled: false` globally. By Vercel's semantics no branch — `main`, `gpt/*`, `claude/*`, `preview/*` or any other — creates a deployment merely by being pushed. (Live Vercel project settings were not re-read in this pass.)

Superseded, kept as history (2026-09-23): the per-branch map (`gpt/g3-topic-golden-slug-rank-foundation-v1` → true; `gpt/*` → false; `claude/*` → false) and the earlier `ignoreCommand` note no longer describe the configuration.

## Preview
A Preview deployment is created only as an explicitly approved, bounded action (CLAUDE.md rule 7: a protected Preview requires ZURIEL's explicit approval), from an exact approved artifact head, never as production (`target=null`). Verify before sharing: source artifact known; Preview target; `READY`; requested route returns HTTP 200. Generate/share a protected Preview URL when Deployment Protection is enabled. Never merge or promote a preview carrier branch.

Historical mechanism (2026-09-23): a `preview/*` carrier branch with an inert marker commit triggered Vercel Git Integration because `preview/*` was outside the blocked namespaces. With the global `deploymentEnabled: false` a push to `preview/*` no longer deploys by itself; the record below is provenance only.

## F11 proof (historical, 2026-09-23)
On 2026-09-23:
- canonical F11 app artifact: PR #632 head `a00965851deb98b4601f1e38389a543fea49a850`
- preview branch: `preview/f11-raziel-consumer-a0096585`
- inert trigger commit: `facbb942874307a0114bef40bab60a5d55a88d3e`
- Vercel deployment: `dpl_H5v9KuyiTDWECXFnvyMbog669YHU`
- target: Preview (`null`), not production
- state: READY
- route `/2029/preview/synthesis/1820`: HTTP 200
- production/main unchanged.

## Safety
Do not enable Git deployments (globally or per branch) merely to get a Preview. Preview and Production creation remain explicit, bounded, approved actions.
```

## 6. project_codex #4 publishing_conventions — כל שורה שהשתנתה, בנוסחה המלא החדש
md5 `f39efab93a4d4bfa851586d4fc4259f5` · SHA-256 `d98c9a71fcb4b42b0a956b35d0ae4285ab83fa675c8503e8df66a257a195994b` · 72,978 תווים

**שורה 413** (מחליפות 1 שורות בבסיס):

```text
- Same Post identity across historical (WordPress/Legacy-era) records and 2029.
```

**שורה 463** (מחליפות 1 שורות בבסיס):

```text
8. ONE SHARED IMPLEMENTATION: ההגדרה החזותית שייכת לחוזה Design V2 ולפלטה הקנונית; רכיב הפוסט המשותף צורך אותה. אין theme store נוסף, palette נפרדת לכל פוסט, CSS חדש במקור כדי לכפות צבעי 2029. (תצוגת Legacy אינה קיימת עוד מאז 5.11.2026.)
```

**שורה 472** (מחליפות 1 שורות בבסיס):

```text
1. טריגר וסמכות: הוראה מפורשת לפרסם/להעלות לאתר מתירה לבצע את שלבי פרסום המדיה הנדרשים ללא שאלות חוזרות על העברת הקובץ ותמונת שער. שיתוף קישור/קובץ ללא הוראת פרסום אינו מתיר פרסום אוטומטי. היעד הוא 2029 — המוצר הפעיל היחיד (Legacy פרש ב-5.11.2026 ואינו יעד פרסום); הוראת פרסום אינה אישור לשינוי קוד/ענפי Preview, מיזוג או פריסה.
```

**שורה 476** (מחליפות 1 שורות בבסיס):

```text
5. אימות וסיום: בצע קריאת-חזרה לחשבונית אחסון, בדיקת קיום קובץ מקור ונגזרות, בדיקת שדות והפניות הפוסט; בדוק תצוגה בפועל במובייל/דפדפן ב-2029. DB INSERT/UPDATE לבדו אינו הוכחת פרסום חי או נראות. דווח באופן מפורד מה בוצע, מה אומת ומה עדיין חסום, עם קישור לצפייה רק אם אומת. אל תכפה שינוי ב-Production או בפריוויו כדי לעקוף חסימה.
```

**שורות 481–482** (מחליפות 2 שורות בבסיס):

```text
—— POST MODIFIED DATE REQUIRED · 27.10.2026 · re-scoped to 2029 on 10.11.2026 · publishing_conventions operational correction ——
כש-ChatGPT או כל סוכן אחר מפרסם פוסט חדש ב-public.posts, חובה להגדיר posts.modified לתאריך הפרסום (לרוב זהה ל-posts.date; בעריכה בפועל לפי updated time) כבר ב-INSERT. אין להסתפק ב-date/created_at בלבד: קוראי 2029 ממיינים לפי modified DESC NULLS LAST (getLatestPostCards ב-src/lib/supabase.js; fetchPostsCatalog2029 ו-fetchPostSearchSuggestions2029 ב-src/lib/research/postsCatalog2029Projection.js), והיעדר modified עלול להוריד פוסט חדש לתחתית הרשימות. (ב-27.10 נכתב הכלל עבור דף הבית של Legacy, fetchHomePosts, שהוסר ב-5.11.2026; הדרישה נשארת בתוקף ב-2029.) modified קובע סדר בלבד ואינו אות ל״עדכון חדש״ (SOD1820_DESIGN_CONTRACT_V2.md §8.1). לאחר כתיבה לוודא שהפוסט מופיע בראש רשימות הפוסטים של 2029, אינו טיוטה/פורום/מוסתר מהבית, ונראה בפועל; לא לשנות קוד, פריסה, Preview או שדות לא קשורים לשם עקיפת התקלה. בדיקת DB/מיון אינה תחליף לבדיקת תצוגה בדפדפן. כיול: posts.id=5126 (27.10.2026), תוקן modified=NULL ל-date, עלה ממקום 1295 למקום 1 במיון הרשימה. 
```

כל שאר השורות של הקודקס (72,978 תווים בסך הכול) זהות לבסיס. המילה «מפורד» בשורה 476 מופיעה כך כבר בבסיס החי ולא שונתה (שגיאת כתיב קיימת, מחוץ לתחום SQL 10).
