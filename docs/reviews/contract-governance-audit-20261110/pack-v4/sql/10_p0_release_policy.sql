-- SOD1820 · P0 release policy — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 10–11.11.2026 against origin/main 932aba4bdd8eaa7030c57932ce9606f9ca5ebe18 and the live DB rows read the same day.
-- Requires ZURIEL's explicit approval of this exact file (md5 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Every block refuses to run if the live row differs from the reviewed base (md5 guards) and verifies the result md5.
-- Version bumps follow the existing mechanism: old active row -> is_active=false, new row v+1 with supersedes_version=v
-- (trg_rule_compaction_integrity_guard_v1 validates; governed metadata is carried over). Nothing is deleted.
begin;

-- ── deploy_on_request: v3 → v4 ───────────────────────────────────────────────
do $sod_p0$
declare
  v_base public.nodes%rowtype;
  v_new_id uuid;
begin
  select * into v_base from public.nodes
   where type='rule' and rule_id='deploy_on_request' and is_active for update;
  if not found then raise exception 'P0 deploy_on_request: no active version (drift)'; end if;
  if v_base.rule_version <> 3 then raise exception 'P0 deploy_on_request: active version is v% (expected v3)', v_base.rule_version; end if;
  if md5(v_base.description) <> 'f93e73ce0ad3bc66457e6ff07cdb2322' then raise exception 'P0 deploy_on_request: description drift (md5 %)', md5(v_base.description); end if;
  if md5(v_base.metadata::text) <> '8a4b80b7e9b824e79dca9e229549c1c4' then raise exception 'P0 deploy_on_request: metadata drift (md5 %)', md5(v_base.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='deploy_on_request' and rule_version > 3) then
    raise exception 'P0 deploy_on_request: a version above v3 already exists';
  end if;
  update public.nodes set is_active=false where id=v_base.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$⛔ Release v4 — Explicit Approval per Merge & Deployment · No Standing Authorization$sod_lbl$, $sod_txt$[v4 · Human-Gate ZURIEL · 10.11.2026 — אישור מפורש לכל מיזוג ולכל פריסה · אין הרשאה עומדת · 2029 הוא המוצר הפעיל היחיד]
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
6. ONE-TIME INSTALL BOOTSTRAP. The single PR that first installs this gate may pass preflight only when its base-main does not yet contain scripts/release-canary-gate.mjs and no prior canary status exists. Once the gate runtime exists on main, every later release fails closed without exact-SHA success or explicit audited Human-Gate override.$sod_txt$, $sod_meta${"cited_by": ["deploy_quota_protection", "inter_agent_coordination_law"], "compaction_v1": {"canonical_owner": "deploy_on_request", "classification": "OWNER", "classified_at": "2026-09-15", "gate": "G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_V1", "owner_family": "live_release_governance"}, "complemented_by": "deploy_quota_protection", "explicit_approval_required_per_action": true, "explicit_human_gate_remaining": ["governed_truth_canonicalization_or_publication", "destructive_irreversible_data_loss", "pricing_economics", "privacy_security_weakening", "permanent_capability_history_retirement"], "g3_disposition_v1": {"classification": "KEEP_CANONICAL_OWNER", "classified_at": "2026-09-15", "gate": "G3_IMPLEMENTATION_COMPACTION_ARCHIVE_PASS", "no_automatic_runtime_inheritance": true, "normal_startup": true, "reason": "canonical owner survives into G3 unless explicitly superseded through owner gate"}, "human_gate_v2": "ZURIEL 2026-09-17", "human_gate_v4": "ZURIEL 2026-11-10", "merge_is_not_deploy": true, "owner_check": "EXTEND_EXISTING", "owner_routing": {"canonical_owner": "deploy_on_request", "confidence": "high", "domain": "live_release_governance", "normalized_at": "2026-09-08", "resolution": "RESOLVED", "source": "SOD1820_MASTER_OWNER_INDEX/project_codex._index/existing_owner_contracts", "version": 1}, "release_advice_state_aliases": {"AUTO_RELEASE_NOW": "READY_FOR_APPROVAL"}, "release_advice_states": ["READY_FOR_APPROVAL", "BUNDLE_WITH", "BLOCKED_BY", "SAFE_INDEPENDENT_WAITING_RUNTIME", "DO_NOT_RELEASE_SUPERSEDED/PARKED"], "release_canary_auto_rollback": false, "release_canary_evidence_store": "github_commit_status", "release_canary_gate": "github_status:sod1820/post-deploy-canary", "release_canary_heartbeat_reader": "fn_reliability_heartbeat_status", "release_canary_override": "fn_release_canary_override", "release_canary_override_reader": "fn_release_canary_override_status", "release_preconditions": ["gate_clean", "dependencies_closed", "current_main_reconciled", "required_checks_green", "security_privacy_clean_if_applicable", "no_overlapping_writer", "rollback_recovery_known"], "separate_taale_required": true, "source": "CLAUDE.md deploy section, mirror write approved by ZURIEL", "standing_auto_release": false, "v4_explicit_release_approval": {"active_product": "2029", "decided_at": "2026-11-10", "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.", "legacy_retired": "2026-11-05", "no_new_system": true, "owner_check": "EXTEND_EXISTING", "procedure_ref": "CLAUDE.md — נוהל פריסה ל-Production מסשן ענן", "production_since": "2026-11-04", "supersedes": "v2 standing authorization (§§1, 2, 8)"}}$sod_meta$::jsonb, true, 'deploy_on_request', 4,
          v_base.depends_on, 3, v_base.weight, v_base.hebrew_date, v_base.axis_theme, v_base.gallery_id, v_base.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> '78d80d2264e0b5062b425319b25a3e3a' then
    raise exception 'P0 deploy_on_request: new description md5 mismatch';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='deploy_on_request' and is_active) <> 1 then
    raise exception 'P0 deploy_on_request: active version count is not 1';
  end if;
end
$sod_p0$;

-- ── inter_agent_coordination_law: v17 → v18 ───────────────────────────────────────────────
do $sod_p0$
declare
  v_base public.nodes%rowtype;
  v_new_id uuid;
begin
  select * into v_base from public.nodes
   where type='rule' and rule_id='inter_agent_coordination_law' and is_active for update;
  if not found then raise exception 'P0 inter_agent_coordination_law: no active version (drift)'; end if;
  if v_base.rule_version <> 17 then raise exception 'P0 inter_agent_coordination_law: active version is v% (expected v17)', v_base.rule_version; end if;
  if md5(v_base.description) <> '02d188d1b92e32ea51907d059b18c47f' then raise exception 'P0 inter_agent_coordination_law: description drift (md5 %)', md5(v_base.description); end if;
  if md5(v_base.metadata::text) <> '982e7976d43d62a7a9b08b8d3a591e6f' then raise exception 'P0 inter_agent_coordination_law: metadata drift (md5 %)', md5(v_base.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='inter_agent_coordination_law' and rule_version > 17) then
    raise exception 'P0 inter_agent_coordination_law: a version above v17 already exists';
  end if;
  update public.nodes set is_active=false where id=v_base.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$Inter-Agent Coordination v18 — 2029 Production · Explicit Release Approval$sod_lbl$, $sod_txt$הוראת צוריאל מחייבת — 14.10.2026: דיווחים לצוריאל בלבד.
אין לשלוח הודעות, בקשות, מסירות, RESULT_WAKE או דרישות ACK ל-GPT. אין להמתין לתשובת GPT ואין לבצע retry לשם מסירה אליו. כל סוכן משיב לצוריאל בשיחה שבה הוא עובד ומתעד ביומן פסיבי TO=ZURIEL, ללא dispatch. עבודה שכבר אושרה ממשיכה; אין לבטל משימות מוצר. קריאת היומן לבדיקת בעלות ומניעת דריסה נשמרת, אך אינה תיבת הודעות ואינה דורשת ACK. בהתנגשות כתיבה אמיתית אין לערוך קבצים חופפים ויש לדווח לצוריאל.
כל סעיף קודם בחוק זה או בחוזה/adapter אחר המחייב מסירה ל-GPT או ACK ממנו מוחלף בהוראה זו. אין הפעלת סוכן אחר אוטומטית מכוח חובת דיווח; הפעלה חדשה דורשת הוראת משתמש מפורשת. חלוקת מומחיות, חוזי מוצר ושערי פרסום אינם משתנים.

הוראת צוריאל מחייבת — 10.11.2026 (v18): 2029 הוא Production והמוצר הפעיל היחיד; אין הרשאת שחרור עומדת.
2029 עלה ל-Production ב-4.11.2026 ו-Legacy פרש ב-5.11.2026 (קוד Legacy נשמר בהיסטוריית Git בלבד ואינו יעד פריסה, Preview או חזרה). סעיפים 75, 79 ו-80 (v12) תיארו את המצב שלפני המעבר והם היסטוריים; 76–78 נשארים בתוקף כעיקרון: חומר Legacy הוא ראיה היסטורית בלבד, לא סמכות עיצוב או ארכיטקטורה. כל מיזוג ל-main וכל פריסה ל-Production מחייבים אישור מפורש של צוריאל לפעולה המסוימת (deploy_on_request, הגרסה הפעילה). ההרשאה העומדת והשחרור האוטומטי של v13 (סעיפים 82, 86, 87) בוטלו; ייעוץ השחרור (81, 83–85, 88) נשאר, ותוצאתו המלצה לצוריאל — לעולם לא פעולה אוטומטית.


--- HISTORICAL V1–V16: conflicting communication clauses superseded by v17; production/release clauses 75–82 and 86–88 updated by v18 ---
עיקרון-על: כשצוריאל עובד עם כמה סוכנים, הם מתאמים ביניהם לבד דרך היומן (work_log) — צוריאל אף פעם לא צריך להעביר מידע מסוכן לסוכן. כללים קשיחים: (1) ערוץ אחד: כל תיאום/מסירה/שאלה בין סוכנים נכתב ב-work_log כ-memo עם FROM/TO, ההקשר, מה נדרש, ומה מוכן. אין ערוץ אחר. (2) סריקה בתחילת סשן (הרחבת agent_onboarding_law): כל סוכן, בתחילת כל סשן, חייב לסרוק את רשומות work_log האחרונות אחר memos המופנים אליו (topic/what_we_did מכיל «תיאום בין-סוכני» / «→ סוכן» / FROM/TO / status=«ממתין ל…»), לפעול עליהם, ולעדכן status+תשובה באותה רשומה או ברשומת-המשך. (3) השארת-עבודה = memo: סוכן שמסיים משהו שנוגע בסוכן אחר חייב להשאיר memo לפני סיום. (4) פריסת main מתואמת (הרחבת deploy_on_request): אף סוכן לא דוחף ל-main עצמאית. כל סוכן מצהיר ביומן מה מוכן (ענף+commit), וצוריאל מפעיל פריסה אחת מאוגדת. אין פריסות כפולות (בזבוז מכסה + קוד חצי-אפוי). תוצאה: צוריאל מפעיל N סוכנים והם נסגרים ביניהם דרך היומן. מגבלה כנה: החוק אמין כל עוד כל סוכן מכבד onboarding; לכן הסריקה בתחילת סשן היא חובה, לא רשות.

[עדכון v2, 23.8.2026 — Human-Gate ZURIEL, MINIMAL CHANGE — ללא rule/טבלה/schema/coordination-system חדשים, reuse מלא של work_log הקיים]
(5) פורמט handoff מומלץ ואחיד, לכל עבודה מהותית (בתוך what_we_did/topic הקיימים — אין שדות-DB חדשים): actor · task/workstream · status · facts_changed · decisions · branch/PR/commit · blockers · open_threads · handoff_to. זהו הפורמט הן לסריקה בתחילת-סשן (כלל 2) והן ל-memo לפני-סיום (כלל 3).
(6) work_log הוא Coordination Ledger בלבד — אינו SSOT לעובדות-המוצר ואינו מחליף Roadmap/Master-State/DB-חי/main. בכל סתירה בין handoff לבין המצב-בפועל, או חשד-לסטייליות — חובה להפעיל את live_state_resolution_law; המצב-החי גובר, ומדווחים DRIFT (לא פותרים בשם צוריאל).
(7) אסור לסוכן להניח שפעולה של סוכן אחר בוצעה ללא provenance מפורש ב-work_log (branch/PR/commit/merge-SHA/query-result) — "נאמר ב-handoff" אינו-שווה "בוצע".
(8) Actors מוכרים בפרוטוקול: GPT / CLAUDE / ZURIEL — כבר בשימוש-חי (רשומות actor=GPT קיימות ב-work_log מלפני עדכון-זה).
(9) Verified capability (current-state בלבד, לא חוק-קבוע): נכון ל-23.8.2026, ה-GPT runtime הנוכחי מחובר בפועל ל-Supabase המשותף וקורא/כותב work_log ישירות — GPT↔CLAUDE zero-copy handoff (בלי העתקת-צוריאל) אפשרי-עקרונית כבר-עכשיו. זו עובדת-runtime מאומתת-לרגע-הכתיבה, **לא** מובטחת לכל session עתידי של GPT — אין-להניח שהיא מתקיימת בלי לאמת-מחדש בכל סשן (עקבי עם live_state_resolution_law: לא-מניחים, מאמתים).

[עדכון v3, 2.9.2026 — Human-Gate ZURIEL — MULTI-SESSION RESEARCH GOVERNANCE, additive; reuse existing system only]
(10) ONE SCOPE — ONE ACTIVE WRITER. לכל עבודת-מחקר מקבילה מוגדר scope סמנטי מפורש (source/work + family/operator/question). שני סוכנים אינם מבצעים WRITE חופף לאותו scope בו-זמנית. READ-ONLY / Challenge / Cross-Verification מותרים במקביל תמיד, בהתאם ל-live_state_sync_law. פתיחת write-scope נרשמת ב-work_log; סוכן אחר שרואה scope חופף נשאר READ-ONLY או בוחר scope נפרד.
(11) CHECK-BEFORE-SAVE. לפני יצירת research_object חדש חובה לחפש חי באותו מקור/משפחה/משמעות. אם הממצא רק מחזק אובייקט קיים ואינו משנה סמנטיקה, ברירת-המחדל היא consolidation additive: להוסיף source locus/evidence/variant תחת הבית הקיים בלי לשכתב statement/source_ref/identity ובלי למחוק provenance. אם החיזוק אינו ניתן להוספה בלי שינוי-משמעות, יוצרים synthesis/child מתאים רק אם Save Gate מתקיים.
(12) NEW-OBJECT SAVE GATE. research_object חדש מותר רק אם לפחות אחד מתקיים: NEW OPERATOR · NEW PROCEDURE · SEMANTIC DISTINCTION · RESOLVED ANOMALY · NEW CONTRADICTION · NEW REPRESENTATION FAMILY · DECISION-CHANGING EVIDENCE. recurrence/example נוסף בלבד אינו סיבה מספקת לאובייקט חדש.
(13) BATCHED WORK_LOG. work_log הוא Coordination Ledger ולא Research Store. במחקר סדרתי אין לייצר BEFORE+AFTER לכל ממצא קטן. פותחים BEFORE אחד ל-batch/scope, ובסיום AFTER אחד הכולל checkpoint_keys שנוצרו/עודכנו, מה לא נשמר, truth-boundary, open_threads ו-handoff. חריג: write יחיד בעל סיכון/משמעות governance/architecture יכול לשמור BEFORE+AFTER ייעודיים.
(14) SEMANTIC CHECKPOINT KEYS. אין להסתמך על מספר רץ גלובלי כזהות. checkpoint_key צריך להיות סמנטי וייחודי לפי source/family/procedure; suffix מקומי מותר לנוחות בלבד ואינו authority. במקביליות עדיף family-tag/semantic slug על sequence משותף.
(15) CONSOLIDATE BEFORE FRAGMENTING. דוגמה נוספת לאותה family נכנסת כ-evidence/locus אם אפשר additive. אין ליצור Object לכל recurrence. אסור 'לכווץ' על-ידי overwrite: האטומים ההיסטוריים נשמרים; consolidation הוא parent/synthesis או הרחבה additive בלבד.
(16) PERIODIC SYNTHESIS GATE. לאחר בערך 10–15 ממצאים מהותיים חדשים באותו source, או כש-family משמעותית מגיעה לנקודת-סגירה, מבצעים Consolidation/Synthesis Pass לפני המשך mass-save. הסינתזה מסווגת families כ-SUPPORTED / PARTIAL / ANOMALY / OPEN / NOT FOUND AFTER SCAN ומצביעה לאובייקטים הקיימים במקום להעתיקם.
(17) ROADMAP/MASTER EXCLUSION. Atomic Findings, source calculations, procedures, examples ו-anomalies אינם נכנסים ל-Master State או Roadmap. Master מקבל רק state/closure/decision ארכיטקטוני משמעותי; Roadmap הוא ניווט/priority בלבד. מחקר source-level נשאר ב-Research OS.
(18) ONE RESEARCH HOME. research_objects הוא הבית האטומי למחקר. אין לפתוח Book Lab / source-specific store / parallel graph / hidden-engine / glyph-store / session-store. Source/Book/Edition future first-class identities משתמשים ב-One System הקיים לפי research_intake_foundation_contract_law/reality_graph_law.
(19) TRUTH BOUNDARY ON EVERY SAVE. בכל save/handoff יש לשמר בנפרד: source-supported · exact-witness/PDF-verified · engine verification/result · inference · governance status · canonical · published/access. source claim ≠ engine verified; canonical ≠ published.
(20) SESSION END = HANDOFF, NOT MEMORY. סשן מהותי מסתיים ב-AFTER/handoff אחד עם scope, closed, open, blocker, next, do-not-touch, checkpoint_keys/provenance. handoff הוא ניווט בלבד; הסשן הבא עדיין עושה live bootstrap ולא רואה handoff כ-SSOT.
(21) RESEARCH OPERATING MANTRA: DISCOVER BROADLY · SAVE SELECTIVELY · CONSOLIDATE REPEATEDLY · PROMOTE ONLY THROUGH HUMAN GATE.

מטרת v3: לאפשר ל-ZURIEL להפעיל N sessions/agents בלי להפוך N sessions ל-N מערכות. אין schema/table/engine/store חדש; אין שינוי Roadmap/Master; אין authorization ל-canonicalization/publication/mass ingestion. Foundation → Projection → Experience נשמר.


[עדכון v4, 4.9.2026 — Human-Gate ZURIEL — SPECIALIST ESCALATION / DECISION-CHANGING CROSS-VERIFICATION, additive; reuse existing work_log only]
(22) PRIMARY OWNER + SPECIALIST ESCALATION. לכל scope יש Primary Owner אחד שנשאר אחראי לסינתזה, להחלטה ולמימוש. סוכן מומחה נוסף מופעל רק כאשר בדיקה עצמאית יכולה לשנות החלטה, לחשוף Drift/Schema/Release/Truth risk, או להעלות ודאות מהותית. הפעלת מומחה אינה מעבירה בעלות ואינה פותחת writer שני.
(23) GPT→CLAUDE ESCALATION GATE. בעבודה שמוביל GPT, GPT חייב לסווג באופן יזום בנקודות משמעותיות: CLAUDE=REQUIRED / USEFUL / NOT_NEEDED. REQUIRED כאשר יש לפחות אחד: schema/RPC/write-path קריטי; pre-release cross-verification לשינוי בעל השפעה גבוהה; Contract/Redesign-Risk challenge; canonical-engine parity/Truth authority; security/privacy/RLS; או performance/cost risk שיכול לשבור scale. USEFUL לבדיקת Golden Cases/adversarial review עצמאית. NOT_NEEDED ל-UI קוסמטי, audit שכבר הוכרע, או כפילות שאין לה Information Gain משנה-החלטה.
(24) NO FALSE ECONOMY + NO REDUNDANT AUDIT. עלות/זמן לבדם אינם סיבה לדלג על אימות משנה-החלטה; במקביל אסור להפעיל סוכן נוסף רק משום שהוא זמין. Decision Gate קודם: האם תוצאת הבדיקה יכולה לשנות החלטה/בטיחות/שחרור? אם לא — לא מפעילים.
(25) READ-ONLY BY DEFAULT FOR SPECIALIST. מומחה שנקרא ל-Challenge/Cross-Verification נשאר READ-ONLY כברירת-מחדל. WRITE מותר רק לאחר scope-transfer/authorization מפורש ב-work_log ובהתאם ONE SCOPE — ONE ACTIVE WRITER. אין parallel implementation לאותו מוצר/מסך/חוזה.
(26) ZURIEL VISIBILITY WITHOUT MEDIATION. ה-Primary Owner מודיע לצוריאל בקצרה כאשר Specialist נדרש ולמה, אך אינו מבקש מצוריאל להעביר מידע בין הסוכנים. התיאום עצמו מתבצע ישירות ב-work_log. אם הפעולה דורשת Human Gate בפני עצמה — עוצרים לקבלת האישור הנדרש.
(27) SPECIALIST TASK CONTRACT. משימה ל-Claude/מומחה כוללת: OBJECTIVE · LIVE FACTS · SCOPE · DEPENDENCIES · DO-NOT-TOUCH · VERIFICATION · STOP CONDITION · EXPECTED OUTPUT. דוח מומחה אינו אמת קנונית בפני עצמו; ה-Primary Owner חייב cross-verify live facts, scope, drift, release-state וכפילות לפני אימוץ.

מטרת v4: לא לחסוך באימות שמונע טעות יקרה, ולא לבזבז זמן על כפילות. Specialist הוא שכבת-ודאות לפי Information Gain, לא מערכת מקבילה ולא co-owner. אין schema/table/engine/store/coordination-system חדש; work_log נשאר הערוץ היחיד.

[עדכון v5, 7.9.2026 — Human-Gate ZURIEL — CONTRACT / OWNER CHECK GATE, additive; no new governance system]
(28) OWNER CHECK BEFORE NEW OWNER. לפני הצעה/יצירה של Contract / Law / System / Store / Engine / Registry / Global UI owner חדש, הסוכן חייב לבצע LIVE OWNER CHECK מול המקורות הקנוניים הרלוונטיים (active rules, project_codex, origin/main, Master/Roadmap לפי התחום) ולכתוב בתוצר/BEFORE: existing_owner(s)_checked + verdict אחד בלבד: EXTEND_EXISTING | SUPERSEDE_EXISTING | GENUINELY_NEW_DOMAIN.
(29) EXTEND BY DEFAULT. אם owner קיים יכול לשאת את הסמנטיקה בלי ערבוב-אחריות או redesign צפוי — חובה להרחיב אותו. שם חדש, מסך חדש, feature חדש או דוגמה חדשה אינם מצדיקים owner חדש.
(30) GENUINELY NEW DOMAIN BURDEN OF PROOF. יצירת owner חדש מותרת רק אם הסוכן מסביר בקצרה: מה התחום החדש; למה כל owner קיים שנבדק אינו מתאים; מה גבול האחריות החדש; אילו owners הוא צורך/מרחיב ואינו משכפל; ומה יישאר מחוץ לסקופ. אם ההצדקה אינה משנה החלטה או אינה מוכחת — STOP / EXTEND EXISTING.
(31) NO SILENT PARALLEL CONTRACT. אסור לייצר Contract/Law נוסף שמכסה אותה אחריות בשם אחר. במקרה של חפיפה שהתגלתה בדיעבד: Preserve History; בוחרים owner קנוני אחד דרך Human Gate, מסמנים האחרים HISTORICAL/SUPERSEDED/POINTER לפי הצורך, ומעבירים רק סמנטיקה ייחודית שלא קיימת בבעל-הבית. אין מחיקה שקטה.
(32) SPECIALIST TASK CONTRACT UPDATE. כל משימת מומחה מסוג Contract/Architecture/Redesign חייבת לכלול בשדה DEPENDENCIES את ה-owner candidates שכבר נבדקו, וב-EXPECTED OUTPUT את OWNER CHECK verdict. מומחה אינו רשאי להמציא owner חדש כדי לפתור ambiguity מקומית.

מטרת v5: למנוע contract sprawl ו-owner drift לפני שהם נוצרים. אין טבלה/registry/ledger חדש; reuse מלא של nodes/project_codex/work_log והבעלים הקיימים.

[UPDATE v6 · Human-Gate ZURIEL · 8.9.2026 — COMPACT COMMUNICATION BOOTSTRAP / DOMAIN ROUTING, additive]
33) COMMUNICATION BOOTSTRAP IS POINTER-BASED, NOT RULE-DUMP. At session/task start the agent carries only five operating pointers: LIVE-FIRST; ONE TREE / OWNER-FIRST; FOUNDATION-FIRST; TRUTH + HUMAN GATE; COORDINATION + RELEASE SAFETY. These are routing umbrellas only, not new owners and not replacements for the underlying active laws.
34) DOMAIN LAWS LOAD ON DEMAND. After intent/capability classification, resolve the canonical domain owner and load only that owner plus the smallest relevant dependency set. Never scan/load all active site rules merely because a user asks a domain question.
35) COMMUNICATION LAW != DOMAIN LAW. A behavior that changes the answer for a domain belongs to that domain owner, not to the communication bootstrap. Canonical calibration: numeric query 358 must fan out through the existing numeric_rule_family_index/system-method owners to exact 358 plus governed relatives such as 1358 and 3580 when applicable. This rule only routes to that owner; it does not duplicate the numeric transform semantics here.
36) NO NEW HIERARCHY SYSTEM. No new registry/table/router-store is created by this compacting step. Existing laws remain authoritative in their domains; the five pointers reduce bootstrap load and point inward to owners. Preserve history; Rank, Don't Hide.
37) OPERATIONAL RESULT: simple user phrasing stays simple. Example: “חפש לי גימטריה על 358” → classify Gematria/Number Research → resolve gematria/numeric owners → engine/DB-first + governed numeric fanout → answer. No traversal of unrelated rules (video, newsletter, forum, RLS, etc.) unless the task actually crosses those domains.

[UPDATE v7 · Human-Gate ZURIEL · 9.9.2026 — SELF-DISCOVERING AGENT ASSIGNMENT PROTOCOL, additive; reuse work_log only]
38) ASSIGNMENT DISCOVERY. At every session start, and again before an agent becomes idle/stops after meaningful work, the agent MUST scan recent work_log for explicit assignments addressed to its actor (TO=GPT / TO=CLAUDE) with a task/workstream key and a nonterminal status such as QUEUED / ASSIGNED / ACK_REQUIRED / WAITING_SPECIALIST. This scan is part of normal onboarding, not an optional user-mediated step.
39) MACHINE-READABLE TASK ENVELOPE IN EXISTING FIELDS. An assignment memo SHOULD contain, in topic/what_we_did/open_threads only (no schema change): actor/from/to · task_key · primary_owner · priority · mode=WRITE|READ_ONLY · scope · dependencies · do_not_touch · verification · stop_condition · expected_output · release_authorization_state · handoff_to. Missing optional fields do not invalidate the memo; missing TO/task_key/scope means it is not claimable as an assignment.
40) ACK / CLAIM PROTOCOL. When an addressed agent finds a claimable assignment, it MUST first write an ACK row referencing the same task_key and classify itself as CLAIMED_WRITE / CLAIMED_READ_ONLY / BLOCKED / DECLINED_STALE. Before CLAIMED_WRITE it MUST live-reverify canonical owner, current main/DB, and overlapping active writers. ACK never grants release authority.
41) ONE TASK KEY — ONE PRIMARY WRITER. A task_key with an active CLAIMED_WRITE may not be independently implemented by another agent. A second agent may act only as READ_ONLY specialist/challenger unless a work_log transfer explicitly changes primary writer. No silent task stealing and no parallel duplicate implementation.
42) DIRECT AGENT-TO-AGENT DISPATCH. GPT or CLAUDE may create an assignment for the other agent directly in work_log when the active coordination/specialist gates require it. ZURIEL is informed for visibility but is never asked to copy/paste the task. The addressed agent discovers it through rule 38.
43) COMPLETION CONTRACT. The assigned agent closes with one AFTER carrying the same task_key and exact implementation/release states (implemented/committed/PR/merged/deployed/live/verified separately), blockers, provenance, next, and handoff_to. The primary owner must live-reconcile that AFTER before relying on it.
44) NO FALSE BACKGROUND CLAIM. “Self-discovering” means deterministic discovery whenever the agent runtime/session is active and performs onboarding/idle scan. This law does NOT claim that an external Claude/GPT session can wake itself from being closed, receive push notifications, or execute in the background without a runtime that supports such scheduling. If future infrastructure adds polling/webhooks, it must extend this same work_log assignment protocol rather than create a second queue.
45) SIMPLE USER EXPERIENCE. When ZURIEL says “תן לקלוד”, “תעביר לקלוד”, or GPT determines CLAUDE=REQUIRED, the primary agent writes the assignment directly to work_log and continues/halts according to scope; ZURIEL does not act as messenger. Conversely Claude follows the same path toward GPT.

OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law. No new table, queue, registry, store or coordination SSOT. work_log remains Coordination Ledger only; live DB/main/domain owners remain authority.

[UPDATE v8 · Human-Gate ZURIEL · 9.9.2026 — FAST ROUTING / TASK PROFILES / READ BUDGET, additive; EXTEND_EXISTING only]
46) TASK PROFILE = ROUTING RECIPE, NOT DOMAIN TRUTH. A Task Profile is a compact alias from natural-language intent to canonical owner(s), required verification mode and smallest dependency class. It MUST NOT copy domain semantics, formulas, design rules, publishing rules, security policy or implementation details. Owners remain authoritative.
47) PROFILE RESOLUTION PIPELINE. Default execution path: natural language → intent/capability/domain → nearest canonical Task Profile → canonical owner → minimal direct dependencies → live verification appropriate to the task → execute → verification/handoff. If no profile matches confidently, resolve owner directly; do not create a new profile merely to avoid ambiguity.
48) CANONICAL STARTER PROFILES. The shared profile family begins with: publish_post; draft_post; post_visual; gallery_work; gematria_research; els_research; source_scan; roadmap_status; live_state_check; release_gate; ui_experience_work; db_write. These names are routing aliases only. Agents MAY recognize equivalent Hebrew/English natural phrasing. New profiles are added only when a recurring task pattern materially reduces routing work; profile growth must remain bounded.
49) READ BUDGET / PROGRESSIVE DISCLOSURE. Default budget is L1: bootstrap pointers + resolved owner + direct dependencies only. Escalate to L2 when the task crosses domains, ambiguity/conflict exists, or a specialist/contract is genuinely required. Escalate to L3 only for WRITE/release/security/schema/cross-layer state where governance and live verification require it. Bulk loading all active rules, full Master State, full Roadmap, or unrelated contracts is forbidden by default.
50) STOP UNNECESSARY READS. Once the active owner and sufficient dependency set are resolved with high confidence, stop expanding context unless new evidence creates a decision-relevant ambiguity, risk or cross-domain dependency. More context is not automatically safer; irrelevant context is treated as latency/attention cost.
51) PROFILE COMPOSITION, NOT PROFILE EXPLOSION. Cross-domain work composes existing profiles/owners rather than inventing a composite profile for every combination. Example: legacy gallery presentation composes gallery_work + post_visual and loads legacy_content_protocol because the task is legacy; no legacy_gallery_visual_v2 profile is required.
52) ADAPTERS ARE POINTERS. CLAUDE.md, GPT bootstrap, Raziel/Metatron prompts and future agent adapters may expose short pointers to this routing contract, but MUST NOT become independent SSOTs for profile semantics. Agent-specific operational steps may remain in their adapter when genuinely runtime-specific.
53) FRESHNESS GATE. Profile names never pin stale versions. Resolution always targets the current active canonical owner/contract. If owner index/documented routing conflicts with live DB/origin/main/production as applicable, report DRIFT and use live-state laws; never silently trust the profile label.
54) 2029 SCALE TARGET. The system should remain usable with dozens of agents and hundreds/thousands of laws by keeping fixed bootstrap small, task routing bounded, domain context on-demand, and cross-agent handoff zero-copy through existing work_log. Optimization target is fewer unnecessary reads and correction loops, not fewer truth/safety checks.

Starter routing intent examples (non-authoritative pointers): publish_post→publishing owner + relevant presentation/media owner when visual output exists; draft_post→publishing owner without release; post_visual→active design/media owner; gallery_work→gallery/publishing owner + legacy_content_protocol only when legacy; gematria_research→gematria/numeric owners; els_research→ELS owner; source_scan→research intake/source owner; roadmap_status→Roadmap navigation + live-state verification; live_state_check→live_state_sync/resolution; release_gate→release/write/security owners; ui_experience_work→Experience/design owner + Production verification; db_write→domain owner + active write/security/live-state requirements.

OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law. No new registry/table/router/store/law family. Task Profiles are aliases over existing owners; Read Budget governs context loading only and never weakens verification, Human Gate, security or release requirements.

[UPDATE v9 · Human-Gate ZURIEL · 12.9.2026 — G1 AGENT ENTRY / BOOTSTRAP RECONCILIATION 2029, additive; EXTEND_EXISTING only]
55) ONE AGENT ENTRY CONTRACT. G1 owns reconciliation of task-start behavior across GPT, CLAUDE, RAZIEL/Metatron and future agents through this existing inter-agent owner. This is NOT a new Context System, registry, router, store, memory layer or SSOT. Agent-specific runtimes may differ operationally; their semantic routing contract must converge here.
56) CANONICAL TASK-START SEQUENCE. Default entry is: natural-language task → intent/capability/domain (and Task Profile when useful) → current canonical owner → smallest direct dependency set under the Read Budget → recent relevant work_log/assignment context → live verification appropriate to the task → execute → verify/handoff. Full Master State, full Roadmap, all active rules, all project_codex, broad branch archaeology or unrelated contracts are NOT mandatory startup reads. They are loaded only when the resolved task actually requires them.
57) ADAPTERS / MEMORY ARE POINTERS OR CONTEXT ONLY. CLAUDE.md, AGENT_HANDOFF.md, GPT bootstrap/custom instructions, Raziel/Metatron prompts, project_codex index/pointers, conversation history, model memory and future agent adapters may help route or provide runtime-specific instructions, but they are not independent project truth. They must not own domain semantics, pin stale owner versions, override live DB/main/domain owners, or become a parallel SSOT. Memory/conversation may clarify intent after live routing; it may never establish current project state by itself.
58) STALE-INSTRUCTION RECONCILIATION. G1 must inspect active entry surfaces and remove, supersede or clearly demote contradictory startup instructions that cause broad reading, stale-version routing or parallel authority. Preserve historical documents/history; do not bulk-rewrite archives. When an active adapter conflicts with the current owner, current active owner + live-state laws win and the conflict is reported as DRIFT until reconciled.
59) NO PARALLEL CONTEXT AUTHORITY. Existing authorities remain distinct: live DB/main/domain owners = live reality/semantics; Master State = documented state; Roadmap = navigation/priority; work_log = coordination/provenance; adapters/codex pointers/memory = routing/context. G1 may reconcile pointers among these; it may not create another context database, registry, graph, cache-as-authority, prompt-SSOT or agent-specific law family.
60) FRESH-AGENT ENTRY ACCEPTANCE TEST. G1 cannot close until a fresh-agent test can start without relying on prior conversation/project memory and, from a natural-language task, correctly: resolve the current owner; load only the minimum dependencies; discover relevant work_log context; verify the proper live source; report stale-pointer conflicts instead of trusting them; avoid unrelated bulk reads; and avoid inventing a parallel owner/system. Every materially different active agent adapter/runtime must pass this acceptance before it is treated as G1-reconciled; future agents inherit the same test before production use.
61) GATE BARRIER. G1 — and therefore every higher Gate under foundation_closure_protocol_law — remains NOT SUFFICIENT while any active startup surface can materially route a fresh agent to stale/parallel authority, or while the fresh-agent acceptance has not been evidenced. Closure evidence must name the adapter/entry surfaces checked, resolved owner/version, minimal read set, live sources checked, relevant work_log cutoff, DRIFT found/fixed, and fresh-agent replay result. A prompt that merely contains the right words is not proof.
62) BOUNDED CLEANUP, NOT PROJECT-WIDE READING. The reconciliation target is active entry surfaces and pointers capable of changing task-start behavior. Historical docs, old PR text and archived prompts are not bulk-cleaned or bulk-read merely to claim completeness; they remain provenance unless an active pointer exposes them as current guidance.
63) SAME SEMANTICS, RUNTIME-SPECIFIC MECHANICS. GPT/CLAUDE/RAZIEL/future agents may keep genuinely runtime-specific mechanics in their adapters (git commands, connector usage, prompt transport, etc.). Those mechanics consume this contract; they do not redefine owner routing, truth, gate semantics, work_log authority or release rules.

OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law. No new context system, table, registry, store, queue, graph or SSOT. This v9 section makes G1 entry-safety explicit and converts the v8 2029 scale target into a gate-testable acceptance contract.


[UPDATE v10 · Human-Gate ZURIEL · 12.9.2026 — G1 FRESH-AGENT APPLICABILITY CLARIFICATION, additive; EXTEND_EXISTING only]
64) PROJECT-ENTRY ACCEPTANCE SCOPE. For §60, “materially different active agent adapter/runtime” means a governance/project-task-start adapter that consumes the SOD1820 project-entry contract and can resolve project owners, work_log assignments, live-state sources, or release/governance scope. GPT, CLAUDE and future project agents in that class require the full fresh-project-entry acceptance replay.
65) PRODUCT/DOMAIN RUNTIME BOUNDARY. Product-facing personas and bounded domain runtimes such as Raziel/Metatron do not perform unrelated project bootstrap merely to satisfy G1. They must instead be verified at their real boundary: consume current domain owners, preserve truth/access/runtime contracts, avoid stale or parallel authority, and obey §63 runtime-specific mechanics. If a product runtime later gains project-level owner/work_log/release routing, it enters the §60 project-entry acceptance class.
66) NO ACCEPTANCE THEATER. G1 must test the behavior the runtime actually owns. Do not force Master/Roadmap/work_log project reads into a bounded product runtime that does not need them; doing so would recreate the broad-bootstrap problem G1 exists to remove.

OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law. This clarification narrows the acceptance class without weakening stale-pointer, owner-first, live-verification, Human-Gate, or release safety. No new owner/system/store/registry/router/SSOT.

[UPDATE v11 · Human-Gate ZURIEL · 15.9.2026 — G3 INTER-AGENT EVENT-DRIVEN DISPATCH RUNTIME CARRY-FORWARD, additive; EXTEND_EXISTING only]
67) EARLY G3 FOUNDATION/RUNTIME PRIORITY. At the opening of G3, before broad Golden implementation work, extend this existing owner with an event-driven dispatch runtime so ZURIEL is not the messenger between GPT and CLAUDE. This is a carry-forward binding only in G2; runtime implementation is explicitly NOT performed by this update.
68) TARGET FLOW. New assignment addressed in work_log to GPT/CLAUDE → dispatch event → addressed agent claim/lease → live canonical-owner resolution → bounded execution under current Read Budget and task contract → AFTER/result with exact provenance → wake/continue originating controller → Human Gate only where the existing laws require it.
69) EVENT-DRIVEN, NOT MANUAL POLLING AS TARGET. The future runtime should react to assignment creation/state transition rather than depend on ZURIEL copy/paste or a human asking the target agent to check. The event transport is an implementation mechanism only; work_log remains the Coordination Ledger and existing owners remain authority.
70) RELIABILITY CONTRACT. Runtime implementation must provide idempotency, duplicate suppression, claim/lease ownership, lease timeout, retry policy, explicit failure/deferred/cancelled states, stale-claim recovery, parallel-writer protection under ONE SCOPE — ONE ACTIVE WRITER, and end-to-end provenance linking assignment → dispatch → claim → execution → AFTER/result.
71) AUTHORIZATION BOUNDARY. READ_ONLY specialist challenges may auto-dispatch/auto-start when the runtime is available. WRITE remains subject to current owner/write/security/privacy contracts and overlap checks. Merge/deploy/publish/canonicalization never receive automatic authorization from dispatch. ZURIEL remains Human Gate exactly as governed today.
72) NO PARALLEL AGENT SYSTEM. Do not create a second Agent System, Queue authority, Coordination Store, Truth Store, Context Store or owner hierarchy. Any queue/webhook/event bus/worker used at implementation time is transport/runtime infrastructure subordinate to this owner and work_log semantics, never a second source of truth.
73) DISCOVERY / START-OF-G3. This carry-forward must be discoverable from the existing Owner Index under Agent Coordination and from the Roadmap as an EARLY G3 FOUNDATION/RUNTIME PRIORITY. Do not create a new Master or duplicate this semantic body into Master/Roadmap.
74) CURRENT STATE CALIBRATION. Until G3 implementation is live-verified, the existing §44 limitation remains true: a closed external GPT/CLAUDE runtime cannot be claimed to wake itself merely because an assignment row exists. The v11 carry-forward defines the future runtime requirement; it does not misstate current capability.

OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law. No new owner/law family/store/registry/queue authority/SSOT.

[UPDATE v12 · Human-Gate ZURIEL · 16.9.2026 — 2029 TARGET / TEMPORARY LEGACY PRODUCTION BOUNDARY, additive; EXTEND_EXISTING only] — HISTORICAL PRE-CUTOVER STATE: superseded by v18 (10.11.2026); 2029 = Production since 4.11.2026
75) [HISTORICAL · superseded by v18] TEMPORARY LEGACY PRODUCTION. Until ZURIEL explicitly declares cutover, the currently deployed legacy site remains the operational production surface for real users, production verification, urgent fixes and release safety. Its being live does NOT make its routes, components, information architecture, page composition or local implementation patterns the target architecture.
76) 2029 TARGET AUTHORITY. Foundation, capability, identity, truth, provenance, Research OS, routing, cost/provider, authorization and future product decisions must target the approved 2029 architecture under Foundation → Projection → Experience. A legacy UI pattern may be preserved only when it expresses a still-valid capability/contract, not merely because it exists in production.
77) LEGACY IS EVIDENCE / TRANSITIONAL RUNTIME, NOT DESIGN AUTHORITY. Agents may inspect the legacy site to answer current-state questions, keep it safe, migrate data/capability and verify temporary behavior. They must not derive new-site semantics or Experience requirements from legacy layout/route/component choices unless the current canonical owner explicitly preserves that invariant.
78) NEW WORK DEFAULT. New foundation/runtime work should be surface-agnostic and reusable by the 2029 site through bounded adapters/Result Bundles/canonical owners. Avoid coupling new capabilities to legacy components or routes. If a temporary legacy adapter is necessary before cutover, label it transitional and keep the underlying capability independent.
79) [HISTORICAL · cutover executed 4.11.2026 by explicit ZURIEL decision; Legacy retired 5.11.2026] CUTOVER IS EXPLICIT. No agent may assume the new site is production merely because 2029 work exists, and no agent may assume the legacy site is the long-term system merely because it is currently live. The transition point is a Human-Gate decision by ZURIEL and must be recorded with exact release/live state.
80) FRESH-AGENT ACCEPTANCE (updated by v18). A project-entry agent must be able to state without prior conversation memory: CURRENT PRODUCTION = 2029 (since 4.11.2026); Legacy is retired (5.11.2026) and is not a production, Preview or rollback target; TARGET ARCHITECTURE = 2029. Treating Legacy as current production is an entry-routing failure and must be reported as DRIFT. [Historical pre-cutover wording: CURRENT PRODUCTION = legacy/transitional until explicit cutover.]

OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law + foundation_closure_protocol_law 2029 principle. No new site owner, context system, migration store, UI law family or parallel roadmap is created.

[UPDATE v13 · Human-Gate ZURIEL · 17.9.2026 — DEPENDENCY-AWARE RELEASE ADVICE · EXTEND_EXISTING · standing auto-release revoked by v18 (10.11.2026)]
81) AGENT OWNS RELEASE RECOMMENDATION. At completion/checkpoint, Primary Owner must tell ZURIEL what should happen operationally, not merely “waiting for תעלה”. It classifies the exact scope using the canonical release-advice states from deploy_on_request (active version) and names dependencies/bundle order.
82) [REVOKED by v18 · 10.11.2026] EXPLICIT APPROVAL, NO AUTO-RELEASE. A clean live preflight (GATE-CLEAN + DEPENDENCIES-CLOSED + CI/GOLDEN/SECURITY CLEAN as applicable + NO OVERLAP) makes a scope READY_FOR_APPROVAL; the Primary Owner presents the exact commit/deployment to ZURIEL and merges, applies migrations or deploys only after his explicit approval of that specific action. [Former v13 text: auto-release on clean state under standing authorization, without a second user prompt.]
83) DEPENDENCY GRAPH BEFORE PR ORDER. Agent scans active/relevant work_log + open PR lineage + current Roadmap/dependency plan + live owner state to decide whether a scope is independent, stacked, superseded, or must be bundled. “Finished first” never means “release first”.
84) SAFE PARALLEL RELEASE. Independent lanes may release separately only when no shared-file/schema/runtime contract produces an incompatible intermediate state. If compatibility requires atomic/choreographed DB-before-client or multi-PR composition, report BUNDLE_WITH and execute the choreography as one release batch.
85) BLOCKER COMMUNICATION. When not releasable, state BLOCKED_BY with: exact blocker, lower dependency, current evidence, smallest closure path, and who/what can close it. Do not ask ZURIEL to decide technical dependency ordering that owners/gates can determine.
86) RELEASE APPROVAL DOES NOT CANONICALIZE. There is no standing release authorization (v18). Approval of a release does not grant autonomous governed-truth publication, destructive irreversible changes, pricing/economics, or other explicitly Human-Gated product decisions. Those remain separately gated.
87) USER HOLD. Explicit ZURIEL “hold/wait/do not release” for a scope creates a release hold in coordination context until lifted.
88) AFTER MUST INCLUDE RELEASE ADVICE/RESULT. Every material AFTER includes: release_advice; dependency_state; exact branch/PR/head; merged/applied/deployed/live/verified booleans/states; blocker if any; next proposed action (a merge, deploy or DB action still awaits ZURIEL's explicit approval). Session end must leave enough information for a fresh agent to continue release choreography without asking ZURIEL what to upload; approval of the action itself is still required.

OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law + deploy_on_request (active version). No new queue/release store/registry.

[UPDATE v14 · Human-Gate ZURIEL · 11.10.2026 — VISUAL DESIGN LANE / DESIGN-FIRST SURFACE CYCLE / ONE-DIRECTIONAL DISPATCH · EXTEND_EXISTING]
89) VISUAL DESIGN LANE. For 2029 surfaces CLAUDE is the primary writer of the visual layer: shared frame composition (rails, Raziel presence, Now), the shared component kit, per-surface composition/layout, and the final visual acceptance pass. Semantic authority stays with the existing owners: SOD1820_DESIGN_CONTRACT_V2.md + paletteTokens2029.js/designTokens.js (values; palette.js was removed on 5.11.2026), SystemFrame (frame contract), canonical_ui_components_law, experience_governance_foundation_v1_law v9. This assigns a writer lane only; it creates no design owner and changes none of those contracts. Token/contract/icon-family changes go through their owner with Human Gate.
90) DOMAIN / DATA LANE. GPT (coordinator, including Codex executors it dispatches) remains primary writer for capabilities, readers, truth/provenance, PUBLIC/ADMIN/PRIVATE access, research logic, migrations, permissions and release choreography. GPT does not introduce new visual styles, page-local tokens, components or icons; when a surface needs one it assigns CLAUDE. CLAUDE does not change truth/access/data logic, reader semantics, migrations or permissions.
91) DESIGN-FIRST SURFACE CYCLE. New or redesigned surface: (a) GPT writes a short surface brief (capabilities, readers, access states, do-not-touch); (b) CLAUDE builds an isolated real-data preview from the shared kit; (c) ZURIEL decides from use; (d) GPT/Codex wires depth while keeping the adopted components; (e) CLAUDE performs the final visual pass (three presets + phone) before release. Surfaces already built enter the same cycle at (b), using the existing implementation as capability evidence, not as design authority. ONE SCOPE — ONE ACTIVE WRITER applies per step.
92) DUPLICATE CLEANUP AFTER ADOPTION. Visual duplicates (parallel frames, alternative-design branches/routes, preview-only components, duplicate entry points) are removed only after ZURIEL adopts the replacement, item by item, with history preserved in git/DB. A capability is never removed together with its duplicate UI. No silent deletion (§31).
93) ONE-DIRECTIONAL DISPATCH — runtime calibration 11.10.2026. GPT dispatches CLAUDE through ASSIGNMENT. CLAUDE does not create RESULT_WAKE rows toward GPT; it closes with one AFTER (to_actor=GPT, dispatch_kind NULL) and GPT discovers it through §38 at its next turn/idle scan. ZURIEL may also start CLAUDE directly; CLAUDE then records BEFORE/AFTER as usual. CLAUDE may leave a passive memo TO=GPT (no dispatch) for work in GPT's lane. Live evidence: last 7 days CLAUDE→GPT RESULT_WAKE = 144 rows, 138 DEFERRED (no_completed_assistant_text_in_session_items), 6 COMPLETED; GPT→CLAUDE ASSIGNMENT = 167 COMPLETED. Two-way wake may be re-enabled only after the GPT wake path is live-verified, through this owner.
94) DESIGN LOG BUDGET. Design work writes one BEFORE + one AFTER per surface batch (§13), not per visual tweak.

OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law + Design V2 / SystemFrame / canonical_ui_components_law / Experience v9 unchanged. No new owner, law family, queue, store or SSOT.
[UPDATE v15 · Human-Gate ZURIEL · 11.10.2026 19:23 Asia/Jerusalem — ADOPTED VISUAL REFERENCE · EXTEND_EXISTING]
95) APPROVED VISUAL DIRECTION. ZURIEL approved CLAUDE_HOME_LAYOUT_PREVIEW_20261011 as the standing visual-direction reference for subsequent SOD1820 2029 UI design/build assignments: branch ccr-b9fd9245-z14usv, exact commit fa0e26f66d7905c99bd1ec6a0cc5227586480d38, route /2029/home-preview. Preserve its compact, precise, rich composition: slim rails and borders, measured spacing, clear hierarchy, balanced images and progressive disclosure. GPT includes this reference and the surface-specific capabilities/access constraints in each material UI brief; CLAUDE performs the actual design and interface build under §§89–91, starting with a representative real-data preview. GPT preserves the adopted presentation while integrating capabilities; material visual changes return to CLAUDE. Adapt the direction to each surface's semantics rather than copying the whole Home layout or treating every preview detail as approved. Design V2, palette.js/designTokens.js, SystemFrame, canonical shared components and accessibility remain authoritative. This preference is not permission to merge or release the preview. Runtime delivery remains governed by §93; a recorded handoff is not proof that an agent has started.
OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law; existing visual owners and one-directional dispatch preserved.

[UPDATE v16 · Human-Gate ZURIEL · 11.10.2026 19:37 Asia/Jerusalem — MANDATORY CLAUDE VISUAL LANE / ONE-WAY ACTIVATION · EXTEND_EXISTING]
96) MANDATORY, ALL SURFACES AND COMPONENTS. The CLAUDE visual lane in §§89–95 is mandatory for every SOD1820 2029 surface, public/private/admin, existing or new, and every shared or surface-specific visual component, frame, rail, panel, dialog, navigation element, icon, typography, spacing, responsive composition and visual state. GPT and its Codex executors coordinate and implement capabilities/data/access/integration, but do not independently design, replace or restyle these visual elements. Existing approved components may be reused without a new visual invention. Missing or materially changed visual presentation is assigned to CLAUDE; an unavailable specialist runtime is reported as blocked, not replaced with a GPT-designed fallback. Technical integration preserves the adopted interface; visual acceptance returns to CLAUDE before release. This assigns an execution lane, not truth/access/design-token authority. GPT activates CLAUDE through the existing assignment path; CLAUDE returns a passive AFTER to GPT and does not activate GPT. ZURIEL may directly start either agent. No agent may change or bypass this mandatory lane or activation direction, including the re-enable possibility in §93, without a new explicit ZURIEL decision. A current design session must hand off exact branches/heads/files and shared-frame lineage before another visual writer starts; no unified base is declared while that handoff is pending. Preserve previous work and capabilities during reconciliation.
OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law; existing design, data, work_log and release owners unchanged.
$sod_txt$, $sod_meta${"compaction_v1": {"canonical_owner": "inter_agent_coordination_law", "classification": "OWNER", "classified_at": "2026-09-15", "gate": "G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_V1", "owner_family": "agent_governance"}, "g3_disposition_v1": {"classification": "KEEP_CANONICAL_OWNER", "classified_at": "2026-09-15", "gate": "G3_IMPLEMENTATION_COMPACTION_ARCHIVE_PASS", "no_automatic_runtime_inheritance": true, "normal_startup": true, "reason": "canonical owner survives into G3 unless explicitly superseded through owner gate"}, "owner_routing": {"canonical_owner": "inter_agent_coordination_law", "confidence": "high", "domain": "agent_governance", "resolution": "RESOLVED", "version": 1}, "v10_g1_acceptance_scope": {"human_gate": "ZURIEL 2026-09-12", "no_new_context_system": true, "owner_check": "EXTEND_EXISTING", "product_domain_runtimes_use_boundary_acceptance": true, "project_entry_agents_require_fresh_replay": true}, "v11_g3_event_driven_dispatch_carry_forward": {"discover_via": ["SOD1820_MASTER_OWNER_INDEX.md", "SOD1820_MASTER_ROADMAP.md"], "event_driven_target": true, "human_gate": "ZURIEL 2026-09-15", "manual_polling_target": false, "merge_deploy_publish_auto_authorization": false, "no_parallel_agent_system": true, "no_parallel_queue_authority": true, "owner_check": "EXTEND_EXISTING", "priority": "EARLY_G3_FOUNDATION_RUNTIME", "read_only_auto_dispatch_allowed_future": true, "runtime_state": "NOT_IMPLEMENTED_CARRY_FORWARD_ONLY", "write_still_governed": true}, "v12_2029_temporary_legacy_boundary": {"current_production": "LEGACY_TRANSITIONAL_UNTIL_EXPLICIT_CUTOVER", "fresh_agent_must_distinguish_current_vs_target": true, "human_gate": "ZURIEL 2026-09-16", "legacy_is_current_production_runtime": true, "legacy_is_design_authority": false, "new_site_cutover_declared": false, "no_new_owner": true, "owner_check": "EXTEND_EXISTING", "status": "HISTORICAL_PRE_CUTOVER", "superseded_by": "v18_2029_production_explicit_release", "target_architecture": "2029"}, "v13_auto_release": {"auto_canonicalization": false, "dependency_order_agent_owned": true, "human_gate": "ZURIEL 2026-09-17", "owner_check": "EXTEND_EXISTING", "release_advice_states": ["AUTO_RELEASE_NOW", "BUNDLE_WITH", "BLOCKED_BY", "SAFE_INDEPENDENT_WAITING_RUNTIME", "DO_NOT_RELEASE_SUPERSEDED/PARKED"], "release_recommendation_required": true, "separate_taale_required": false, "standing_auto_release": true, "status": "STANDING_AUTO_RELEASE_REVOKED_2026-11-10", "superseded_by": "v18_2029_production_explicit_release", "user_hold_overrides": true}, "v14_visual_lane_one_directional_dispatch": {"claude_result_wake": false, "design_first_cycle": true, "dispatch_direction": "GPT_TO_CLAUDE_ONLY", "domain_lane_writer": "GPT", "duplicate_cleanup": "after_adoption_per_item", "evidence_7d": {"claude_to_gpt_result_wake": 144, "completed": 6, "deferred": 138, "gpt_to_claude_assignment_completed": 167}, "human_gate": "ZURIEL 2026-10-11", "no_new_owner": true, "owner_check": "EXTEND_EXISTING", "visual_lane_writer": "CLAUDE"}, "v15_approved_visual_reference": {"early_real_preview": true, "extends_version": 14, "human_gate": "ZURIEL 2026-10-11T19:23:04+03:00", "no_implicit_paid_wake": true, "no_new_coordination_system": true, "no_production_release_by_this_decision": true, "one_active_writer": true, "owner_check": "EXTEND_EXISTING", "palette_owner": "src/lib/palette.js", "qualities": ["compact precise rich composition", "slim rails and borders", "measured spacing and hierarchy", "balanced images", "progressive disclosure"], "reference": {"branch": "ccr-b9fd9245-z14usv", "commit": "fa0e26f66d7905c99bd1ec6a0cc5227586480d38", "deployment_id": "dpl_4NbUPi7U4rqEm3PBiVh4JNcE4u2s", "deployment_state_verified": "READY", "gpt_visual_browser_check": "NOT_PERFORMED_THIS_TURN", "preview_url": "https://sod1820-git-ccr-b9fd9245-z14usv-sod1820-s-projects.vercel.app/2029/home-preview", "route": "/2029/home-preview", "task_key": "CLAUDE_HOME_LAYOUT_PREVIEW_20261011", "visual_approval": "USER_APPROVED_DIRECTION"}, "role_policy_source": "CLAUDE v14 verified; retained unchanged", "scope": "SOD1820 2029 UI design and interface implementation", "style_preserved_during_gpt_integration": true, "technical_coordinator": "GPT", "ui_design_build_lead": "CLAUDE"}, "v16_mandatory_claude_visual_lane": {"base_selection": "PENDING_ACTIVE_DESIGN_SESSION_EXACT_HEAD_HANDOFF", "claude_result_wake": false, "dispatch_direction": "GPT_TO_CLAUDE_ONLY", "fallback_visual_writer_when_claude_unavailable": false, "human_gate": "ZURIEL 2026-10-11T19:37:14+03:00", "mandatory_visual_writer": "CLAUDE", "manual_history_cleanup": "HOLD_UNTIL_G4_CLOSURE_THEN_EXISTING_WORK_LOG_OWNER", "owner_check": "EXTEND_EXISTING", "policy_change_requires": "NEW_EXPLICIT_ZURIEL_DECISION", "scope": "ALL_SOD1820_2029_SURFACES_AND_VISUAL_COMPONENTS", "technical_coordinator": "GPT", "unilateral_policy_override": false}, "v17_user_only_reporting": {"automatic_specialist_activation": false, "gpt_ack_required": false, "gpt_delivery": false, "human_gate": "ZURIEL 2026-10-14 06:15 Asia/Jerusalem", "recipient": "ZURIEL"}, "v18_2029_production_explicit_release": {"current_production": "2029", "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.", "explicit_approval_per_merge_and_deploy": true, "human_gate": "ZURIEL 2026-11-10", "label_corrected": "label read 'v16' while rule_version was 17", "legacy_is_current_production_runtime": false, "legacy_retired": "2026-11-05", "no_new_system": true, "owner_check": "EXTEND_EXISTING", "production_since": "2026-11-04", "release_advice_state_aliases": {"AUTO_RELEASE_NOW": "READY_FOR_APPROVAL"}, "release_advice_states": ["READY_FOR_APPROVAL", "BUNDLE_WITH", "BLOCKED_BY", "SAFE_INDEPENDENT_WAITING_RUNTIME", "DO_NOT_RELEASE_SUPERSEDED/PARKED"], "standing_auto_release": false}, "v8_fast_routing": {"bulk_rule_loading_default": false, "composition_over_explosion": true, "human_gate": "ZURIEL 2026-09-09", "owner_check": "EXTEND_EXISTING", "profile_rule": "routing aliases only; no copied domain semantics", "read_budget": {"L1": "bootstrap + owner + direct dependencies", "L2": "cross-domain/ambiguity/specialist contract", "L3": "write/release/security/schema/cross-layer live verification"}, "target_horizon": "2029", "task_profiles": ["publish_post", "draft_post", "post_visual", "gallery_work", "gematria_research", "els_research", "source_scan", "roadmap_status", "live_state_check", "release_gate", "ui_experience_work", "db_write"]}, "v9_g1_agent_entry_bootstrap_2029": {"active_entry_surfaces_only": true, "adapters_are_pointers": true, "fresh_agent_acceptance_required": true, "higher_gate_blocked_until_g1_entry_safe": true, "human_gate": "ZURIEL 2026-09-12", "no_new_context_system": true, "owner_check": "EXTEND_EXISTING", "parallel_ssot_forbidden": true}}$sod_meta$::jsonb, true, 'inter_agent_coordination_law', 18,
          v_base.depends_on, 17, v_base.weight, v_base.hebrew_date, v_base.axis_theme, v_base.gallery_id, v_base.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> '0ce1688c34a59353b42c2e1b53322c78' then
    raise exception 'P0 inter_agent_coordination_law: new description md5 mismatch';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='inter_agent_coordination_law' and is_active) <> 1 then
    raise exception 'P0 inter_agent_coordination_law: active version count is not 1';
  end if;
end
$sod_p0$;

-- ── foundation_closure_protocol_law: v7 → v8 ───────────────────────────────────────────────
do $sod_p0$
declare
  v_base public.nodes%rowtype;
  v_new_id uuid;
begin
  select * into v_base from public.nodes
   where type='rule' and rule_id='foundation_closure_protocol_law' and is_active for update;
  if not found then raise exception 'P0 foundation_closure_protocol_law: no active version (drift)'; end if;
  if v_base.rule_version <> 7 then raise exception 'P0 foundation_closure_protocol_law: active version is v% (expected v7)', v_base.rule_version; end if;
  if md5(v_base.description) <> '336934e50ca48dba8cb00cf64986b878' then raise exception 'P0 foundation_closure_protocol_law: description drift (md5 %)', md5(v_base.description); end if;
  if md5(v_base.metadata::text) <> 'b26961fac416ac5e4775e9a41b6deae8' then raise exception 'P0 foundation_closure_protocol_law: metadata drift (md5 %)', md5(v_base.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='foundation_closure_protocol_law' and rule_version > 7) then
    raise exception 'P0 foundation_closure_protocol_law: a version above v7 already exists';
  end if;
  update public.nodes set is_active=false where id=v_base.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$Foundation Closure Protocol v8 — Bottom-Up Closure + Explicit Release Approval$sod_lbl$, $sod_txt$FOUNDATION CLOSURE PROTOCOL v4 — HUMAN-GATE ZURIEL · 11.9.2026

OWNER: foundation_closure_protocol_law. EXTEND_EXISTING. v3 supersedes v2 while preserving the Bedrock Ladder and all prior history. This is NOT a new roadmap, sequence, engine, store or governance system.

CORE RULE
Work moves Foundation → Projection → Experience. No higher-gate release/closure may proceed while a known lower-layer MUST FOUNDATION NOW remains unresolved. Safe evidence gathering/prototyping may continue branch-only; it never counts as closure.

ONE SEQUENCE, NOT THREE
The Master Roadmap W0–W9 remains the build/navigation sequence. G0–G8 are mandatory GATE SEMANTICS over that existing W-sequence, not a parallel plan. The Bedrock Ladder remains the closure procedure used INSIDE every gate:
Bootstrap → Real Stress Test → Redesign-Risk Challenge → MUST/EXTENSION/LATER → Minimal Patch → Replay/Idempotency Proof → Live Verify → FOUNDATION SUFFICIENT/NOT SUFFICIENT.

GATE ↔ W BINDING
G0 = W0 hygiene precondition: live object-state parity, branch/PR hygiene, P0 security, owner-index accuracy.
G1/G2 = W0 + W2 reconciliation: risk-triaged 2029 owner reconciliation + legacy knowledge/Topic/Post/route migration semantics.
G3 = W1 + W2 foundation closure: fabric invariants + capability closure before Goldens.
G3.5 = fixture readiness precondition for W4: Golden fixtures must be executable on live/replayable data.
G4 = W4 Golden Experiences.
G5 = post-W4 Value / Entitlement Product Matrix.
G6 = W3 + W6 global/cross-surface closure.
G7 = W4/W6 final design acceptance with measurable criteria.
G8 = DESIGN CLOSED + release batching + final parity re-proof.

G0 EVIDENCE STANDARD — OBJECT STATE, NOT MIGRATION HISTORY
DB↔Git parity is proven against the actual live OBJECT STATE for the domains touched: columns, functions and bodies, SECURITY DEFINER/INVOKER, grants, RLS/policies, views/triggers/Edge implementations and corresponding current-main representation. Migration history is a hint only and may not be used as the parity oracle. G0 maintains a named divergence register: object → live state → git state → owning PR/lineage → decision KEEP/PORT/RETIRE/REBASE.
Open PRs are classified EVIDENCE / REBASE-CANDIDATE / RETIRE-SUPERSEDED / RELEASE-CANDIDATE; stale PRs are never raw-merged merely because they are open.

G1 RISK-TRIAGED, NOT BULK OWNER SCAN
Do not load every rule. Reconcile first only owners that can force redesign or irreversible migration: identity, truth, authorization/access, temporal/history, publication/indexability, entitlement seam, ELS, Person/privacy/data lifecycle and any owner directly touched by the active gate. Other owners reconcile lazily when reached.

G2 LEGACY KNOWLEDGE RECONCILIATION
Legacy Topics/Convergences/Posts/Galleries/Books/routes are classified by semantic role, never bulk-promoted. Preserve the NO-SECOND-STORE invariant. Dynamic Lens / Canonical Subject / Event / Finding / Publication / Person / Book / Number etc remain distinct. Post canonical-family migration and language/source identity must be explicit before final ontology/design closure.

G3 MUST FOUNDATION NOW BEFORE GOLDENS
At minimum, where still unresolved live:
A. Cross-capability shared-artifact reference/equivalent so independence/dependence is deterministic across Findings. This is a Research-Fabric invariant, not ELS-only.
B. Temporal/history primitives sufficient to preserve occurred/recorded/published/discovered/researched/superseded/interpretation history without rewriting historical truth.
C. Publication/content source-language identity marking; translation runtime may remain later, but identity cannot depend on display language.
D. One server-authoritative entitlement seam separate from capability availability, publication/access and truth. Product pricing/tier allocation remains later.
E. Privacy lifecycle primitives/owner path for consent, retention, export and erasure before opening longitudinal Person/Life/Raziel memory capabilities.
F. ELS callable-core boundary under the ONE-engine invariant; Year/Time identity seam; no browser-only architecture may be treated as Future-Max closure.
G. Replay/idempotency and failure/recovery semantics appropriate to each capability.
Extension Point Now before Goldens: semantic analytics event vocabulary, machine/SEO contract, provider/model independence, spatial render-depth contract. Reporting dashboards, premium economics, extra locales runtime, 3D/AR/VR and collaboration may remain later when no redesign risk exists.

G3.5 FIXTURE READINESS
A Golden that cannot be run does not close a gate. ELS Goldens require exact replayable coordinates or an adjudicated modern fixture; Journey Goldens require a real replayable Journey/path instance; authorized deep-reader Goldens require a safe fixture for withheld/unpublished material. Missing fixtures are explicit blockers, not simulated PASSes.

PREMIUM SPLIT
Access architecture/seam is Foundation. Exact Free/Registered/Premium/Credits product allocation, names, prices and economics belong to G5 after Golden Experiences. Capability availability (site flags) must never be repurposed as entitlement, and entitlement never changes truth quality.

SAFE PARALLELISM
READ_ONLY evidence gathering, challenge and cross-verification are parallel-safe. WRITE may run in parallel only when owner/file/scope is explicitly non-overlapping in work_log. One owner/contract/map path = one active writer. Higher-gate prototypes may exist BRANCH-ONLY as evidence but may not be merged, deployed or cited as closure while lower MUSTs remain.
Lower-layer security/truth/parity defects discovered later are fixed immediately at their owning layer; this does not silently certify or reopen unrelated work.

NO-SKIP COMMAND SEMANTICS
קדימה = proceed only WITHIN the current gate.
תעלה = release authorization only for a scope that is ALREADY gate-clean.
Neither command waives an unresolved MUST. Silence is not waiver.
If a MUST blocks the requested action, the agent must state the blocker id/state and smallest closure path, then stop the blocked action.
A MUST may be waived/superseded only by explicit Human-Gate REPLAN/SUPERSESSION recorded in work_log naming blocker, reason, accepted risk and owner. ZURIEL retains full Human-Gate authority; v3 prevents only accidental/silent bypass.

CLOSURE EVIDENCE
Every gate closure requires fresh live verification with the objects actually checked and an AFTER/evidence row. A branch artifact, stale audit, memory, roadmap sentence or migration ledger alone cannot close a gate. Every gate boundary performs closing reconciliation because live main/DB may drift during the gate itself.

2029 PRINCIPLE
Target 2029-ready Foundation with progressive implementation, not maximal-cost implementation everywhere. Preserve identity, capability, truth, provenance, history, authorization and extension seams now; defer expensive renderers/providers/features when they can attach later without redesign.

Agents must proactively surface unknown-unknown redesign risks. ZURIEL is not required to know the architectural name of a missing primitive before the system raises it.

[UPDATE v4 · Human-Gate ZURIEL · 12.9.2026 — G1 AGENT ENTRY ACCEPTANCE BINDING]
This section supersedes only the G1 scope/closure wording above where needed; G0, G2–G8, the Bedrock Ladder and all no-skip semantics remain unchanged.

G1 now explicitly includes AGENT ENTRY / BOOTSTRAP RECONCILIATION 2029 as a mandatory acceptance dimension alongside risk-triaged 2029 owner reconciliation. The semantic owner is the CURRENT ACTIVE inter_agent_coordination_law; this Foundation rule only binds G1 to that owner and MUST NOT copy its detailed bootstrap semantics.

G1 closure rule: G1 is NOT SUFFICIENT until active agent-entry surfaces/pointers are reconciled to the current inter-agent owner and fresh-agent entry acceptance passes as defined there. Because gates are no-skip, no higher Gate may close while this G1 requirement is open. This does not authorize starting or closing G1 while G0 remains open; it only defines the future G1 acceptance criterion now by explicit Human-Gate direction.

No new Context System, owner, store, registry, router or SSOT is created. G2 legacy-knowledge reconciliation remains separate and unchanged.


[UPDATE v5 · Human-Gate ZURIEL · 15.9.2026 — G2 CANONICAL COMPACTION / OWNER HIERARCHY / ACTIVE TREE FREEZE BINDING]
This section is additive and EXTEND_EXISTING. It creates no new Master, Roadmap, owner registry, archive system, context authority, store, graph or engine. The detailed acceptance body is preserved in `audits/g2-p0-containment/G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_GATE_V1.md`; this rule binds closure to that gate without duplicating its body.

G2 CLOSURE BINDING: formal G2 closure is NOT SUFFICIENT until the Canonical Compaction / Owner Hierarchy / Active Tree Freeze gate passes in addition to all other active Foundation/Product Capability blockers. This is a no-skip condition under the existing command semantics; קדימה/תעלה do not waive it.

MINIMUM BINDING OUTCOME: 0 material orphan active laws; 100% active-rule routing classification; owner-family hierarchy resolved without super-law duplication; compact Master current-state/pointer form with historical snapshot preserved; Roadmap reduced to navigation/priority/gates/sequence/open decisions; bounded current/open work-log routing; One Decision → One Canonical Body; exact surviving release states; fresh-agent acceptance PASS; historical provenance preserved.

ANTI-INFLATION BINDING: after compaction, domain semantics live at their owner; atomic research lives in Research OS; coordination/release provenance lives in work_log; priority/sequence lives in Roadmap; Master records only material current state/Human-Gate/closure plus pointers. Importance does not justify copying a full audit/contract into Master.

G3 BINDING: a second Implementation Compaction / Archive Pass is mandatory at the end of G3 to retire superseded prototypes/branches/audits from normal startup routing while preserving provenance. It is not a second roadmap or archive system.

Closure evidence must include a fresh-agent replay over representative domains after compaction. Failure to route correctly with bounded reads keeps the gate OPEN.


[UPDATE v6 · Human-Gate ZURIEL · 17.9.2026 — RELEASE BINDING · EXTEND_EXISTING · standing auto-release revoked by v8 (ZURIEL 10.11.2026)]
RELEASE BINDING (v8). Once a bounded release scope has satisfied every applicable lower MUST, gate, dependency, current-main reconciliation, required specialist/security/privacy acceptance and release recovery condition, it is READY_FOR_APPROVAL: the Primary Owner presents the exact commit/deployment to ZURIEL and releases only after his explicit approval of that specific action (deploy_on_request, active version). Gate-clean is a precondition, never an authorization; there is no standing release authorization.
NO-SKIP REMAINS ABSOLUTE. Explicit approval does not weaken any Foundation MUST or acceptance standard. קדימה/תעלה never waive a blocker.
HUMAN-DECISION RESERVE. Explicit Human Gate remains for decisions that change canonical governed truth/publication where required, destructive irreversible state, paid product economics, material privacy/security weakening, permanent deletion/retirement of preserved history/capability, or another owner-specific Human decision.
RELEASE ADVICE. Gate closure/handoff must expose whether the scope is READY_FOR_APPROVAL (formerly AUTO_RELEASE_NOW), BUNDLE_WITH, BLOCKED_BY, SAFE_INDEPENDENT_WAITING_RUNTIME, or DO_NOT_RELEASE_SUPERSEDED/PARKED, so ZURIEL is not required to infer dependencies.

OWNER CHECK: EXTEND_EXISTING foundation_closure_protocol_law + deploy_on_request (active version). No new gate system.

[UPDATE v7 · Human-Gate ZURIEL · 29.9.2026 — BOTTOM-UP CLOSURE / NO PREMATURE ASCENT + MAINTENANCE ACCEPTANCE · EXTEND_EXISTING]

87) VERIFY-BEFORE-BUILD. Before any new WRITE intended to close a gate or lower-layer blocker, first verify live owner/runtime/current-main state to determine whether the required capability or acceptance evidence already exists. If the canonical runtime already satisfies the requirement, do not rebuild, duplicate or backfill merely because a raw storage field/audit snapshot appears incomplete. Evidence must be read through the owner-defined effective contract.

88) LOWER DEPENDENCIES FIRST. Closure follows dependency order: Foundation → runtime seam → capability → projection → experience. A higher node may remain visible/branch-only as evidence, but it is not CLOSED while a load-bearing lower dependency is unresolved.

89) ONE GAP → ONE DESCENT. A later-discovered lower-layer defect descends only to its owning branch/seam and the smallest affected dependency set. It does not reopen all of G2/G3 or unrelated closed work. After the gap is closed and reverified, execution resumes from the interrupted dependency point.

90) ASCENT EVIDENCE REQUIRED. Before a layer is marked CLOSED, evidence must include, where applicable: current canonical owner resolution; live/runtime or replay evidence; at least one negative/failure path; proof of no parallel authority/system; exact-head tests/challenge when required; and current-main/live reconciliation. UI readiness, a Golden-looking screen, branch existence or a percentage complete are not closure evidence by themselves.

91) NO PERCENTAGE-DRIVEN BUILDING. Completion percentages are dashboard context only. Dependency gates determine whether ascent is allowed. “95% complete” never waives a lower MUST, and a visible surface never authorizes skipping its unresolved substrate.

92) POST-CLOSURE INVARIANT MAINTENANCE. A closed lower gate remains closed only while its routing/compaction invariants remain current. After any material owner-version promotion, the existing owner/coordination tooling must check classification inheritance, compaction metadata and current Owner Index pointer/routing. Version drift that changes only pointers/metadata is repaired without reopening unrelated architecture; semantic drift follows the owning gate.

93) G3 MAINTENANCE ACCEPTANCE MATRIX — RECONCILIATION, NOT A NEW SYSTEM. Before formal G3 CLOSED, reconcile all operational maintenance/monitoring/control requirements gathered during G3 through the existing owners and projections. For every existing or planned operational capability, record exactly: OWNER → SIGNAL → ENFORCEMENT → PROJECTION, plus one status from LIVE_VERIFIED / IMPLEMENTED_NOT_LIVE / PLANNED_G3 / LATER_STAGE / GAP. No Monitoring/Watchman/Control/Cost system 2 may be created.

94) MINIMUM G3 MAINTENANCE COVERAGE. The reconciliation must include at least: reliability/health; browser/runtime failures; dead-man; exact-SHA canary; operational trace/correlation; provider/AI cost; cache/billable state; egress; DB/query performance; capacity/growth/top-growers; retention/compaction; privacy/RLS failures; restore/recovery evidence; and release health. Each row resolves through its current canonical owner; later-stage items receive an explicit carry-forward and do not keep G3 open when no G3 redesign risk remains.

95) OBSERVABILITY IS NOT ENFORCEMENT. If the original requirement is protective/guarding, a signal or dashboard alone is not acceptance-complete. The row is CLOSED only when the required owner-native enforcement exists and is verified. Example: an exact-SHA canary that records failure but cannot block the NEXT release where deploy_on_request requires that gate remains incomplete. Detection-only requirements may close as detection only when the owner contract says so.

96) PRIVACY-BY-DESIGN FOR OPERATIONS. Maintenance telemetry is operational evidence, not a Truth Store. Preserve metadata/correlation/hashes/secure references where sufficient; do not copy raw private corpus, credentials or unrestricted personal payloads into trace/health/cost/incident stores.

97) NO DUPLICATE MAINTENANCE IMPLEMENTATION. Final G3 closure must prove that parallel sessions did not implement the same maintenance requirement twice. Reconcile duplicate candidates to one canonical owner/runtime/projection; classify the others as superseded/absorbed/archive evidence while preserving provenance.

98) G3 ASCENT BINDING. The active G3 route is bottom-up: small G2 routing hygiene only when live drift requires it → No-Black-Box effective acceptance → client/server correlation + material-path trace coverage → remaining lower-layer closure by dependency → ELS runtime closure/Goldens/statistical controls/provenance → global G3 reliability pre-close → Maintenance Acceptance Matrix reconciliation → Implementation Compaction → independent Foundation challenge → G3 CLOSED → G3.5. This is navigation over existing owners, not a second roadmap.

OWNER CHECK: EXTEND_EXISTING foundation_closure_protocol_law v6 + existing domain owners + inter_agent_coordination_law + deploy_on_request. No new closure, monitoring, maintenance, trace, cost, control or roadmap system.
$sod_txt$, $sod_meta${"challenge_work_log": "1eee4a69-72a1-46e1-9959-3bd9c68c70f2", "command_semantics": {"kadima": "within_current_gate_only", "taale": "explicit_approval_for_exact_presented_scope", "waiver": "explicit_replan_or_supersession_only"}, "compaction_v1": {"canonical_owner": "foundation_closure_protocol_law", "classification": "OWNER", "classified_at": "2026-09-15", "gate": "G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_V1", "owner_family": "foundation_governance"}, "direction_work_log": "64c2eec3-79a4-43b5-ae60-dbf42d60e70b", "g3_disposition_v1": {"classification": "KEEP_CANONICAL_OWNER", "classified_at": "2026-09-15", "gate": "G3_IMPLEMENTATION_COMPACTION_ARCHIVE_PASS", "no_automatic_runtime_inheritance": true, "normal_startup": true, "reason": "canonical owner survives into G3 unless explicitly superseded through owner gate"}, "gates_over_existing_w_sequence": true, "human_gate_date": "2026-09-11", "no_new_system": true, "owner_check": "EXTEND_EXISTING", "owner_routing": {"canonical_owner": "foundation_closure_protocol_law", "confidence": "high", "domain": "foundation_governance", "normalized_at": "2026-09-15", "resolution": "RESOLVED_G2_COMPACTION"}, "parity_standard": "object_state", "source": "ZURIEL Human Gate + GPT + Claude read-only challenge", "v4_g1_agent_entry_binding": {"fresh_agent_acceptance_required": true, "human_gate": "ZURIEL 2026-09-12", "no_g1_execution_while_g0_open": true, "no_new_context_system": true, "semantic_owner": "inter_agent_coordination_law"}, "v5_canonical_compaction_binding": {"g2_no_skip": true, "g3_compaction_mandatory": true, "gate_artifact": "audits/g2-p0-containment/G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_GATE_V1.md", "human_gate": "ZURIEL 2026-09-15", "no_new_system": true, "owner_check": "EXTEND_EXISTING", "principles": ["0_orphan_active_laws", "100_percent_active_rule_classification", "owner_family_hierarchy", "master_v3_compact", "roadmap_compact", "bounded_work_log_current", "one_decision_one_canonical_body", "future_admission_anti_inflation", "fresh_agent_acceptance", "preserve_provenance"]}, "v6_auto_release_binding": {"human_decision_reserve": true, "human_gate": "ZURIEL 2026-09-17", "no_skip_unchanged": true, "owner_check": "EXTEND_EXISTING", "separate_taale_required": false, "standing_auto_release_for_gate_clean_routine_scope": true, "status": "STANDING_AUTO_RELEASE_REVOKED_2026-11-10", "superseded_by": "v8_explicit_release_approval_binding"}, "v7_bottom_up_closure_binding": {"ascent_evidence_required": true, "duplicate_maintenance_reconciliation_required": true, "human_gate": "ZURIEL 2026-09-29", "maintenance_acceptance_matrix": true, "maintenance_shape": ["OWNER", "SIGNAL", "ENFORCEMENT", "PROJECTION"], "maintenance_statuses": ["LIVE_VERIFIED", "IMPLEMENTED_NOT_LIVE", "PLANNED_G3", "LATER_STAGE", "GAP"], "no_new_monitoring_system": true, "one_gap_one_descent": true, "owner_check": "EXTEND_EXISTING", "percentage_not_gate": true, "post_closure_invariant_maintenance": true, "privacy_by_design": true, "verify_before_build": true}, "v8_explicit_release_approval_binding": {"explicit_approval_per_merge_and_deploy": true, "human_gate": "ZURIEL 2026-11-10", "no_new_system": true, "no_skip_unchanged": true, "owner_check": "EXTEND_EXISTING", "standing_auto_release": false}}$sod_meta$::jsonb, true, 'foundation_closure_protocol_law', 8,
          v_base.depends_on, 7, v_base.weight, v_base.hebrew_date, v_base.axis_theme, v_base.gallery_id, v_base.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> 'eb603a65f8a4a9a58e8d4548f0663e65' then
    raise exception 'P0 foundation_closure_protocol_law: new description md5 mismatch';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='foundation_closure_protocol_law' and is_active) <> 1 then
    raise exception 'P0 foundation_closure_protocol_law: active version count is not 1';
  end if;
end
$sod_p0$;

-- ── system_suggestions_law: v5 → v6 ───────────────────────────────────────────────
do $sod_p0$
declare
  v_base public.nodes%rowtype;
  v_new_id uuid;
begin
  select * into v_base from public.nodes
   where type='rule' and rule_id='system_suggestions_law' and is_active for update;
  if not found then raise exception 'P0 system_suggestions_law: no active version (drift)'; end if;
  if v_base.rule_version <> 5 then raise exception 'P0 system_suggestions_law: active version is v% (expected v5)', v_base.rule_version; end if;
  if md5(v_base.description) <> '9b5c19de501b1985da01ddfc9c646d3c' then raise exception 'P0 system_suggestions_law: description drift (md5 %)', md5(v_base.description); end if;
  if md5(v_base.metadata::text) <> 'aa247fb211e2fec0454cb457dd4fc86d' then raise exception 'P0 system_suggestions_law: metadata drift (md5 %)', md5(v_base.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='system_suggestions_law' and rule_version > 5) then
    raise exception 'P0 system_suggestions_law: a version above v5 already exists';
  end if;
  update public.nodes set is_active=false where id=v_base.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$System Intelligence v6 — Resource-Aware Reliability + Explicit Release Approval$sod_lbl$, $sod_txt$החלטת צוריאל 12.7.2026 (הרחבת ai_style_learning_law לכל המערכת, לפי פרוטוקול שהציע וצוריאל אישר): «המערכת לעולם אינה משנה את עצמה. היא רק לומדת, מסבירה ומציעה.» חמישה שלבים: (1) Observe — כל רכיב רושם תצפיות (ai_analysis_log, relation_evidence, אירועים). (2) Detect — detect_suggestions() רץ מחזורית ומזהה דפוסים חוצי-סף (כרגע גלאי style_continue_rate: סגנון עם ≥40 ניתוחים ופער continue-rate ≥10 נק׳; ו-pending_ratings ≥20). (3) Suggest — יוצר שורה ב-system_suggestions (category ai/ux/research/performance/knowledge, title, dedupe_key אנטי-ספאם; לא מעלה שוב משהו שנדחה ב-30 יום). (4) Explain — כל המלצה נושאת reason + observed(jsonb הנתונים) + confidence(0-100, היוריסטיקה מסומנת ככזו) + sample_size + estimated_impact. (5) Decide — רק צוריאל: admin_suggestion_decide → accepted/rejected/later/pending. UI: טאב אדמין «🧠 המלצות המערכת» (כרטיסי Confidence/Reason/Observed/Impact + קבל/דחה/המתן, טאבי-סטטוס). ⛔ אין ביצוע אוטומטי של המלצה — קבלה = החלטה אנושית, המימוש ידני. השומר (system-watchman): edge function + cron שבועי (jobid 19, ראשון 08:00) — מריץ גלאים, בונה site_pulse(7), ושולח דייג׳סט (אימייל Resend + וואטסאפ wa_send) רק כשיש משהו מעל-סף (worth); admin_notify (server-only) מחזיק יעדים; admin_fire_watchman = «שלח עכשיו». תלות-קונפיג של צוריאל: (א) וואטסאפ דורש chat_id פרטי (@c.us) שהוא מזין בפאנל — לא נשמר בקוד/אתר; (ב) אימייל דורש RESEND_API_KEY ב-Edge secrets (בבדיקה חזר no_resend_key). RPCs: suggest_add/detect_suggestions/site_pulse (service) · admin_suggestions_list/decide/notify_get/set/fire_watchman (rd_is_admin). רכיב: SystemSuggestionsTab.jsx (מסוף הניהול הישן; הוסר ב-5.11.2026, #1239). הרחבה עתידית: גלאי UX/Performance/Knowledge + A/B כשתצטבר תנועה.

[UPDATE v2 · Human-Gate ZURIEL · 17.9.2026 — NO BLACK BOX / FULL EXECUTION TRACE · EXTEND_EXISTING]

1. EVERY MATERIAL EXECUTION HAS ONE ROOT TRACE. Any user/admin/background interaction that can consume compute, AI, tools, storage, network, media processing, indexing or material DB work receives a stable trace_id. One user action may create many spans; it never becomes many unrelated cost stories.

2. SPAN TREE, NOT FLAT LOG. Every engine/model/tool/DB/RPC/cache/network/media/background step is a span with span_id, parent_span_id, root trace_id, start/end/duration and outcome. Parallel engines are sibling spans; sequential delegation is parent→child; final merge/synthesis is its own span. A three-engine workflow MUST expose the cost/time/input/output of each engine separately plus the merge.

3. ROUTING DECISION PROVENANCE. Each AI/engine span records capability/domain, Research/Action Plan reference, intelligence level, selected engine/provider/model/version, routing reason, escalation/fallback reason, entitlement/budget decision reference and whether the output was used, partially used, rejected or superseded in the final result.

4. LOWEST-USEFUL RESOURCE RESOLUTION. Where provider/runtime exposes it, preserve input/output/cached/reasoning/audio tokens separately; live/session seconds; TTS/STT seconds or characters/tokens; image/video generation units/render duration; tool/API calls; DB/RPC/query counts and elapsed time; rows/items/search-space examined; storage/index bytes; ingress/egress bytes; cache hit/miss; client GPU tier/runtime when material; retries/continuations/fallbacks. UNKNOWN remains UNKNOWN, never zero by invention.

5. COST LEDGER PER SPAN + ROLLUP. Each billable span can preserve provider-native amount/currency, pricing schedule/version/effective time, unit counts, FX snapshot/rate/effective time, cost_ils and exact/estimated/unknown state. Root interaction cost is the sum of child billable spans without double-counting. Credits charged and customer price remain separate product dimensions.

6. COMPLETION/FAILURE DETAIL. Record success, partial, continuation_required, negative_result, access_filtered, cache_hit, degraded_fallback, cancelled, timeout, provider_error, tool_error and failed_with_reason where relevant; provider stop_reason/error code/request id/retry ordinal are preserved when available. Silent failure is forbidden.

7. REPLAY FINGERPRINT. A decision-relevant span should be reconstructable from references to input/source bundle, canonical owner/rule versions, prompt/template version, model/provider version, tool/engine version, parameters/search bounds, locale/surface/capability, and produced Result Bundle/artifact ids. Large/private payloads are referenced, not blindly duplicated.

8. PRIVACY-SAFE FULL OBSERVABILITY. Operational event coverage target is 100% for material execution, but raw private content is NOT automatically copied into telemetry. Use non-PII subject/user references, hashes, redacted summaries, secure object references and owner-specific retention/access. Secrets, credentials and unrestricted private corpus content are forbidden in operational trace payloads.

9. TRACE CONTINUITY ACROSS LAYERS. Browser/action → server/edge → planner/router → engine/tool → storage/media → response/export must carry correlation context whenever technically possible. Lost trace propagation is an observable defect, not accepted normal behavior.

10. MULTI-ENGINE ACCOUNTABILITY. Fan-out/fan-in must record engine count, parallel/sequential topology, each engine result status, disagreement/cross-check state, synthesis input references and which evidence/results actually affected the answer. Paying for an engine whose output is discarded remains visible.

11. QUALITY + COST TOGETHER, NEVER COLLAPSED. Latency/cost/resource metrics may be joined to quality, completion, user/admin rating and downstream usefulness for optimization, but cheaper/faster never becomes Truth and quality scores never rewrite cost. System Suggestions may recommend routing/cache/budget changes; it never self-applies them.

12. DRILL-DOWN REQUIREMENT. Admin observability must support roll-up and drill-down: day → capability → surface/channel → user/session class → root trace → span → provider/model/tool → resource units/cost/outcome. Aggregates without a route to the underlying trace are insufficient for new G3 runtime.

13. IMPLEMENTATION COMPATIBILITY. Existing ai_token_log, agent_token_costs, ai_analysis_log, metatron_eval_runs, provider pricing and other owner-native logs remain inputs/history. They are not deleted. New G3 execution must progressively emit/link the canonical trace/span dimensions instead of creating more disconnected cost logs.

14. ACCEPTANCE. Golden tests include three-engine parallel fan-out + synthesis; sequential escalation; cache hit; retry/continuation; timeout/cancel; unpriced model; partial failure; private-input redaction; trace propagation across Edge/tool boundary; and exact root cost rollup with no double-count.

OWNER CHECK: EXTEND_EXISTING system_suggestions_law + ai_analyze_contract/raziel_routing/resource observability owners. No second Truth system. The physical trace schema/transport may be implemented during G3 under the smallest existing operational owner and must preserve compatibility with current logs.

[UPDATE v3 · Human-Gate ZURIEL · 19.9.2026 — GOVERNED SELF-MAINTENANCE · EXTEND_EXISTING]
15. SEMANTIC SELF-MODIFICATION REMAINS FORBIDDEN. The system does not autonomously rewrite research truth, canonical meaning, owners, pricing/economics, privacy/security posture, destructive data, publication state or preserved capability/history. Infrastructure maintenance is a separate bounded execution class.
16. PROACTIVE UPGRADE RADAR. Foundation/runtime dependency drift may be detected automatically from authoritative structured sources and surfaced through the existing system_suggestions flow with current/latest/delta/source evidence. Current-version authority must follow current origin/main/runtime state rather than a stale copied baseline.
17. ACCEPT = IMPLEMENTATION HANDOFF FOR UPGRADE RADAR. When ZURIEL accepts a dependency_upgrade_radar suggestion through the existing admin_suggestion_decide Human Gate, the system may automatically create one idempotent branch-only CLAUDE maintenance assignment carrying the exact package/current/latest/delta evidence. ZURIEL is the decision owner, not the messenger.
18. PREPARATION IS NOT RELEASE. The maintenance assignment may reverify current main, update only the bounded dependency/runtime files required by the accepted suggestion, regenerate the lockfile, run tests and open a PR. The assignment itself is BRANCH_ONLY_NO_MERGE_NO_DEPLOY and never grants publication/canonicalization or production release.
19. RELEASE REUSES deploy_on_request. Patch/minor routine maintenance may be released only after current-main reconciliation, dependency closure, peer-resolution, CI/Golden/security checks and no writer overlap, and then only with ZURIEL's explicit approval of the exact merge/deploy (deploy_on_request, active version; no standing authorization). Major runtime/framework upgrades remain Foundation changes: they may be prepared after Human acceptance but require Foundation redesign-risk challenge and any applicable Human Gate before release.
20. STALE SUGGESTION FAILS CLOSED. The maintenance agent must re-read origin/main and authoritative provider metadata before editing. If current no longer equals the accepted observed.current, or latest is no longer the same stable target, it stops/no-ops rather than upgrading from stale evidence.
21. ONE TREE / ONE TRACE. Upgrade work reuses system_suggestions, work_log dispatch, existing GitHub/CI and release owners. No Upgrade Store, Maintenance Queue, second scheduler or second release system. Suggestion id, assignment id, branch/PR/head, tests, rollback and final live verification remain traceable.
OWNER CHECK: EXTEND_EXISTING system_suggestions_law + inter_agent_coordination_law + deploy_on_request. No second maintenance system.

[UPDATE v4 · Human-Gate ZURIEL · 27.9.2026 — INCIDENT INTELLIGENCE + USER PROBLEM SIGNALS · EXTEND_EXISTING]
22. ONE INCIDENT TREE, NO PARALLEL BUG SYSTEM. Product-health anomalies, operational failures and user problem reports extend the existing Observe→Detect→Suggest→Explain→Decide tree. Canonical flow: owner-native telemetry / ingest_event(events) / admin_system_health / operational traces → bounded detector + correlation/dedupe → system_suggestions → Control Plane / Watchman → ZURIEL decision. Do not create a parallel Incident Store, Bug Center owner, Health owner or alert scheduler merely for this capability.
23. SILENT FAILURE IS A DETECTABLE DEFECT. A flow that starts materially but stops before its expected completion must be measurable where the system has an observable completion boundary. Examples include OTP requested→session established, upload started→object admitted, payment/request started→ack, research execution started→result/explicit failure, scheduled job expected→successful run. Absence of a completion signal is not automatically proof of failure; detectors must use bounded windows, sufficient samples and explicit uncertainty.
24. DETECTOR FAMILIES. The existing detector layer may consume canonical sources appropriate to the failure: Traffic Intelligence for behavior/funnel deltas; admin_system_health for DB/cron/bot/media/security health; operational traces for timeout/provider/tool/partial outcomes; owner-native logs for auth/API/capability-specific completion; Web Vitals for experience regressions. A detector must name source, window, baseline/threshold, sample size, confidence and affected surface/capability. UNKNOWN stays UNKNOWN.
25. FUNNEL/BASELINE ANOMALIES. Detect meaningful collapse or deviation against a recent comparable baseline rather than hard-coding one universal rate. A zero-completion streak after repeated starts, a material increase in failure/timeout rate, or a sharp drop in completion/conversion can raise a pending system_suggestions item. Seasonality, small samples, deployments and known access changes must be included when relevant.
26. USER REPORTS ARE INPUT, NOT FACT. A user-facing problem report is an Observation signal. It may include optional text/screenshot plus privacy-safe auto-context. One report does not prove an incident. Multiple matching reports may be clustered by surface/capability/error signature/build/time window; clusters can raise or strengthen a system_suggestions incident. Content/community reports remain under their own owners and are not silently reclassified as system incidents.
27. SEVERITY + ALERT POLICY. Incident suggestions carry severity in observed metadata: info | warning | high | critical. Severity is evidence-based and separate from confidence. Critical/high may trigger Watchman notification promptly when thresholds are met; warning/info default to Control Plane/digest unless repeated or escalating. Deduplication suppresses alert storms while preserving occurrence counts and first/last-seen evidence.
28. ADMIN PROJECTION. Control Plane remains a projection, never a new source of truth. Its “what requires attention now” area should project unresolved incidents, affected surfaces, first/last seen, sample/failure counts, severity/confidence, linked traces/health evidence, deployment/build context, and matching user-report clusters where available. The existing System Suggestions decision flow remains the Human Gate.
29. RECOVERY MUST BE VERIFIED. An incident is not “fixed” because code was changed. Resolution evidence requires the affected completion/health signal to recover in live reality over an appropriate window or an exact reproducible acceptance proving the issue closed. Reopen/escalate if the same signature returns.
30. PRIVACY/SECURITY. Incident telemetry must not copy secrets, OTP values, passwords, unrestricted private content or raw sensitive payloads into events/system_suggestions. Use route/surface/capability, non-secret error/outcome code, build/version, coarse auth/session class, trace id, viewport/device class and redacted/user-provided description. Existing Person/Truth/privacy/RLS boundaries remain controlling.
31. HUMAN GATE. Detection, grouping, severity assignment, notification and recommendation may be automatic. Semantic changes, production fixes, publication, destructive actions, access/privacy changes and release remain governed by their existing owners/Human Gate.
OWNER CHECK: EXTEND_EXISTING system_suggestions_law + traffic_intelligence_law + existing Control Plane/System Health. No second incident/feedback/alert system.

[UPDATE v5 · Human-Gate ZURIEL · 27.9.2026 — RESOURCE-AWARE RELIABILITY · EXTEND_EXISTING]
32. ZERO-AI MONITORING DEFAULT. Health, incident, funnel, runtime-error, dead-man and synthetic checks use deterministic telemetry/SQL/HTTP/status logic by default. They MUST NOT invoke LLM/AI merely to decide whether something is healthy. AI may be requested only after an incident already exists and only when explanation/triage materially benefits from it. Normal monitoring token budget target = ZERO.
33. EVENT-DRIVEN FIRST. Prefer signals emitted by the real action itself (success/failure/outcome/runtime error/deploy event/user report) over recurring scans. Cron/polling exists only where no trustworthy event boundary exists or to provide bounded dead-man coverage.
34. CADENCE BUDGET. New reliability cron jobs faster than 15 minutes are forbidden by default unless a documented SLA/incident history justifies the cost and the Human Gate approves. Cheap existing agent-dispatch recovery is a separate coordination runtime and is not an incident-monitoring exception. Existing health-watch cadence is 15 minutes after this decision.
35. SYNTHETIC JOURNEY BUDGET. Synthetic critical-journey checks are deterministic, bounded and sparse: run after production deploy and at most four scheduled passes per day unless an incident temporarily raises cadence. No real-user mailbox, payment or private corpus may be consumed. Auth synthetic may validate initiation/contract with a dedicated test identity; real completion health also uses aggregate real-user funnel signals.
36. CLIENT RUNTIME ERRORS ARE EVENT-DRIVEN. Browser error/unhandled-rejection/chunk-load/network outcome signals should be emitted when they occur into the existing observation pipeline, with build/route/surface/error-signature context and no raw private payload. No polling is needed for client errors.
37. DEAD-MAN / SENSOR FRESHNESS. The system must distinguish “no incidents” from “no sensor”. Existing System Health/Control Plane should expose last-good timestamps for critical sensors/detectors/notification paths. Dead-man evaluation is cheap timestamp comparison inside an existing health pass; it does not justify another fast cron.
38. POST-DEPLOY CANARY. Every production release must trigger bounded smoke/Golden checks against the exact deployed SHA. Failure marks release health UNHEALTHY/BLOCKED_FOR_NEXT_RELEASE and alerts through the existing notification path. No automatic rollback; rollback remains governed Human Gate.
39. RESTORE PROOF, NOT BACKUP THEATER. Repo snapshots or provider backups are not closure proof by themselves. At G3 closure and thereafter on a low-frequency/manual cadence, perform an isolated recovery drill proving that required schema/migrations, critical canonical data/metadata and configuration pointers can be reconstructed without destructive production actions. No high-frequency restore cron.
40. G3 PRECLOSE RELIABILITY SET. Before G3 closes, live verification is required for: (a) IssueReport + incident detection tree; (b) event-driven client runtime error capture; (c) sparse synthetic critical journeys; (d) sensor/notification dead-man; (e) post-deploy production canary; (f) at least one isolated restore drill. Contract-only state is insufficient.
OWNER CHECK: EXTEND_EXISTING system_suggestions_law + Traffic Intelligence + existing System Health/Control Plane + deploy_on_request. No second monitoring platform, incident scheduler, AI monitor or reliability store.$sod_txt$, $sod_meta${"acceptance_cases": ["three_engine_parallel_synthesis", "sequential_escalation", "cache_hit", "retry_continuation", "timeout_cancel", "unpriced_model", "partial_failure", "private_redaction", "cross_layer_trace_propagation", "no_double_count_cost_rollup"], "compaction_v1": {"canonical_owner": "system_suggestions_law", "classification": "OWNER", "classified_at": "2026-09-15", "gate": "G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_V1", "owner_family": "system_intelligence"}, "default_min_cron_minutes": 15, "drilldown_path": ["day", "capability", "surface_channel", "session_class", "root_trace", "span", "provider_model_tool"], "event_driven_first": true, "full_execution_trace": true, "g3_disposition_v1": {"classification": "KEEP_CANONICAL_OWNER", "classified_at": "2026-09-15", "gate": "G3_IMPLEMENTATION_COMPACTION_ARCHIVE_PASS", "no_automatic_runtime_inheritance": true, "normal_startup": true, "reason": "canonical owner survives into G3 unless explicitly superseded through owner gate"}, "human_gate_v2": "ZURIEL 2026-09-17", "human_gate_v4": "ZURIEL 2026-09-27", "human_gate_v5": "ZURIEL 2026-09-27", "human_gate_v6_release": {"changed": ["§19: release reuses deploy_on_request (active version) only with explicit approval", "SystemSuggestionsTab.jsx marked removed (5.11.2026, #1239)"], "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.", "human_gate": "ZURIEL 2026-11-10", "no_new_system": true, "owner_check": "EXTEND_EXISTING"}, "incident_intelligence": true, "incident_observation_carriers": ["events/ingest_event", "admin_system_health", "operational_trace", "traffic_intelligence", "owner_native_logs", "web_vitals"], "incident_projection": "ControlPlane2029 + SystemSuggestions/Watchman", "incident_severity": ["info", "warning", "high", "critical"], "monitoring_ai_default": false, "multi_engine_trace_required": true, "no_black_box": true, "no_parallel_incident_store_by_default": true, "normal_monitoring_token_budget": "zero", "operational_event_coverage_target": "100_percent_material_execution", "owner_check_v2": "EXTEND_EXISTING", "owner_check_v4": "EXTEND_EXISTING", "owner_routing": {"canonical_owner": "system_suggestions_law", "confidence": "high", "domain": "system_intelligence", "normalized_at": "2026-09-08", "resolution": "RESOLVED", "source": "SOD1820_MASTER_OWNER_INDEX/project_codex._index/existing_owner_contracts", "version": 1}, "post_deploy_canary_required": true, "raw_private_payload_logging": false, "recovery_requires_live_verification": true, "resource_aware_reliability": true, "restore_drill_required_before_g3_close": true, "sensor_deadman_required": true, "span_resource_dimensions": ["text_tokens", "cached_tokens", "reasoning_tokens", "audio_tokens_or_seconds", "tts_stt_units", "media_generation_units", "tool_api_calls", "db_rpc_queries", "rows_search_space", "storage_index_bytes", "network_bytes", "cache_hit_miss", "client_gpu_when_material", "latency", "retries_continuations"], "synthetic_max_scheduled_passes_per_day": 4, "trace_shape": "root_trace_span_tree", "user_report_stage": "Observation", "v3_self_maintenance_2026_09_19": {"accepted_upgrade_auto_handoff": true, "branch_only_agent_execution": true, "human_gate": "ZURIEL", "major_requires_foundation_gate": true, "no_new_store_queue_registry": true, "owner_check": "EXTEND_EXISTING", "routine_release_owner": "deploy_on_request v2", "semantic_self_modification": false}}$sod_meta$::jsonb, true, 'system_suggestions_law', 6,
          v_base.depends_on, 5, v_base.weight, v_base.hebrew_date, v_base.axis_theme, v_base.gallery_id, v_base.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> '98d4d88e16d2ec5f70dac6e5a7f98ea5' then
    raise exception 'P0 system_suggestions_law: new description md5 mismatch';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and is_active) <> 1 then
    raise exception 'P0 system_suggestions_law: active version count is not 1';
  end if;
end
$sod_p0$;

-- ── project_codex #4 publishing_conventions ────────────────────────────────────────
do $sod_p0$
declare v_body text;
begin
  select body into v_body from public.project_codex where id=4 and slug='publishing_conventions' for update;
  if not found then raise exception 'P0 codex publishing_conventions: row missing'; end if;
  if md5(v_body) <> '26b473b72d55c57153c6678543d25094' then raise exception 'P0 codex publishing_conventions: body drift (md5 %)', md5(v_body); end if;
  update public.project_codex set body=$sod_txt$(מקור: CLAUDE.md — לכבד תמיד)
- פוסט על אירוע שקורה / חדשות / תיעוד בזמן אמת → קטגוריה `תיעוד אירועים`.
- קטגוריות ותגיות: להשתמש בקיימות, לא להמציא כפילויות. לבדוק לפני פרסום: `select distinct unnest(categories) from posts;` / `... unnest(tags) ...`.
- לקשר פוסטים קשורים: בלוק «ראו גם» בתחתית התוכן עם `<a href="/<slug>">`.
- תמונה ראשית: אפשר שימוש חוזר ב-image_url של פוסט קשור (כדי שתופיע גם בדף הבית/רשימות).
- יצירה ידנית: `insert into posts (id, wp_id, ...) overriding system value values (...)` עם id/wp_id מעל ה-max; source='ai' לפוסט שנכתב ב-AI.
- כותב (author): ריק → מוצג "המערכת" (לוגו). קטגוריית `התחזקות` → כותב "מזכה הרבים". מרשם: src/lib/authors.js. הערה: בדף הפוסט תיבת הכותב מוסתרת כשהכותב הוא "המערכת" (ברירת מחדל) — מוצגת רק לכותב אמיתי.
- תווית אימות AI (verified/ai_touched): מפעילים רק כשה-AI אימת ידיעה ממקור מפוקפק — לא לכל פוסט שנכתב ב-AI (כתיבה ב-AI = source='ai' בלבד).

—— הרחבת Content Foundation (26.8.2026 · מאושר ZURIEL · SOD1820_CONTENT_FOUNDATION_CONTRACT.md) ——
- קטגוריית `רמזים חזקים` = בחירת-עריכה ברף-גבוה, לא-מוגבלת-לפי-כותב. Human-Gate = ZURIEL רשאי לשייך אליה גם תוכן של יוצר-חיצוני. [גובר על הנוסח הישן «רמזים חזקים = צוריאל-בלבד» ב-CLAUDE.md — Decision #6.]
- יוצר-חיצוני: author='<שם היוצר>' (מרשם src/lib/authors.js). מדיה-חיצונית (טיקטוק/יוטיוב/ריל) נשמרת עם קרדיט-מקור גלוי בגוף הפוסט (attribution).
- תוספת-מערכת על פוסט-כותב-חיצוני (System Addition, Decision #7): חייבת להיות מובחנת חזותית מדברי-הכותב, ולהישמר בשדה posts.ai_addition הקיים (⛔ אין storage חדש). דוגמה חיה: פוסט 5081 («78=מחל»).
- Taxonomy = 4 צירים אורתוגונליים: Series (תג «מימד חמש») ≠ Category (posts.categories) ≠ Medium (נגזר-מהתוכן) ≠ Representation (קוד-רינדור). מקור-Foundation: SOD1820_CONTENT_FOUNDATION_CONTRACT.md.

—— פרוטוקול פרסום פוסטי המערכת · הרחבה מאושרת 7.9.2026 · v1 ——
בעלות: הרחבת publishing_conventions הקיים, לא פרוטוקול/מאגר/מסלול פרסום מקביל. חל על פוסטי המערכת בכלל, לא רק על סדרת «מימד חמש». מקור ההרחבה: הוראת המשתמש הישירה להעביר את שתי תיבות ההבהרה לסוף הפוסט ולהסיר את שמו מהניסוח הציבורי; מקרה הכיול הוא posts.id=5098/wp_id=37034.

1. קול ציבורי וזהות. פוסט מערכת מדבר בשם «המערכת»/«אנחנו» או בניסוח ענייני, לפי post_system_voice_law. אין להוסיף את שמו האישי של בעל האתר בגוף פוסטי המערכת, בהסבר השיטה, בחתימה או בקרדיט-עריכה כברירת מחדל. לכתוב «לפי שיטת־האחד», ולא לייחס את הניסוח הציבורי אישית לבעל האתר. חריג של חתימה/עדות אישית דורש בקשה מפורשת. האיסור ההיסטורי ב-zuriel_surname_privacy_law הוא על שם המשפחה; אין להציג אותו כאילו כבר אסר במפורש כל אזכור של שם פרטי. ההנחיה הנוכחית מבהירה את התצוגה בפוסטי המערכת. אין להסיר שמות של מושאי המחקר או קרדיט אמיתי של יוצר חיצוני מכוח כלל זה.

2. סדר הקריאה. גוף הפוסט והמסר קודם; אחריו בסוף, לפני «ראו גם» והפניות הסיום, תיבות ההבהרה של הבינה כשהן מובחנות מדברי הפוסט. סעיף המערכת החדשה והקישורים, כשנתבקשו, נשאר בתחתית. הבסיס: ai_disclaimer_law §2 קובע שתוספת הבינה באה אחרי טקסט המקור; post_gematria_box_law קובע שהקורא נכנס קודם לתוכן, והריבוע מחזק את הקריאה ולא פותח אותה. שתי תיבות הבהרה אינן «ריבוע שוויון מאומת»: תנאי שוויון של לפחות שני ביטויים נשאר חל על ריבוע הגימטריה הקנוני בלבד. אין להקדים נספח הסבר בגלל שמו הטכני של שדה או מיקום הרכיב הקיים. עדכון על אירוע חדש הוא סוג תוכן אחר: post_update_on_top ממשיך לחול עליו, ולא על הערות חישוב/עריכה. הודעת גילוי קצרה בראש, אם נדרשת, אינה תחליף לנספח ואינה סיבה להעביר את הנספח למעלה.

3. שמירת הנוסח והמיקוד. לא משכתבים את הסיפור, לא מוסיפים ממצאים שלא נבחרו ולא הופכים בדיקת חישוב לנרטיב חדש. תיקון עובדתי הכרחי מסומן ומקושר להבהרה בסוף. משפט שמפנה ל«ראש הפוסט» חייב להתעדכן כשהתיבה הועברה לסוף. כותרת, slug, מקורות, מדיה ותגיות נשמרים אלא אם נתבקשה עריכתם במפורש; zuriel_focus_law נשאר בעל הסמכות למיקוד.

4. מקור, ניסוח ואמת נפרדים. הקורא רואה סימון ברור לתוספת בינה, אך אין צורך לחשוף את שם בעל האתר כדי לסמן אותה. בתיעוד המקור והגרסאות שומרים בנפרד את מקור הרעיון/הכלל, מי ניסח, מי ערך, מי ביצע שמירה ואיזה אישור ניתן. אישור לפרסם אינו הופך טקסט בינה לטקסט אנושי; שינוי התווית הציבורית אינו מוחק מקור. לא מסיקים מחבר לפי source='ai', הדבקה או ניחוש סגנוני בלבד; מקור היסטורי לא ידוע נשאר לא ידוע. חישוב מאומת ≠ פרשנות מאומתת; ai_touched ≠ verified; אין לכנות פוסט שלם «מאומת» בגלל תוספת בינה. בעל הסמכות: truth_axes_foundation_law והחוזים הקיימים, לא מאגר ייחוס חדש.

5. מקור חיצוני ומימד חמש. Content Foundation Decision #7 נשאר בתוקף: תוספת מערכת על פוסט של יוצר חיצוני מובחנת חזותית ונשמרת ב-posts.ai_addition; שומרים קרדיט מקור. אין להפוך את עריכת המיקום המקומית בפוסט מערכת 5098 להוראת העברה של כל ai_addition לתוכן. dim5_upload_law מוסיף דרישות סדרה/מדיה/תמלול/תרגום/קרדיט מעל פרוטוקול זה; הוא אינו תחליף למוסכמות הפרסום הכלליות.

6. בדיקה לפני סיום. לקרוא את החוקים והפרוטוקול העדכניים לפני עריכה; לשמור צילום-לפני ואחרי ב-post_revisions; לבדוק שאין שם אישי לא-מורשה בניסוח הציבורי, שתיבות הבינה נמצאות פעם אחת ובסוף, שהטקסט המקורי נשמר ושכל הפניה מתאימה למיקומה וליעדה. קישורים גולמיים למערכת בבנייה מותרים לבקשת המשתמש עם ציון שהחיבורים עדיין בתהליך. לבדוק קריאות במובייל ובשני המצבים; אם תצוגת האתר לא נבדקה, לדווח זאת ולא להכריז שנבדקה. אימות DB ≠ אימות דפדפן; פרוטוקול שמור ≠ אכיפה אוטומטית בכל מסלולי השמירה.

מצב יישום 7.9.2026: הפרוטוקול עודכן בקודקס החי; בפוסט 5098 מיושמת הוראת המיקום והניסוח כעריכת תוכן תחומה עם סימון מקור לכל תיבה וגרסאות שמורות. התאמה כללית של רכיב התצוגה העליון וניתוק תג הבינה מתג האימות עדיין דורשים שינוי קוד נפרד. לא נוצרה טבלה, לא שונו חוקים מספריים, ולא הוטמעה אכיפה אוטומטית לכל האתר.


—— POST CATEGORY SEMANTIC GUIDANCE V1 · Human-Gate ZURIEL · 7.9.2026 ——
Purpose: semantic guidance for future Post→One Tree / Explorer / Research projections. This extends existing publishing_conventions only. Category labels are NOT automatic Topic/node/edge promotion. Preserve Foundation→Projection→Experience and Human Gate.

1) `תיעוד אירועים` — broad world/reality documentation bucket: current events, world events, natural events/disasters, time-related occurrences and similar reality-stream material. Treat as a strong Event/Time/Reality evidence source for future extraction, but the category itself is not a single canonical Topic.

2) `רמזים חזקים` — the editorial essence/core of SOD1820. Highest-priority legacy/live research corpus for deep semantic extraction and One Tree connection. It remains an editorial high-bar classification, not an epistemic truth state: Strong Hint != Fact/Canonical. Human Gate remains ZURIEL.

3) `צפונות בתורה` — Torah hidden-pattern/ELS-oriented material. Cross-cutting by nature: may overlap with event documentation and other categories. Future projection should connect source/verse/ELS/result/topic/event where evidenced, without duplicating the ELS engine or assuming every post relation is canonical.

4) `מימד חמש` — a distinct conceptual/series world associated by ZURIEL with Mashiach / "חמישי" / New-H and with ideas that can conflict with conventional religious framing. Important future source of concepts/terms for One Tree. Extract concepts and relations from post content/tags with provenance; do not treat the category label alone as proof of a canonical concept/relation.

5) `סוד האותיות והמספרים` — very high-value corpus for legacy and newer connections between numbers, letters, phrases and concepts. Priority source for Number↔Phrase↔Concept↔Method/Source relation candidates. Deep scan is warranted when Post→One Tree ingestion is authorized.

6) `גלריות גימטריה` — legacy post-embedded gallery category. Often duplicates or partially overlaps images already present in gallery systems, sometimes only a subset (e.g. first images embedded in a post). Duplicate representations may remain, but future model must link equivalent/related images and post/gallery provenance so the same underlying visual evidence is not mistaken for two independent findings. Representation != Placement/Occurrence. Do not delete duplicates merely to normalize appearance.

7) `גימטריות` — older/more mixed bucket for gematria lists/calculations. Valuable but semantically noisier than `סוד האותיות והמספרים`; requires scan/classification rather than automatic graph promotion.

8) `סוד החשמל` — large, high-value corpus expected to contain many concepts and cross-connections useful to One Tree. Requires deep semantic scan before promotion; category membership alone does not authorize node/edge creation.

Operational consequence for Post→One Tree Foundation:
- Rank, Don’t Hide: use these categories as corpus-priority/evidence signals, not truth tiers.
- Posts/content/tags/categories are extraction inputs. Canonical Entity/Topic/Relation promotion remains separate and Human-Gated where required.
- Prefer linking to existing canonical Number/Topic/Person/Source/Book/Year/Event/ELS identities rather than creating parallel post-specific entities.
- For gallery overlap, preserve both representations when useful but record/link provenance/equivalence; never count duplicate representations as independent evidence.
- Future agents should read this block before designing post ingestion/backfill, category-to-topic mapping, or Post→One Tree projection.


—— POST PERSON ROLE GUIDANCE V1 · Human-Gate ZURIEL · 7.9.2026 ——
For Post→One Tree semantic extraction, repeated person tags must be role-routed before identity promotion. Tag recurrence does NOT imply writer/contributor identity.

- `עמיחי רז` — should have a Writer/Contributor page in the future; do not model merely as generic world-person when resolving post authorship/research attribution.
- `ליאור שטרית` — should have a Writer/Contributor page in the future.
- `יניב לוי` — already has an existing writer/contributor identity; reuse it, do not create a duplicate.
- `ציון סיבוני` — already has an existing writer/contributor identity; reuse it, do not create a duplicate.
- `נתניהו` — world leader / Person domain, NOT a SOD1820 writer. Route to canonical Person/Event/World relations as appropriate.
- `טראמפ` — world leader / Person domain, NOT a SOD1820 writer. Route to canonical Person/Event/World relations as appropriate.

Operational rule: Person Role ≠ Tag ≠ Writer. Resolve existing contributor/person identity first; only then propose promotion. Do not create Writer pages for public figures merely because they recur in posts.


—— GOLDEN POST / GEMATRIA RESEARCH PROJECTION V1 · Human-Gate ZURIEL · 8.9.2026 ——

This block extends existing publishing_conventions only. It does not create a post engine, template store, gematria engine, method registry, topic store, or graph. FOUNDATION → PROJECTION → EXPERIENCE.

1) AUTHOR-VERBATIM IRON RULE. When ZURIEL authors the body of a post, his authored text is preserved 100% verbatim in wording and order unless he explicitly asks for editing. No AI-authorship/verification box, disclaimer, badge or machine-written heading may precede or interrupt his authored body. After his authored body ends, a visually distinct box titled «תוספת הבינה המלאכותית» may verify dates, calculations, sources, engine outputs and clearly separated interpretations. AI may not silently rewrite the source text. This Human-Gate decision supersedes older public-placement instructions that put an AI verification box at the top; implementation drift must be reconciled in code separately.

2) CATEGORY RELATION FOR NEW POSTS. `תיעוד אירועים` is the broad event/reality category. `רמזים חזקים` is an editorial research classification inside that world for new content: every newly classified `רמזים חזקים` post must also carry `תיעוד אירועים`; not every `תיעוד אירועים` post is `רמזים חזקים`. Historical category drift is preserved until a separately authorized governed backfill; do not mass-rewrite legacy posts. Strong Hint ≠ Fact/Canonical.

3) GEMATRIA POST CARD / PUBLIC «מפת הגימטריה». This is a reusable projection of the canonical gematria Registry + Method Trace, not the legacy equality-only `sod-gematria-box` and not a new calculator. The card keeps a stable familiar software-like frame in light+dark modes. Core rows are always visible first in this order unless Human Gate changes it: רגיל · גדול · משולש/קדמי · ריבוע · מילוי · מסתתר. Additional methods are contextual and shown only when relevant/selected for the post. Selected values may be visually highlighted.

4) CARD INTERACTION. Recommended tabs: `מילה | חישוב | רמזים`. Tapping a method opens its canonical calculation trace; tapping a number may open a bounded preview and continue to the existing Number/Research Context rather than losing the post. The `רמזים` tab shows only selected relevant convergences/links, not an exhaustive target-fitting dump. Premium may unlock depth, traces, examples and research paths; entitlement changes access/depth, never truth.

5) METHOD/RULE LINKS. Wherever a post uses a gematria method or a System Method, its label should be addressable to the canonical explanation/application history when that projection exists. Post text remains narrative-first; research depth is projected from the one system.

6) GOLDEN STATUS. posts.id=5097 remains the current Golden exemplar for `מימד חמש`. The next Golden design line is `תיעוד אירועים + רמזים חזקים`, to be proven on one bounded post before any corpus-wide backfill.


—— PUBLIC POST VOICE 2029 V1 · Human-Gate ZURIEL · 15.9.2026 ——

Purpose: define the forward public language of SOD1820 posts without changing Truth/Governance semantics. This extends `publishing_conventions` only; it creates no new content system, truth layer or style engine.

1) PUBLIC VOICE = NARRATIVE, WONDER, REDEMPTION HINTS. Public posts should sound like SOD1820 rather than a laboratory report. Prefer natural language such as: `רמזי גאולה`, `פלאי הבורא`, `השגחה`, `סוד`, `חיבור מופלא`, `עוד רמז שמצטרף לתמונה`, `התגלות`, `צופן`, `נקודה שמעוררת התבוננות`, `כאן נפתח חיבור מעניין`, `המספר חוזר במקום מפתיע`, `התמונה מתחברת`. The goal is living, spiritual, curious, accessible prose.

2) RESEARCH LANGUAGE STAYS MOSTLY BEHIND THE SCENES. Terms such as `Research Strength`, `Evidence Independence`, `Candidate`, `Hypothesis`, `Result Bundle`, `epistemic state` and similar internal research/governance vocabulary should not dominate ordinary post prose. They belong in engines, deep inspectors, audit/research projections or a short explanatory note when genuinely decision-relevant. The word `מחקר` is allowed when natural, but is not the default tone of every paragraph, badge or heading.

3) BEAUTIFUL LANGUAGE NEVER UPGRADES TRUTH. `רמז`, `פלא`, `השגחה`, `חיבור` or `התמונה מתחברת` are public narrative language, not automatic proof. When a connection is still open, prefer wording such as `רמז מעניין`, `חיבור שמעורר בדיקה`, `אנחנו עדיין בודקים`, `עוד נקודה שמצטרפת לתמונה` rather than presenting it as established fact. Verified calculations/sources may be stated clearly, but interpretation remains interpretation unless governed otherwise.

4) TWO-LAYER DISCIPLINE. Behind the post, canonical engines, provenance, source locators, Trace, negative results, dependency/evidence classification and Human Gate remain exact and fully preserved. The public post projects that truth-safe substrate in a warm, readable SOD1820 voice instead of exposing backend taxonomy as the storytelling language.

5) AUTHOR TEXT IS NOT RETROFITTED. This guidance applies to new system/AI public copy and future post writing/projections. It does not authorize rewriting ZURIEL-authored text, external-author text or the legacy corpus merely to match the new tone; AUTHOR-VERBATIM and provenance rules remain supreme.

6) CALIBRATION EXAMPLE. Prefer: `ושוב 776 מופיע במקום מפתיע — הפעם מכמה כיוונים שונים, וכל אחד מוסיף עוד חתיכה לפאזל.` Avoid as ordinary narrative: `זוהתה קונברגנציה בעלת Research Strength גבוה משלוש Evidence Groups.` If the underlying support is not yet strong, say so plainly in the same warm language.


—— G2 FINAL COMPACTION ROUTING ADDENDUM · Human-Gate ZURIEL · 15.9.2026 ——
- LEGACY OPERATIONAL RECIPES ARE ON-DEMAND HISTORY, NOT GLOBAL ACTIVE LAW. The detailed historical Dimension Five upload recipe (`dim5_upload_law`) and Or-Geula video pipeline (`orgeula_video_pipeline_law`) remain preserved in inactive rule history and code provenance. Load them only when explicitly maintaining that legacy pipeline; they do not define 2029 publication architecture.
- POST TEMPORAL HISTORY: preserve source-authored content, original publication time, revisions and later updates distinctly. The historical “update-on-top” layout is a legacy presentation choice, not a Foundation invariant. Current temporal/provenance owners govern identity/history; Experience governs layout.
- POST LIST DATE/ORDER and footer copyright/vintage presentation are implementation/content choices under this owner + Experience/Design, not separate global laws.
- `legacy_content_protocol` is an on-demand historical compatibility adapter only for explicitly requested historical WordPress/gallery tasks that still require it. There is no active Legacy product or surface, no normal-startup requirement, and no standing Legacy maintenance.


—— AI-NATIVE POST 2029 STANDARD V1 · Human-Gate ZURIEL · 24.9.2026 ——

Purpose: this is the DEFAULT publication standard for every new 2029 Post. It extends publishing_conventions only. It creates no parallel Post store, AI content system, research graph, renderer truth source, or publication authority. The author/source remains the authored source; AI compiles context around it.

1) SOURCE-CENTERED READING IS THE PRIMARY EXPERIENCE.
The central reading canvas belongs to the authored/source text. Preserve the source wording and authored order verbatim unless ZURIEL explicitly asks for editing. AI research, engine verification, system interpretation, provenance inspectors, timelines, recommendations and contextual prompts must not be interleaved into authored paragraphs in a way that makes them appear to be part of the source. External authors keep explicit attribution. For SOD HASHMAL and similar uploaded source documents, original wording stays source-owned.

2) AI WORKS AROUND THE POST, NOT OVER THE AUTHOR.
Default intake is:
Source → AI Source Map → typed extraction → canonical engine/source verification where applicable → relations to existing One Reality → editorial composition/projection → Post.
The AI may identify sections, entities, numbers, verses, methods, ELS/ciphers, sources, images, themes, temporal context and research opportunities. It may propose section headings/reading anchors and concise contextual summaries. It may not silently rewrite source claims into system facts or turn verification into authorship.

3) RESEARCH SIDECAR / CONTEXT LAYER.
Deep research belongs outside the authored reading stream: contextual side rail, inspector, drawer, expandable card, footnote-like source layer, or other Experience projection. On desktop it may sit beside the reading canvas and change contextually with the active section. On mobile it collapses to a deliberate drawer/card below or on demand; it must not break the source paragraph flow. The sidecar may contain:
- Source Map / what this section connects to;
- canonical Gematria Method Trace and verified calculations;
- Number/World/Topic/Person/Book/Verse/Event links;
- ELS/cipher re-check or evidence state;
- Temporal Lens / העת עכשיו when materially relevant;
- Treasures/curation context;
- Raziel contextual action for the exact section;
- provenance/source locators and negative/failed verification when decision-relevant.
Contextual Prominence + Silence Gate applies: AI should do more work and show less noise.

4) THREE VOICES MUST NEVER BLUR.
Every projected research element resolves visibly to one of:
A. SOURCE SAYS — the author's/source's own claim or wording.
B. SYSTEM VERIFIED — deterministic engine/source verification with method/provenance.
C. SYSTEM INTERPRETATION / RESEARCH — SOD1820 synthesis, hint, connection or open question.
Beautiful public language remains allowed under PUBLIC POST VOICE 2029, but no visual treatment may upgrade B/C into source authorship or established fact.

5) TITLE IDENTITY IS STABLE; THE YEAR MAY BE PART OF THE PUBLIC H1.
ZURIEL prefers the relevant Hebrew year to remain visibly present in the main public title when it helps identify the publication/context. The 2029 rule is therefore not “remove the year”, but “separate semantic title from metadata clutter”.
Recommended display grammar:
H1 core: enduring subject/story
+ a visually distinct Year token/suffix as part of the same H1 presentation.
Example:
"רמזי הגאולה, הבינה המלאכותית וסוד השיר — תשפ״ז"
Secondary source line:
"סוד החשמל · גליון חג הסוכות · ‘תשית לראשו עטרת פז’"
Do not stuff the H1 with full Gregorian dates, issue numbers, source labels, parasha, holiday and every metadata field unless they are themselves part of the subject. The Hebrew year is allowed and preferred as a compact temporal identity cue.
Canonical Post identity and canonical slug must not depend on transient display punctuation or a renderer-specific title composition. A stable semantic title/slug identity may project a public H1 that includes the Hebrew year. If the date/time itself is the researched event or essential claim, a fuller temporal phrase may legitimately be part of the H1.
This rule applies by default to future SOD HASHMAL uploads and all new 2029 posts.

6) ONE SOURCE, MANY PROJECTIONS — NEVER MANY COPIES.
A Post is the editorial/full-context Publication projection, not the sole home of extracted knowledge. The same source/research may project contextually into Home, Global Now/העת עכשיו, Guest Voices, Treasures, Gallery/Media, Number/World, Topic/Event, Heichal, Journey, ELS and Raziel while preserving one source identity and provenance. Do not create multiple posts merely because the source contains multiple research axes. A new separate Post requires its own editorial/publication reason, not merely another extracted section.

7) LIVING PUBLICATION WITHOUT SOURCE MUTATION.
The source text remains stable while surrounding projections may evolve as the system learns:
- new verified relation appears;
- current-year Temporal Lens becomes relevant or later becomes historical;
- a cipher is independently reproduced;
- another source joins the same number/axis;
- a Human-curated Treasure/Gold/Diamond relation becomes relevant.
Those changes belong to live projections/sidecar/pulse, revisions or system additions — not retroactive rewriting of the author's source.

8) GEMATRIA / CIPHER / VISUALS ARE STRUCTURED REPRESENTATIONS.
Verified Gematria should prefer existing canonical structured visual families and Method Trace rather than dead screenshots or manually duplicated numbers. A Gematria Visual may project into Post/Gallery/Treasures/Number/share from the same underlying identity. Source cipher images remain preserved as source visual evidence; system ELS reproduction, verification status and engine output are separate projections beside/below them.

9) RAZIEL IS SECTION-CONTEXTUAL, NOT GENERIC CHAT NOISE.
A Post section may expose a bounded action such as "שאל את רזיאל על החלק הזה". Raziel receives the exact section plus its source identity, linked entities, verified calculations, provenance and current Research Context. It must answer from that context and existing owners rather than inventing a parallel post-analysis memory.

10) EDITORIAL COMPOSER = STRUCTURE, NOT REWRITE.
AI may choose or recommend the reading hierarchy: opening, section ordering, section headings, what deserves prominence, what belongs behind expansion, and what remains silent. For source-owned material, section headings are editorial overlays and must remain distinguishable from original authored headings when that distinction matters. The goal is a coherent human reading journey, not an exhaustive dump of extracted units.

11) DEFAULT MEANS DEFAULT.
For every new 2029 Post request, agents should automatically apply this standard without requiring ZURIEL to repeat it. If a source is supplied, preserve its wording by default. If research is available, place it in sidecar/contextual projections by default. If routine date/issue metadata exists, keep it secondary by default. Deviating from these defaults requires a content-specific reason or an explicit ZURIEL instruction.

12) HUMAN GATE / RELEASE BOUNDARY.
AI may ingest, extract, verify, compose, rank and recommend. It may prepare a publication projection. Canonical truth promotion and publication/release remain governed by existing Truth/Human-Gate/Publishing owners. This standard does not authorize automatic publication, main merge or production deploy.

Calibration source: SOD HASHMAL · גליון חג הסוכות תשפ״ז uploaded 24.9.2026. The calibration proves the intended shape: source wording in the reading center; source/date context secondary; live research in contextual side layers; one source feeding many surfaces through One Reality.


—— POST 2029 READING GEOMETRY ADDENDUM · Human-Gate ZURIEL · 24.9.2026 ——

Extends AI-NATIVE POST 2029 STANDARD V1; does not create another Post template system.

1. DEFAULT POST EXPERIENCE = Source Canvas + Context Spine + Living Margin.
- Source Canvas: authored/source wording and original authored headings remain the primary uninterrupted reading stream.
- Context Spine: thin markers outside the authored text show where meaningful system depth exists.
- Living Margin / Context Rail: bounded contextual intelligence for the current source region. It is not a dashboard and does not contain a second copy of global controls.

2. NO AI SECTIONING OF THE AUTHOR BY DEFAULT. Do not split an external/source-owned article into new visible AI sections merely to organize research. Preserve original headings when present. AI may maintain invisible/semantic reading regions and locators behind the source for Context Rail behavior. New visible editorial headings require a real reading need and must remain distinguishable from source headings.

3. GLOBAL CONTROLS STAY GLOBAL. Raziel, tools, attention, command/action and deep inspectors belong to the System Frame / Bottom Command Island / Panel Host. The Post rail may trigger them with the current Reading Focus but must not duplicate them.

4. THE RAIL SHOWS THE NEXT MEANINGFUL THING, NOT EVERYTHING. Prefer one focal connection and at most a few bounded signals. Examples: current-year relation, one engine-verified Gematria, exact source/verse, a reproduced cipher, one Treasure relation, or one next research action. Silence is valid.

5. READING FOCUS IS CONTEXT, NOT TRUTH. A source-region locator may include post/source id, paragraph/range/anchor, visible source excerpt identifier and projected linked identities. Moving the focus changes what the rail previews; it never rewrites the source or promotes research state.

6. DEEPENING. “פתח בעולם”, “פתח מספר”, “ראה מקור”, “בדוק בצופן” and “שאל את רזיאל” pass the same Reading Focus into the canonical target capability while preserving exact return.

7. HEBREW YEAR IN H1. The already-approved rule remains: the Hebrew year may/preferably appears as a compact public-H1 temporal cue, while issue/holiday/source-edition metadata remains in the source line unless itself the researched subject.

8. GOLDEN CALIBRATION. First Golden calibration for this geometry: SOD HASHMAL · גליון חג הסוכות תשפ״ז. Preserve source wording; no AI-authored segmentation inserted into the article. Context Rail should pivot invisibly as the reader moves through the existing source regions (e.g. תשפ״ז/787, זכריה/AI, שלמה/חשמל, שופר/שיר, source cipher evidence).

This addendum is the default for new 2029 Posts and comparable reading publications unless a source-specific reason justifies another projection.


—— PRE-PUBLICATION STAGING SAFETY · Live finding 24.9.2026 ——

Current public.posts must NOT be treated as a private draft store merely because space='draft', home_hidden=true or tag='טיוטה'. Live role verification during the first Post2029 Reading Golden proved the staged row was SELECT-visible to anon. Therefore:
- unpublished source-owned Golden/Post material stays in the existing private Research Intake/source-root path until Preview/publication authorization;
- do not invent a parallel draft table/store;
- the public posts row is created/restored only at the governed publication/cutover step, unless a future canonical Publishing owner explicitly hardens draft access first;
- renderer code may use the existing admin-gated research intake read path for an admin-only pre-publication Golden, but public Post identity remains posts and public Posts always win when present;
- re-verify live RLS/grants before relying on any future draft-state field for privacy.

This is a release-safety consequence of the current live access model, not a new lifecycle/truth axis.


—— POST 2029 CONTENT MODE · SOURCE-FIRST vs GEMATRIA-FIRST · Human-Gate ZURIEL · 24.9.2026 ——

OWNER CHECK: EXTEND_EXISTING. This is a projection/publishing rule over the existing Post/Reading/Research owners. It creates no second Post renderer family, no local Gematria engine and no separate hint store.

1. SOURCE-FIRST DOCUMENT.
A source-owned document, newsletter, scan/transcription, book/source excerpt or externally authored long-form item whose primary purpose is continuous reading must preserve the reading stream as the dominant experience. SOD HASHMAL / סוד החשמל is the calibration case.

Default presentation:
- source wording/order/headings remain primary;
- verified gematria, hints, cross-links and system discoveries do NOT become intrusive inline cards by default;
- body text may carry only a very quiet affordance when useful (subtle clickable number/phrase/marker, hover/focus/tap state), without changing the authored sentence or inserting visual blocks between source paragraphs;
- desktop depth appears primarily in Living Margin / Context Spine;
- mobile depth appears behind a compact cue such as “✦ N חיבורים כאן” / “123 · N גימטריות”, opening the existing Panel/Bottom Sheet;
- clicking a verified gematria may open the canonical Number capability / Method Trace / related expressions without mutating the source body;
- Silence Gate applies: no useful context = no marker/no rail noise.

2. GEMATRIA-FIRST POST.
A post whose authored/editorial purpose is the gematria itself may render gematria as primary content: equations, canonical Gematria Cards, Method Trace, Gold/Diamond marks, comparisons and related number structures may appear directly in the reading body because they ARE the story rather than side intelligence.

3. SAME TRUTH, DIFFERENT PROMINENCE.
Source-first vs Gematria-first changes presentation prominence only. It does not change calculation authority, verification state, provenance, identity, ranking or Human Gate. All verified calculations still use canonical registered methods/engines. A hint/interpretation never becomes source wording or fact merely because it is visually connected.

4. SOURCE-FIRST DESKTOP.
On desktop a source-first Reading Surface may show, beside the active source region, a bounded Living Margin:
“מה מתחבר כאן” → verified gematria / source link / temporal connection / topic-person-book-event relation / Raziel entry / World deepening.
The rail shows a small bounded set, not the full research dump. Deep detail moves to Panel/World/Number.

5. SOURCE-FIRST MOBILE.
No permanent side rail. The source remains full-width/calm. A tiny edge/bottom cue announces available depth without interrupting the text. Tap opens the same contextual set in the canonical Panel Host. Exact return restores the same source region.

6. INDEX / REGIONS.
Authored source headings define primary Reading Regions. Discovery/hint systems may enrich a region but do not redefine authored section boundaries silently. System-generated sub-grouping may exist as hidden/context metadata and must remain visibly distinct from source-authored structure when shown.



—— MEDIA SOURCE FIDELITY GATE V1 · Human-Gate ZURIEL · 30.9.2026 ——

Owner verdict: EXTEND_EXISTING. This extends publishing_conventions and research_intake_foundation_contract_law §13; it creates no new Media Store, Upload Engine or parallel publication path.

1. ORIGINAL FIRST — source media used as visual evidence, source witness, screenshot evidence, OCR/geometry input, hero image or post evidence must preserve the exact original bytes before any resize, crop, re-encode, compression or thumbnail generation. A derivative is never allowed to become the only surviving source.

2. CHATGPT / AGENT INGEST — when the current agent runtime can hand the exact source file byte-for-byte to the canonical AGENT_MEDIA_UPLOAD_BRIDGE, it may do so directly. When exact preservation cannot be proved in that runtime, Dropbox is the mandatory durable fallback: persist the exact original to Dropbox first, verify file size/identity, then move the same original bytes into canonical Supabase Storage. Never shrink an image merely to make transport easier.

3. STORAGE IDENTITY — Dropbox/WhatsApp/Drive/ChatGPT are ingress/provenance, not canonical media identity. Canonical runtime media remains in the existing Supabase media/gallery storage tree. Preserve source locator/acquired-via provenance where available.

4. DERIVATIVES AFTER ORIGINAL — thumbnails, previews, cards and resized variants may be produced only after the original is durably preserved. If a number/text/detail inside the image is itself evidence, the Post/Gallery evidence view must use the original or a verified readability-preserving derivative, never a low-resolution thumbnail.

5. ACCEPTANCE GATE — before declaring media work complete, verify: exact-source byte size and hash when available; dimensions/MIME; canonical Storage object readability; Post/body reference points to the intended object; and visual acceptance on the rendered surface. DB presence != visual acceptance. Storage upload != visual acceptance.

6. FAIL CLOSED — if the original cannot be preserved, the canonical upload cannot be verified, or the rendered image cannot be visually accepted, do not substitute a degraded derivative and do not report the media task as complete. Record the blocker and keep the publication/draft state unpromoted until repaired.

7. LEGACY POSTS — legacy_content_protocol inherits this gate for all WordPress/Legacy post/gallery maintenance. This rule supersedes any ad-hoc fallback that embeds a downsized data URI or recompressed screenshot as the only post image.

Calibration incident: FZ1073 post 5112. A 709×1536 / 143,659-byte source was temporarily replaced by a 160×347 / 4,382-byte transport derivative. That path is prohibited going forward.


—— UNIVERSAL MEDIA DEFAULTS FROM DIMENSION FIVE GOLDEN · Human-Gate ZURIEL · 5.10.2026 ——

OWNER CHECK: EXTEND_EXISTING. dim5_upload_law v4 is a Golden/legacy calibration source, not a new owner. Universal media semantics promoted here are governed by publishing_conventions + content_translation_law v4 + video_transcription_law + source_video_publish_law + post_og_image_law. No parallel publisher/media/translation system is authorized.

1. VIDEO TRANSLATION IS DEFAULT, NOT OPT-IN.
Every newly published video must preserve one source-language original transcript and carry the canonical translation set he · en · ar · es · fr · ru · pt · de through the existing video-transcribe/video_transcripts owner before the publish preflight can become READY. The source language is preserved as Original and is never guessed. Caller intent may add languages but may not disable or narrow the canonical set. In Hebrew product context, Hebrew is the default human-facing representation; the original remains separately addressable provenance.

2. SOURCE VIDEO + POSTER/IMAGE ARE BOTH REQUIRED REPRESENTATIONS.
Publishing a video means the self-hosted source video itself is present. Transcript, translation, still or card never substitutes for the source video. Every video also receives a canonical raster poster derived from the stored video. That verified poster is the post image_url / card / list / share visual. No video publication is READY while poster/image_url is unresolved.

3. IMAGE POSTS PRESERVE ORIGINAL-FIRST + RASTER PUBLIC REPRESENTATION.
For a visual/image post, preserve the exact source original under the canonical media identity first. The public post image_url is a verified canonical JPG/PNG representation on Supabase Storage. If the exact original is another format, keep it as source and create a raster representation rather than replacing/downgrading the source. Image + audio + text is a valid projection over the same Post identity; it does not create a second post/media identity.

4. NO IMAGELESS VISUAL MEDIA POST.
Video and image posts leave preflight with a concrete canonical image_url (video poster or verified raster image). Text-only posts remain governed by post_og_image_law fallback and may legitimately have no explicit image_url.

5. DIMENSION FIVE-SPECIFIC BEHAVIOR STAYS SERIES-SPECIFIC.
The Series marker posts.tags='מימד חמש', author/home-hidden conventions, DimensionFiveFeed photo swipe/read behavior, spiritual editorial lens and other Series-specific projection behavior are NOT generalized by this addendum. Only universal media/translation semantics are promoted.

6. LEGACY FILE FORMATS ARE NOT THE OWNER.
Old Dim5 VTT filenames, gallery/sod1820/videos paths and exact legacy embed markup are historical implementations. Preserve their semantic intent (source transcript, translated representations, Hebrew-first presentation, source video + poster) through the current 2029 owners rather than recreating legacy storage/layout.

7. ONE IDENTITY / MANY REPRESENTATIONS.
SOURCE ≠ TRANSCRIPT ≠ TRANSLATION ≠ POSTER, but all are representations linked to one media/post identity. Translation or poster generation never changes truth/canonical status and never authorizes publication without the ZURIEL Human Gate.


—— POST → ONE REALITY GRAPH CONTRACT · Human-Gate ZURIEL · 6.10.2026 ——

OWNER CHECK: EXTEND_EXISTING. This extends publishing_conventions and consumes reality_graph_law v8, truth_axes_foundation_law v3, research_intake_foundation_contract_law, content_translation_law v4 and the existing Content Foundation. It creates no Post Tree, Tag Engine, taxonomy store, relation store, entity registry, second graph or schema. Post identity remains one public.posts row; its graph projection reuses the existing Post node / nodes / edges / Research OS.

1. POST IS CONTENT IDENTITY; THE TREE IS SEMANTIC CONTEXT.
A Post is one durable Content Identity identified by posts.id/slug with many representations. Its Post node in One Reality Graph is a projection/address of the same content, not a second Post. Media, transcript, translation, poster, card, feed and full-page are representations and never become duplicate Post identities.

2. FIVE LAYERS MUST NOT BE COLLAPSED.
A new Post is classified/connected through distinct layers:
A) Series / Content Stream — membership such as מימד חמש; where a canonical Series marker exists, use that owner (currently posts.tags contains מימד חמש for Dimension Five).
B) Category / Editorial Topic — posts.categories, e.g. רמזים חזקים, תיעוד אירועים, וידאו.
C) Lightweight Tags / Recall — optional search/navigation/legacy-compat labels. Tags are not ontology, identity, evidence, verification or graph truth.
D) Semantic Entities / Anchors — stable identities in One Reality Graph: Number, exact Expression, Person, Place, Event, Date/Temporal identity, Verse/Book/Source, Sefirah, Concept/Subject and other qualified entity types.
E) Claims / Interpretations / Findings — statements about relationships or meaning. These stay source-attributed and truth-axis typed; they do not become Fact/Canonical merely because a Post says them or because entities are connected.

3. TAGS DO NOT SUBSTITUTE FOR THE GRAPH.
A Number/person/place/sefirah/date/expression mentioned in a Post does not need a duplicate Tag merely to make it discoverable if the canonical entity/relationship is represented in the graph. Existing historical tags are preserved for compatibility/search; no mass deletion or rewrite is authorized. New publishing must not use a growing tag list as a replacement for entity resolution and typed relations. A graph projection may coexist with a useful tag, but the tag never becomes the authority for the semantic relation.

4. RESOLVE BEFORE CREATE — ONE IDENTITY.
Before creating a Number/Person/Place/Event/Date/Sefirah/Concept node, resolve the existing canonical identity first. Reuse existing nodes such as 7, 10, 710, Keter/Chokhmah/Binah/Tiferet and other existing identities. A Post may connect to many existing identities. Do not create a local Post-only copy of an entity.

5. NUMBER != DATE != EXPRESSION != CONCEPT.
Exact semantic identity is preserved. 7, 10 and 710 are three separate Number identities. 7/10 as a calendar/event reference is a Date/Temporal/Event representation, not Number 710. A research interpretation may explicitly relate 7/10 to 710, with source/provenance, but must never merge their identities. Likewise an exact Hebrew Expression is not the Number it calculates to, and a translated Expression does not inherit the source Expression's numeric result without an independent canonical calculation.

6. RELATION STRENGTH IS TYPED.
A mere textual occurrence may justify only a bounded mentions/source-context relation. A stronger relation such as documents/represents/derived_from/converges_on/equality or another domain-owned relation requires the evidence/semantics demanded by its owner. Historical adjacency, same Post membership, same Tag or visual proximity never silently becomes a strong semantic relation.

7. AUTHOR/SOURCE CLAIMS STAY SOURCE CLAIMS.
Predictions, spiritual readings, interpretations and mappings from an external creator are preserved as that creator/source's Claim/Interpretation with exact provenance. Example pattern: a creator may connect 2027, seven lower sefirot and redemption; the Post may faithfully present that reading, but SOD1820 does not silently promote it to Fact/Verified/Canonical. Human Gate and Truth owners govern any promotion.

8. GEMATRIA / NUMERIC RESEARCH USES CANONICAL ENGINES.
If a Post contains a numeric/gematria claim that matters semantically, store the exact Expression + method + result through the canonical Gematria/method owner when verification is required. General-model arithmetic, a Tag containing a number, OCR, translation or author assertion is not authoritative engine verification.

9. VIDEO / MULTILINGUAL REPRESENTATIONS.
For newly published video, preserve source video + one original-language transcript + canonical translations/subtitles + poster through the existing media/translation owners. Translation is a representation, never source evidence. Subtitles should remain switchable/timed over the preserved source; a burned-in-caption social derivative may exist separately but never replaces the original.

10. POST → TREE INTAKE PIPELINE (NEW CONTENT).
Stage A — SOURCE: preserve source/provenance/attribution and original media.
Stage B — REPRESENTATIONS: transcript, translations/subtitles, poster/derivatives through existing owners.
Stage C — POST: compose one Post identity and classify Series + Category + Medium/Representation.
Stage D — RESOLVE: extract candidate Numbers/Expressions/People/Places/Events/Dates/Verses/Books/Sefirot/Concepts and resolve existing canonical identities first.
Stage E — VERIFY: route gematria/numeric/method-dependent claims through canonical engines; preserve honest not_tested/mismatch/unknown states.
Stage F — RELATE: create only semantically justified typed relation candidates; mere mentions remain weak/explicit.
Stage G — CLAIM: preserve interpretive/source-authored statements as Claim/Interpretation with provenance.
Stage H — HUMAN GATE: only ZURIEL/Human Gate may approve/canonicalize governed research meaning or editorial high-tier curation.
Stage I — PROJECT: World / Number / Post / Journey / Raziel / Search consume the same identities and relations; no copy of the knowledge per surface.

11. BACKFILL STRATEGY — FOUNDATION FIRST, NO MASS MIGRATION.
Phase 1: apply this contract to all NEW Posts.
Phase 2: calibrate with two Golden cases: FZ1073 aircraft Post and the 7/10 · 7 lower sefirot · 2027 Dimension Five continuation to the Dead Sea/Tiferet creator.
Phase 3: backfill high-value/current/Gold Posts first, resolving numeric/entity tag overload into explicit graph context while preserving historical tags.
Phase 4: migrate older corpus progressively when touched or when decision/retrieval value justifies it. No blind all-posts rewrite.
Phase 5: once graph consumption is proven, search/index/UI may increasingly derive entity discovery from the graph; legacy tags remain compatibility metadata until an explicit separate retirement decision.

12. ACCEPTANCE GATES.
PASS requires: one Post identity; no duplicate semantic nodes; Series/Category/Tag roles remain distinct; exact source preserved; translations do not overwrite source; Number/Date/Expression distinctions preserved; calculation authority comes from canonical engines; strong relations have provenance/evidence; source interpretations remain attributed; Human Gate controls canonical promotion; all projections consume one tree.
FAIL if: every mentioned term is turned into a Tag instead of graph context; a Tag is treated as proof; 7/10 is merged with 710; translation inherits gematria; the Post creates a private/local ontology; AI silently canonicalizes a claim; or the same semantic identity is duplicated for another surface.

CALIBRATION NOTE.
The live graph already supports Post↔Number links through existing nodes + edges using mentions/documents patterns. This contract standardizes their use for future Posts; it does not authorize bulk graph mutation by itself.




—— POST KIT 2029 V1 · Human-Gate ZURIEL · 6.10.2026 — ONE POST / ONE TREE / SMART FOLLOW ——
Purpose: reusable Post 2029 projection kit. EXTEND_EXISTING only. This is not a new Post engine, graph, tracking system, media store, renderer family or truth store.

Owners consumed:
- publishing_conventions / Post → One Reality Graph contract
- reality_graph_law v8
- truth_axes_foundation_law v3
- experience_governance_foundation_v1_law v8
- SOD1820_DESIGN_CONTRACT_V1 Contextual Sidecar / Spatial Method Stage
- content_translation_law v4 + video_transcription_law
- subscription_funnel_law v19 + existing WatchButton / resolve_topics / notification_prefs / dispatcher
- canonical Post2029Page / SystemFrame2029 / SurfaceContextRail2029 / Research Context.

1. ONE CONTENT IDENTITY. The Post row remains the content identity. /post/:slug in 2029 is a projection of that same Post, not a second Post. Source body/media/provenance stay intact; 2029 may reorganize presentation without duplicating semantic content.

2. HERO / ORIENTATION. Post 2029 opens with source/creator, title, short deck, date/category/series context and a bounded set of primary anchors. Numeric/semantic anchors are entry points into canonical inspectors; hero prominence is editorial/navigation only and never upgrades truth.

3. SOURCE MEDIA + LANGUAGE. Source video/image remains provenance-protected. Poster and timed captions/transcripts are representations of the same media identity. Language switching consumes canonical transcript/translation rows; do not hard-code one VTT track per legacy post as the final 2029 model. Original-language witness remains authoritative.

4. STORY FIRST. The original post/source narrative stays readable in the center. System additions, verification notes and contextual interpretation remain visibly separate from the source. Author-verbatim and external-creator attribution rules remain active.

5. LIVING CONTEXT RAIL. Desktop uses the one shared left Context Rail; mobile uses the same state as Bottom Context Sheet. REST shows where the reader is inside the Post and 5–7 best outward connections. FOCUS reuses the same rail for the selected Number/Expression/Event/Person/Sefirah/etc. EXPLORE opens Number/World/Heichal/Journey/Raziel with exact return continuity. Do not create a second Post rail.

6. CONNECTIONS ARE GRAPH RELATIONS, NOT SMART TAGS. Series/Category/legacy Tags remain navigation/compatibility inputs. Post connections come from typed One Reality Graph relations with provenance/reason. Weak occurrence remains mentions; stronger semantic links require their owning evidence/engine/human gate. The UI may explain “למה זה מתחבר”.

7. CHAIN + BRANCHES. A Post may expose a primary narrative spine (previous → here → next) plus bounded side branches. Do not force all related posts into one linear sequence. For the current 7.10 / ten-sefirot calibration, working spine is: Post 233 Oct-7 Hub → Post 149 seventh-to-tenth bridge → Post 5116 Dimension Five 2027/ten-sefirot continuation → Post 5109 Dead Sea/Tiferet thematic depth; Post 87 (710/hidden) and Post 108 (878/world-upside-down/360) are side branches. This chain is a curated projection pointer, not automatic truth promotion.

8. GOLD / SELECTED DISCOVERY. High-value convergences may be projected as bounded GOLD editorial discoveries only when their exact operands/method traces/provenance are preserved. GOLD != Fact/Canonical. Numeric equality must come from canonical registered engines; source interpretation remains attributed.

9. SMART FOLLOW REUSES THE ONE FOLLOW ENGINE. No post-specific follow store or notification system. The Post Kit exposes follow choices over canonical follow identities supported by subscription_funnel_law. Today number/category/author/channel identities already resolve through resolve_topics; future Event/Concept/Series/Chain follow must extend that same resolver/dispatcher rather than invent another engine. Follow intent != external channel consent.

10. FOLLOW UX. The reader follows the thing they care about, not merely the current HTML page: e.g. Number 710, a creator/author, a category/series, and—when admitted by the existing resolver contract—a stable Event/Concept/Chain identity. Personal Area / Attention should surface only meaningful new items relevant to followed identities. Ranking/relevance may prioritize delivery, but never promotes truth. Raziel may explain why an update is relevant from the same Research Context; it does not create follow identity or publish on its own.

11. PERSONAL AREA CONTINUITY. Save / Add to Research / Follow remain distinct actions. The unified System Frame carries current context and exact return. “אני עוקב” in the Personal/Attention projection is the destination for follow state and relevant updates once fully wired; do not duplicate state inside the Post renderer.

12. PERFORMANCE / MOBILE. One rich contextual renderer active at a time. Post body remains cheap/readable. Deep trace, spatial method visualization, graph detail and Raziel load on explicit focus/depth. Mobile gets Bottom Context Sheet and unified bottom context/command surface, not compressed desktop chrome.

13. CURRENT DIM5 GOLDEN CALIBRATION. Post 5116 (seventh-to-tenth-sefirot-2027) is the current media-rich calibration input: source video + poster + Hebrew original transcript + canonical translations he/en/ar/es/fr/ru/pt/de. Legacy body currently embeds he.vtt only; this is presentation DRIFT to be solved by the shared 2029 language/media renderer, not by multiplying per-post HTML tracks.

Acceptance:
- Same Post identity across historical (WordPress/Legacy-era) records and 2029.
- Source witness/media preserved.
- 2029 renderer consumes canonical translations and graph identities.
- Left rail/mobile sheet explain bounded typed connections.
- Main chain and side branches remain distinct.
- Save/Research/Follow remain distinct.
- Follow reuses subscription_funnel_law + resolve_topics/dispatcher.
- No parallel Post/Graph/Tracking/Notification/Translation system.
- Truth/provenance states remain separate from visual prominence and follow popularity.


—— SMART FOLLOW DISCOVERY UX V1 · Human-Gate ZURIEL · 6.10.2026 ——
This extends POST KIT 2029 + subscription_funnel_law v19 only. No new Follow engine/store.
1. The user should not have to understand graph identity. Follow discovery is recommendation-led.
2. Default suggestion order: Writer/Creator; actual Editorial Category/Series on the current post (e.g. מימד חמש, תיעוד אירועים, רמזים חזקים, סוד החשמל); then a central supported Topic/Number. Event/Concept/Chain only after those types are admitted into the existing resolve_topics/dispatcher contract.
3. Automatic recommendation is never automatic subscription. Explicit user action is required.
4. Raziel consumes the same Research Context and may proactively explain/suggest relevant follows, but does not invent identities, bypass consent, canonicalize, or dispatch notifications itself.
5. Post-specific relevance only: Dimension Five should normally offer Creator + מימד חמש first; event/strong-hint posts may offer תיעוד אירועים + רמזים חזקים when actually present; Sod Hashmal posts may offer סוד החשמל. Do not offer unrelated global categories.
6. Follow state remains in existing notification_prefs / FollowingPanel / dispatcher. Personal Area should display human labels and why an update appeared.
7. Prefer 2–4 relevant suggestions, ranked by content role and current reading focus. Popularity never upgrades truth.


—— FAST IMAGE DELIVERY V2 · ZURIEL 12.10.2026 · EXTEND_EXISTING ——
חובת מערכת בחוזה הפרסום והמדיה לכל העלאה, ייבוא, החלפה ופרסום, ידניים ואוטומטיים. אותה זהות מדיה בשלושה ייצוגים: מקור מדויק שמור; תמונת קריאה חדה בתוך הפוסט; תמונה קטנה וקלה לרשימות ולדף הבית. אין ליצור זהות/מאגר/מסלול פרסום נוסף.
thumb_url: רוחב עד480px, יעד60KB, תקרה100,000bytes. image_url: תמונת קריאה עד1600px (ללא הגדלת מקור), איכות מותאמת לקריאות אותיות ומספרים, יעד350KB ותקרה600,000bytes. JPEG איכות85–92; PNG מוצדק בלבד במסגרת המשקל. יחס התמונה נשמר. תמונת קריאה אינה נחתכת או מוכהית כשהיא מכילה טקסט; משתמשים בתצוגת הכרטיס השלמה הקיימת. אין להחיל תקציב תמונה קטנה על תמונת הקריאה.
המקור המדויק נשמר בנפרד באחסון הקנוני ובגיבוי המאושר, ואינו מוחלף בנגזרת. מקור/קריאה/תמונה קטנה הם ייצוגים של אותה זהות מדיה, עם קריאה חוזרת מהאחסון ומשקל/MIME מאומתים. נגזרות באותה תיקיית מדיה; שם סטנדרטי derivatives/reading.jpg ו-derivatives/preview.jpg. נשמרת תמיכה בנגזרות המאומתות הקיימות cover-fast-v1.jpg/reading-v2.jpg ו-thumb-fast-v1.jpg.
רשימות וכרטיסי הבית צורכים thumb_url; image_url בתוך פוסט. מקור/תמונה חדה נפתחים במכוון להגדלה דרך המנגנון הקיים. תמונות מחוץ למסך נטענות עצלות; תמונה ראשית גלויה יכולה להיטען מיד. OG נשאר JPG/PNG מאומת לפי post_og_image_law.
אכיפה בשמירת posts: כל INSERT עם image_url או שינוי image_url/thumb_url מחייב זוג ייצוגים שונים באותה תיקיית מדיה קנונית, קיימים באחסון ועם MIME/משקל במסגרת התקציב. sys_save_post/admin_save_post/כתיבה ישירה כפופים לאותה בדיקת שמירה; כש-thumb_url לא נמסר, מותר לחבר רק נגזרת קיימת מאומתת באותה תיקייה. חסר/כבד/סוג לא תקין חוסם את השמירה ומשאיר את הפרסום התקין הקודם. אין fallback שקט למקור כבד. פוסט טקסט ללא תמונה מותר; עריכת טקסט בלבד בפוסט היסטורי אינה מחייבת הסבת מדיה ישנה.
מידות וקריאות חזותית נבדקות בעת יצירת הנגזרות; בדיקת האחסון במסד אוכפת זמינות/MIME/משקל, ואינה טוענת למדוד קריאות חזותית. כלל שמור אינו הוכחת פריסה: מצב יישום וראיות נרשמים ביומן בלבד.

—— POST IMAGE SUBJECT POLICY V1 · Human-Gate ZURIEL · 18.10.2026 · EXTEND_EXISTING ——
הוראת המשתמש: ״אני לא רוצה תמונות של נשים ... אם יש תמונה של אישה לייצר תמונה חדשה״.
1. בתמונות הנבחרות לפרסום באתר — לרבות תמונת שער, תמונה בגוף הפוסט, תמונה קטנה, כרטיס שיתוף ופוסטר של סרטון — אין להציג נשים. הכלל חל על צילום, פריים מסרטון וגם תמונה שנוצרה בבינה מלאכותית.
2. לפני שמירה או פרסום בודקים את התמונה בפועל. כאשר בתמונת המקור מופיעה אישה, אין לבחור בה לפרסום ואין להשתמש בה כ-fallback; יוצרים תמונה חדשה ללא נשים, התואמת לנושא התוכן.
3. תמונה חדשה שנוצרה לצורך ההחלפה מסומנת כהמחשה/תמונה שנוצרה בבינה מלאכותית. היא אינה צילום האירוע, אינה ראיית מקור ואינה משנה את מקור הטקסט או את קרדיט היוצר. אין לשנות את זהות היוצר או את הטקסט המקורי כדי להתאים אותם לתמונה.
4. ההחלפה עוברת במסלול המדיה הקנוני ובכפוף ל-FAST IMAGE DELIVERY V2 ול-post_og_image_law: מקור, נגזרת קריאה ונגזרת קטנה של אותה זהות מדיה; בדיקת תצוגה ומשקל. תמונת המקור נשמרת רק לפי הרשאות ושימור המקור הקיימים, בלי להציג אותה במקום התמונה החלופית.
5. הוספת כלל זה אינה אישור לפרסום טיוטה, להפעלה מחדש של פוסט שהוסר או לשינוי גורף בארכיון. הפוסט הנוכחי 5120 נשאר מוסתר; תמונת האישה הוסרה מהפניות המדיה שלו.
מצב יישום: הנחיית פרסום מחייבת נשמרה בחוזה הקיים; אין בכך טענה שקיימת אכיפה אוטומטית של זיהוי תמונות בכל מסלולי המערכת. אכיפה אוטומטית, אם נדרשת, היא משימת מימוש נפרדת באותו owner — ללא מנגנון פרסום מקביל.


—— AUTHOR COLOR HIERARCHY PRESERVATION / THREE PRESETS V1 · Human-Gate ZURIEL · 18.10.2026 · EXTEND_EXISTING ——
החלטת מוצר מאושרת: ״הפוסטים הישנים צריכים לשמור על ההיררכיה לפי הצבעים שעשיתי אבל לפי השלושה מצבים״. תחולה: תצוגת פוסטים ב-2029, כולל מקורות WordPress היסטוריים, באותם owners קיימים.

1. CONTENT / EDITORIAL OWNER — publishing_conventions: שומרים את בחירת הכותב אילו מילים, ביטויים, ספרות, מספרים, שורות גימטריה וקטעים הודגשו, את סדרם, גבולותיהם, משקלם, הדגשת שורה שלמה לעומת תת-ביטוי ואת ההשתייכות לקבוצות צבע. אין לשטח את הכול לצבע טקסט אחיד, למחוק צבעים או להבליט רק כותרות ומסגרות.
2. ORIGINAL PRESERVED: נוסח המקור וסימוני העריכה המקוריים נשמרים כראיית מקור. ההתאמה מתרחשת בשכבת תצוגה; אין החלפת hex גורפת בתוך posts.content, אין שינוי כתיב/מספר/חישוב/שיוך מקור, ואין שכתוב אוטומטי של הארכיון.
3. THREE-PRESET PROJECTION OWNER — SOD1820_DESIGN_CONTRACT_V2.md + canonical_colors_law / palette.js: אותו מקור ואותה היררכיה מוצגים ביום, בקלף ובלילה. הגוון מותאם לרקע ולניגודיות: למשל משפחת צהוב/זהב בהירה בלילה וכהה ביום/קלף; קבוצת ירוק מקורית נשארת מובחנת. אין חובה לשמר קוד צבע זהה אם הוא פוגע בקריאות; חובה לשמר את תפקיד ההדגשה וההבחנה בין קבוצות. מיפוי מדויק יכויל בפיילוט חזותי בשלושת המצבים, לא ייחשב מאושר מכוח דוגמה מילולית בלבד.
4. SOURCE-LOCAL GROUPING: צבע זהה יכול לקשור ביטוי ומספר באותו מקור או יחידת מקור. אין להסיק מצבע זהה בפוסטים שונים קשר סמנטי, שוויון מספרי, זהות או היררכיה עולמית; לא נמצאה משמעות אוניברסלית קבועה לכל צבע בארכיון. גבולות הקבוצה נשמרים לפי המקור ולא לפי מילות מפתח אוטומטיות.
5. GEMATRIA LINES: שורת גימטריה מובחנת וקריאה; נשמרת בחירת הכותב בין הדגשת כל השורה לבין ביטוי/תוצאה/ספרה נבחרים. אין להסתפק בכרטיס חישוב צדדי תוך מחיקת ההדגשות בגוף הסיפור. מספרים וביטויים נשארים טקסט נגיש ולא תמונה; כשקיים חיבור אינטראקטיבי משתמשים ב-Number/Expression owner הקיים עם הקשר וחזרה מדויקת.
6. FIRST CENTRAL SUBJECT IN NEW EDITORIAL CONTENT: בפוסט חדש או בעריכה שאושרה, ההופעה הראשונה של הנושא המרכזי בתוך טקסט הקריאה מקבלת הדגשה ברורה — למשל ״צרפת״, גם אם היא כבר בכותרת. אין להדגיש כל הופעה או כל שם אוטומטית, ואין להחיל כלל זה רטרואקטיבית על מקור היסטורי ללא אישור עריכה נפרד. הדגשה אינה יוצרת Topic/Entity/קישור גרף; קישור מוצג רק לזהות קיימת ומאומתת לפי owner המתאים.
7. EDITORIAL EMPHASIS != STATUS / VERIFICATION: צבעי ההדגשה של הכותב נפרדים מצבעי פעולה/סטטוס/אימות של המערכת. ירוק אינו אישור חישוב, אדום אינו שגיאה וזהב אינו עובדה/איכות/Canonical. שומרים את הנוסח, השיטה והראיות תחת בעלי הסמכות הקיימים.
8. ONE SHARED IMPLEMENTATION: ההגדרה החזותית שייכת לחוזה Design V2 ולפלטה הקנונית; רכיב הפוסט המשותף צורך אותה. אין theme store נוסף, palette נפרדת לכל פוסט, CSS חדש במקור כדי לכפות צבעי 2029. (תצוגת Legacy אינה קיימת עוד מאז 5.11.2026.)
9. VISUAL ACCEPTANCE: לפני מימוש גורף נדרש פיילוט תחום על פוסט קצר, פוסט ארוך ופוסט גימטריה עם סימוני מקור אמיתיים. לבדוק יום/קלף/לילה, מובייל/מחשב, קריאות של כל תו מסומן, גבולות תת-ביטוי, סדר RTL, קבוצות נבדלות, מיקוד מקלדת וחזרה. חישוב ניגודיות או הדמיה מקומית לבדם אינם אישור תצוגת האתר.
10. STATUS / RELEASE BOUNDARY: ההחלטה נשמרה בחוזה הפרסום ומופנית לבעלי עיצוב V2/פלטה/פוסט הקיימים. מימוש בקוד, סנכרון סעיף ההצגה לקובץ Design V2 ובדיקות דפדפן עדיין נדרשים. אין בשמירת ההחלטה אישור למיזוג, פריסה, שינוי אתר חי, שינוי פריוויו מאוחד, backfill או הפעלת סוכנים.

ראיות לסקירת המקור: סריקת סימוני HTML ב-383 פוסטי WordPress בקטגוריות תיעוד אירועים/רמזים חזקים ללא סוד החשמל; קריאת תוכן מדגמית ב-posts.id=254,266,1126,1410,1487. הספירות אינן אימות שכל פריט נכתב ידנית ואינן אימות טענות הגימטריה; הסקירה עסקה במבנה ובהדגשות בלבד.

—— CHATGPT DEFAULT DROPBOX PUBLISH FLOW V1 · Human-Gate ZURIEL · 26.10.2026 · EXTEND_EXISTING ——
החלטת בעל האתר: כשאומרים ל-ChatGPT ״תעלה״ / ״תפרסם״ / ״שים באתר״ פוסט, סרטון או תמונה, אין לבקש בכל פעם הוראה נפרדת ״דרך Dropbox״ או ״תעלה את התמונה״. מסלול המדיה הקנוני הוא חלק מובנה מהבקשה. זהו חידוד של publishing_conventions הקיים, MEDIA SOURCE FIDELITY GATE, UNIVERSAL MEDIA DEFAULTS, AGENT_MEDIA_UPLOAD_BRIDGE, FAST IMAGE DELIVERY V2, source_video_publish_law ו-post_og_image_law; אין ליצור חוזה, אחסון, סוכן או מו״ל מקביל.

1. טריגר וסמכות: הוראה מפורשת לפרסם/להעלות לאתר מתירה לבצע את שלבי פרסום המדיה הנדרשים ללא שאלות חוזרות על העברת הקובץ ותמונת שער. שיתוף קישור/קובץ ללא הוראת פרסום אינו מתיר פרסום אוטומטי. היעד הוא 2029 — המוצר הפעיל היחיד (Legacy פרש ב-5.11.2026 ואינו יעד פרסום); הוראת פרסום אינה אישור לשינוי קוד/ענפי Preview, מיזוג או פריסה.
2. מסלול ChatGPT בברירת מחדל: בדוק תחילה תוכן כפול ונתיב הפרסום הפעיל. שמור את קובץ המדיה המקורי, ללא שינוי ביטים, תחילה ב-Dropbox כמקור גיבוי קבוע כאשר חיבור Dropbox זמין; אמת שההעלאה הושלמה ושמור שם קובץ ייחודי לפי מזהה פוסט/תאריך. אחרי האישור העבר דרך מנגנון agent-upload/AGENT_MEDIA_UPLOAD_BRIDGE הקיים עם כרטיס הרשאה תחום אל canonical Supabase Storage (media/gallery לפי חוזה), וקבל Receipt מאומת. Dropbox הוא שער כניסה וגיבוי, לא כתובת הוידאו/התמונה הציבורית; אסור לסמוך על לינק שיתוף פרטי או קישור זמני כספק המדיה באתר. אם גישה/הרשאה/קובץ חסרים — דווח חסימה ברורה, אל תמציא הצלחה או תעקוף מנגנוני אבטחה.
3. מדיה ותמונה בלי לבקש שוב: לסרטון — שמור וידאו MP4 מקורי וצור poster קנוני ממקור הסרטון לפי חוזה הפרסום, וכן נגזרות קריאה ותמונה קטנה ממוטבות, עם MIME/משקל/זהות תקינים. ניתן להכין בנוסף תמונת שער מעוצבת/AI לפי בקשת המשתמש או בהתאם לתוכן, בסגנון המותג, תוך ציון ״אילוסטרציה״; אילוסטרציה אינה עדות מצולמת או תחליף ל-poster קנוני כשזה נדרש. אין תמונות נשים בפרסומים לפי כלל POST IMAGE SUBJECT POLICY. לדימוי מקורי שומרים תמיד מקור מלא לפני יצירת נגזרות; לעולם אין לשמור רק thumbnail.
4. פרסום והקשר: חבר את video src, poster/image_url ו-thumb_url לכתובות הציבוריות הקבועות ב-Supabase, באותה זהות Post/Media; שמור קרדיט מקור וקישור יוצר, תאריך ותגיות/קטגוריות קיימות בלי ליצור כפילויות. דרישות תמלול ותרגומים, Human Gate והבחנה עובדה/ייחוס/רמז נשארות מחייבות; אין לדווח READY כשה-preflight הקנוני חסר.
5. אימות וסיום: בצע קריאת-חזרה לחשבונית אחסון, בדיקת קיום קובץ מקור ונגזרות, בדיקת שדות והפניות הפוסט; בדוק תצוגה בפועל במובייל/דפדפן ב-2029. DB INSERT/UPDATE לבדו אינו הוכחת פרסום חי או נראות. דווח באופן מפורד מה בוצע, מה אומת ומה עדיין חסום, עם קישור לצפייה רק אם אומת. אל תכפה שינוי ב-Production או בפריוויו כדי לעקוף חסימה.
6. תחולה: זוהי ברירת מחדל תפעולית לפרסומי SOD1820 דרך ChatGPT כאשר הכלים והרשאות המדיה זמינים, ולא שינוי בכללי המערכת הפנימיים של ChatGPT או הבטחה שכל סשן/סוכן יקרא מסמך זה אוטומטית. כל סוכן שמבצע פרסום בפרויקט צריך לקרוא את publishing_conventions לפני הפעולה.

מקרה כיול: posts.id=5125, ״הרב כדורי — הגאולה בתשפ״ז״, מקור Dropbox → agent-upload → Supabase; שמירת המקור, נגזרות ותיקון הפוסט נבדקו ב-DB/Storage. תצוגת האתר/Legacy לא אומתה כחלק ממקרה הכיול, ואסור להציג מקרה זה כהוכחת READY מלא לכל שערי הפרסום.

—— POST MODIFIED DATE REQUIRED · 27.10.2026 · re-scoped to 2029 on 10.11.2026 · publishing_conventions operational correction ——
כש-ChatGPT או כל סוכן אחר מפרסם פוסט חדש ב-public.posts, חובה להגדיר posts.modified לתאריך הפרסום (לרוב זהה ל-posts.date; בעריכה בפועל לפי updated time) כבר ב-INSERT. אין להסתפק ב-date/created_at בלבד: קוראי 2029 ממיינים לפי modified DESC NULLS LAST (getLatestPostCards ב-src/lib/supabase.js; fetchPostsCatalog2029 ו-fetchPostSearchSuggestions2029 ב-src/lib/research/postsCatalog2029Projection.js), והיעדר modified עלול להוריד פוסט חדש לתחתית הרשימות. (ב-27.10 נכתב הכלל עבור דף הבית של Legacy, fetchHomePosts, שהוסר ב-5.11.2026; הדרישה נשארת בתוקף ב-2029.) modified קובע סדר בלבד ואינו אות ל״עדכון חדש״ (SOD1820_DESIGN_CONTRACT_V2.md §8.1). לאחר כתיבה לוודא שהפוסט מופיע בראש רשימות הפוסטים של 2029, אינו טיוטה/פורום/מוסתר מהבית, ונראה בפועל; לא לשנות קוד, פריסה, Preview או שדות לא קשורים לשם עקיפת התקלה. בדיקת DB/מיון אינה תחליף לבדיקת תצוגה בדפדפן. כיול: posts.id=5126 (27.10.2026), תוקן modified=NULL ל-date, עלה ממקום 1295 למקום 1 במיון הרשימה. 


—— DIM5 EDITORIAL COVER VS SOURCE POSTER · 31.10.2026 · user-requested correction · VISUAL-DIM5-20261031-V1 ——
STATUS: user requested canonical contract correction after comparing historical Dimension Five cards with Post 5130. This is an additive refinement of publishing_conventions, not reactivation of historical dim5_upload_law or a new publisher/asset store. The old Source Video First, translation, verification, provenance and publication owners remain unchanged.

1. TWO DISTINCT VISUAL REPRESENTATIONS (mandatory for newly published Dimension Five video posts):
   (a) SOURCE-DERIVED PLAYER POSTER: a verified raster frame from the preserved original video, attached to the player/poster representation. This is evidence of what the video looks like; it is not by default the editorial cover.
   (b) DIMENSION FIVE EDITORIAL COVER CARD: one distinct JPG/PNG image interpreting the *central message of that exact post* through visual symbolism, and aligned with the established series card language. This is the default posts.image_url for the card/list/reading presentation; posts.thumb_url is a light derivative of the same card, not an unrelated screenshot. The original video, player still and editorial card all belong to ONE media/post identity. Do not duplicate the Post.
   This series-specific exception supersedes only the sentence in UNIVERSAL MEDIA DEFAULTS (5.10.2026) §2 requiring that the source-derived poster itself become image_url/card/list/share. The source-derived player poster remains REQUIRED. The editorial series card becomes image_url/thumbnail only after visual verification; no original replacement.

2. ESTABLISHED VISUAL CALIBRATION: existing distinct thematic SOD1820 cards are verified by Post image_url provenance in posts 5065 (divine-timing.png), 5066 (real-code-of-reality.png), 5090 (universe-tests-you.png), 5093, 5096, 5097, 5102 and 5105. For a recurring-topic post such as 5130, use the editorial motif of 5090 as a contextual style reference, not its exact pixels or an identical repeated image. Not all historical posts have an editorial card (e.g. newer 5129); the corrective target is the established approved series treatment, not a claim that every old asset matched it.

3. IMAGE COMPOSITION: prioritize an original thematic scene/metaphor reflecting the video (for Post 5130: threshold before breakthrough, old patterns/temptation vs deliberate choice, contrast of shadow and light). A plain crop of the speaker, a talking-head frame, a generic social-video thumbnail or a thumbnail with the creator's face as the principal motif is NOT the default editorial card. A source portrait may still be shown in the source video/secondary source image when relevant, or selected explicitly by ZURIEL. Artistic direction should be cinematic, meaningful, visually legible and coherent with the established series; design must not imply that the symbolic art is a photographed event, quote or source evidence. Do not add women's imagery or invent source text, logos, dates, people or author identities. Hebrew typography only when exact and visually verified; the canonical UI category badge stays OUTSIDE the image.

4. PREPUBLICATION GATE: original MP4 SHA/bytes verified; source poster verified; editorial card independently rendered and visually inspected; image_url canonical public JPG/PNG on Supabase Storage; thumb_url verified derivative; mobile card and desktop list/OG clear; no dramatic misrepresentation of the speaker; proper source credit; compare with at least two previously published distinct Dimension Five cards. The standard canonical /api/card /api/og sharing owner remains the only share owner (no parallel OG engine). If the editorial card is missing, status COVER_CARD_PENDING / VISUAL_ACCEPTANCE_PENDING, not FULLY_COMPLETE. User may explicitly approve the source still instead, recorded for that Post.

5. REMEDIATION: Post 5130 used a speaker crop as image_url and thumbnail even though historical cards were thematic; mark its cover treatment as NOT MATCHING THE ESTABLISHED DIM5 STYLE, while keeping the publicly released Post, MP4, canonical transcripts and existing player poster intact. Prepare a unique thematic editorial card, then update image_url/thumb_url under the existing media upload / revision / visual acceptance gates. No automatic mass replacement of other Posts, no reuse of another Post's exact artwork, no code/schema/RLS/deployment change through this contract edit.
—— END DIM5 EDITORIAL COVER CORRECTION ——


—— GALLERY DATE ROUTING / CHATGPT FIXED UPLOAD · 02.11.2026 · APPROVED ZURIEL ——
מרחיב את המסלול הקיים, ללא מערכת העלאה נוספת. פקודת ״תעלה לגלריה״ מסמיכה לבצע את המסלול הקיים ולבחור שם קובץ תחום; אין לשאול שוב על עצם ההעלאה. בחירת נמען/ערוץ חיצוני נפרדת.
מסלול: קובץ מלא שאושר → Dropbox → download_link חד-פעמי → agent_upload_ticket_issue מוגבל לנתיב/MIME/משקל/SHA → agent-upload?mode=url → receipt עם readback SHA/size/MIME → שיוך gallery_images לגלריה קיימת → קריאת חזרה ואימות חזותי. Dropbox הוא מקור העברה וגיבוי, לא image_url ציבורי. אין לעקוף חסימת כלי או הרשאה.
אחסון חדש נשאר media/sod1820/agent/2029/image/YYYY/MM/<asset-id>/; מקור מדיה ונגזרות נפרדים. תאריך נתיב פיזי הוא תאריך קליטת המדיה; אין לבלבל עם תאריך האירוע. כשקיים תאריך אירוע מפורש הוא נשמר כתאריך אירוע; בידיעה על תוכנית עתידית נשמר תאריך פרסום הידיעה כתאריך התיעוד, והמועד העתידי בנפרד עם planned. אם אין תאריך, לא ממציאים: שומרים זמן קליטה והיעדר תאריך אירוע. תאריך אינו יוצר גלריה חדשה אוטומטית: יש להתאים גם לנושא ולעוגן ולגלריית ההמשך הפעילה. בהיעדר שיוך קיים, להגדיר שיוך תחום בחוזה ובמנגנון הקיים, לא להקים העלאה מקבילה.
מקרה כיול: חדשות הרכבת 02.11.2026 → גלרית דוד24 id=3ee0ec23-04f3-468b-a7b5-67087d41681a, WP105, כהמשך לגלריות14–45. התמונה id=7bccbdee-f8ad-4d97-9c5b-03ca07ee426e היא עיבוד AI שאושר מפורשות, אינו צילום מקור בלתי-מעובד; ייחוס זה נשמר. ההדגשות הקבועות והקישורים מוגדרים במסמך37 A.2. העתיד: צילום מקור נשמר לפני עיבוד; אין להשתמש ב-imagegen כדי לשחזר טקסט מקור כתיעוד בלתי-מעובד.


הרחבה מאושרת NOW-CENTRAL-HANDOFF-20261103: פירוט קנוני במסמך37 באותו סעיף. עכשיו מייצג את כל פרסומי האתר והסדרות בשפה קומפקטית אחידה של2029, כולל צבי ציבורי בתקופת הביניים. שם הסדרה מסרים; אור הגאולה מקור בתוכה. פוסט+וידאו באותו פרסום אינם שתי התראות; יעדי מקור מדויקים. אין העתקת בלוקיLegacy. לשמר היררכיית הבית שכבר תוקנה. שינוי חוזה בלבד.

HOME-UPDATES-VISUAL-20261103: החלטת צוריאל המאוחרת במסמך37 מחליפה מוצר הרשמת פתיחה נפרד בהרשמת ״עדכוני האתר״ אחת, תוך שימור היקף הסכמות קודמות. נדרשת התאמת חוזה ומנגנון הדיוור הקיים בידי הסשן המרכזי; לא הוחל שינוי מנויים או משלוח.

—— HISTORICAL POSTS — GLOBAL VISUAL REDESIGN / COLOR SEMANTICS · HUMAN-GATE ZURIEL · 10.11.2026 ——

כאשר מבצעים עיצוב גורף לפוסטים היסטוריים/ישנים במערכת 2029, אין לשמר באופן עיוור את מעטפת הצבע הישנה ואין למחוק את משמעות הצבעים המקוריים.
1. PRESERVE YELLOW GEMATRIA SEMANTICS: צבעי הצהוב וההדגשות הצהובות שצוריאל הגדיר עבור גימטריות, מספרים, קישורים או סימוני משמעות נשמרים כסמנטיקה ותוכן. אין להסירם, להחליפם בצבע דקורטיבי שרירותי או לאחד אותם לטקסט רגיל.
2. MAP TO THE CURRENT THREE COLOR MODES: ממפים כל תפקיד צבע קיים לצבע נגיש ומתאים בכל אחת משלוש ערכות המערכת הנוכחיות — יום, קלף ולילה. שומרים על ההבחנה וההיררכיה של ההדגשה הצהובה, גם אם ערך הצבע המדויק משתנה בין הערכות. אין להניח שצהוב זהה עובד על כל רקע.
3. SEMANTIC ROLE BEFORE HEX VALUE: משמרים את תפקיד הצבע (למשל גימטריה, קישור מספרי, הדגשת ראיה או טקסט רגיל) וממפים אותו דרך טוקנים/מחלקות העיצוב הקנוניים; לא מקבעים צבעים inline ולא יוצרים מערכת צבעים מקבילה לפוסטים.
4. APPLY CURRENT POST LAWS AFTER MAPPING: לאחר מיפוי הצבעים, מחילים על הפוסטים את חוזי הפוסטים הפעילים של 2029 — טיפוגרפיה, קישורים, רכיבי גימטריה, קריאות, נגישות, מדיה, תצוגת יום/קלף/לילה ואימות חזותי. יש לבדוק כל תבנית/משפחת פוסטים בכל שלוש הערכות לפני החלה גורפת.
5. NO BLIND LEGACY DARK LOCK: כלל הנעילה לכהה שתועד בפרוטוקול WordPress ההיסטורי אינו ברירת מחדל לעיצוב הגורף החדש. הוא נשאר ראיית תאימות היסטורית בלבד; פוסט שעובר התאמה למערכת 2029 צריך לתמוך בשלוש הערכות לפי החוזים הפעילים, בלי לפגוע בצבעי המקור הסמנטיים.
6. SOURCE AND EVIDENCE PRESERVATION: שינוי עיצוב אינו משנה את נוסח המקור, זהות הפוסט, קרדיט, תאריך, קישורים או משמעות הראיות. אין לשנות תוכן כדי להתאים אותו לצבע; משנים את מיפוי הייצוג.
7. BATCH ACCEPTANCE: לפני החלה גורפת, בודקים מדגם מייצג של פוסטים ישנים — כולל גימטריות צהובות, קישורים מספריים, תמונות/צילומי מסך, קרוסלות ותוכן מעורב — בכל שלוש הערכות. כשל בקריאות או באובדן משמעות צבע עוצר את ההחלה לאותה משפחה עד תיקון.

SCOPE: זהו כלל תכנון וקבלה לעיצוב גורף עתידי של פוסטים היסטוריים בתוך 2029. הוא אינו מפעיל מערכת Legacy, אינו מחייב תחזוקה של WordPress ואינו מאשר שינוי קוד או פריסה בפני עצמו. מימוש צבעים וטוקנים נשאר תחת בעלות Design/Experience; מוסכמות פרסום מגדירות את סמנטיקת הפוסט ואת תנאי הקבלה.
$sod_txt$, updated_at=now() where id=4;
  if (select md5(body) from public.project_codex where id=4) <> 'f39efab93a4d4bfa851586d4fc4259f5' then raise exception 'P0 codex publishing_conventions: new body md5 mismatch'; end if;
end
$sod_p0$;

-- ── project_codex #9 branches_deploy ────────────────────────────────────────
do $sod_p0$
declare v_body text;
begin
  select body into v_body from public.project_codex where id=9 and slug='branches_deploy' for update;
  if not found then raise exception 'P0 codex branches_deploy: row missing'; end if;
  if md5(v_body) <> '6cee6559506bba1be4f1e71a86693285' then raise exception 'P0 codex branches_deploy: body drift (md5 %)', md5(v_body); end if;
  update public.project_codex set body=$sod_txt$
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
Do not enable Git deployments (globally or per branch) merely to get a Preview. Preview and Production creation remain explicit, bounded, approved actions.$sod_txt$, updated_at=now() where id=9;
  if (select md5(body) from public.project_codex where id=9) <> '8d87b8459f2fec3c25f9bf7cea443d3b' then raise exception 'P0 codex branches_deploy: new body md5 mismatch'; end if;
end
$sod_p0$;

commit;
