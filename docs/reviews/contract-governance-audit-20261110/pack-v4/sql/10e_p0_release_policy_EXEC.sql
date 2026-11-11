-- SOD1820 · P0 release policy — EXECUTION FORM of 10_p0_release_policy.sql. PROPOSAL ONLY. NOT EXECUTED.
-- Approved content: 10_p0_release_policy.sql SHA-256 d1ac658b6e2ace922ac5d32a3021f6ef8aa88dc06390b05aca095da0d48963fb.
-- Same six targets, same base guards, same end state: every rebuilt text must equal the literal of 10_
-- (md5 + SHA-256 + length) and every new metadata must equal the 10_ literal (md5 of jsonb text), or nothing changes.
-- ONE statement (a single DO block, no BEGIN/COMMIT): atomic on its own, so an error at any point, a refused
-- guard or a cut-off text leaves the database unchanged. Requires ZURIEL's explicit approval of this exact file
-- (SHA-256 in the handoff report) for one run (CLAUDE.md §0.4). Nothing is deleted.
do $sod_p0e$
declare
  v_dor public.nodes%rowtype;
  v_iac public.nodes%rowtype;
  v_fcp public.nodes%rowtype;
  v_ssl public.nodes%rowtype;
  v_c4 text; v_c9 text; v_txt text; v_meta jsonb; v_ops text[]; v_pos int; i int; v_new_id uuid; v_tgt text;
begin
  -- A. lock and verify all six live rows before any write (same guards and messages as 10_)
  select * into v_dor from public.nodes where type='rule' and rule_id='deploy_on_request' and is_active for update;
  if not found then raise exception 'P0 deploy_on_request: no active version (drift)'; end if;
  if v_dor.rule_version <> 3 then raise exception 'P0 deploy_on_request: active version is v% (expected v3)', v_dor.rule_version; end if;
  if md5(v_dor.description) <> 'f93e73ce0ad3bc66457e6ff07cdb2322' then raise exception 'P0 deploy_on_request: description drift (md5 %)', md5(v_dor.description); end if;
  if md5(v_dor.metadata::text) <> '8a4b80b7e9b824e79dca9e229549c1c4' then raise exception 'P0 deploy_on_request: metadata drift (md5 %)', md5(v_dor.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='deploy_on_request' and rule_version > 3) then raise exception 'P0 deploy_on_request: a version above v3 already exists'; end if;
  select * into v_iac from public.nodes where type='rule' and rule_id='inter_agent_coordination_law' and is_active for update;
  if not found then raise exception 'P0 inter_agent_coordination_law: no active version (drift)'; end if;
  if v_iac.rule_version <> 17 then raise exception 'P0 inter_agent_coordination_law: active version is v% (expected v17)', v_iac.rule_version; end if;
  if md5(v_iac.description) <> '02d188d1b92e32ea51907d059b18c47f' then raise exception 'P0 inter_agent_coordination_law: description drift (md5 %)', md5(v_iac.description); end if;
  if md5(v_iac.metadata::text) <> '982e7976d43d62a7a9b08b8d3a591e6f' then raise exception 'P0 inter_agent_coordination_law: metadata drift (md5 %)', md5(v_iac.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='inter_agent_coordination_law' and rule_version > 17) then raise exception 'P0 inter_agent_coordination_law: a version above v17 already exists'; end if;
  select * into v_fcp from public.nodes where type='rule' and rule_id='foundation_closure_protocol_law' and is_active for update;
  if not found then raise exception 'P0 foundation_closure_protocol_law: no active version (drift)'; end if;
  if v_fcp.rule_version <> 7 then raise exception 'P0 foundation_closure_protocol_law: active version is v% (expected v7)', v_fcp.rule_version; end if;
  if md5(v_fcp.description) <> '336934e50ca48dba8cb00cf64986b878' then raise exception 'P0 foundation_closure_protocol_law: description drift (md5 %)', md5(v_fcp.description); end if;
  if md5(v_fcp.metadata::text) <> 'b26961fac416ac5e4775e9a41b6deae8' then raise exception 'P0 foundation_closure_protocol_law: metadata drift (md5 %)', md5(v_fcp.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='foundation_closure_protocol_law' and rule_version > 7) then raise exception 'P0 foundation_closure_protocol_law: a version above v7 already exists'; end if;
  select * into v_ssl from public.nodes where type='rule' and rule_id='system_suggestions_law' and is_active for update;
  if not found then raise exception 'P0 system_suggestions_law: no active version (drift)'; end if;
  if v_ssl.rule_version <> 5 then raise exception 'P0 system_suggestions_law: active version is v% (expected v5)', v_ssl.rule_version; end if;
  if md5(v_ssl.description) <> '9b5c19de501b1985da01ddfc9c646d3c' then raise exception 'P0 system_suggestions_law: description drift (md5 %)', md5(v_ssl.description); end if;
  if md5(v_ssl.metadata::text) <> 'aa247fb211e2fec0454cb457dd4fc86d' then raise exception 'P0 system_suggestions_law: metadata drift (md5 %)', md5(v_ssl.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='system_suggestions_law' and rule_version > 5) then raise exception 'P0 system_suggestions_law: a version above v5 already exists'; end if;
  select body into v_c4 from public.project_codex where id=4 and slug='publishing_conventions' for update;
  if not found then raise exception 'P0 codex publishing_conventions: row missing'; end if;
  if md5(v_c4) <> '26b473b72d55c57153c6678543d25094' then raise exception 'P0 codex publishing_conventions: body drift (md5 %)', md5(v_c4); end if;
  select body into v_c9 from public.project_codex where id=9 and slug='branches_deploy' for update;
  if not found then raise exception 'P0 codex branches_deploy: row missing'; end if;
  if md5(v_c9) <> '6cee6559506bba1be4f1e71a86693285' then raise exception 'P0 codex branches_deploy: body drift (md5 %)', md5(v_c9); end if;

  -- B. deploy_on_request: v3 → v4 (2 fragments)
  v_tgt := 'deploy_on_request'; v_txt := v_dor.description;
  v_ops := array[
    $sod_frag$צוריאל מחליט מתי מעלים לאוויר. לא דוחפים ל-main אוטומטית. כל push ל-main = פריסת Vercel, והמכסה החינמית מוגבלת (100 פריסות/יום). אסור לבזבז אותה על כל תיקון קטן. צוברים שינויים כ-commits (לענף הפיתוח לשמירה), ומעלים ל-main רק כשצוריאל אומר במפורש («תעלה»/«העלה»). אז מעלים את כל המצטבר בבת אחת. ליזום עדכון: בכל הזדמנות מתאימה לומר לצוריאל כמה חלקים מוכנים וממתינים לפריסה, ולשאול אם להעלות עכשיו. שינויי נתונים (Supabase) חיים מיד ולא תלויים בפריסה — מותר להמשיך בהם כרגיל בלי לשרוף מכסה.

[UPDATE v2 · Human-Gate ZURIEL · 17.9.2026 — STANDING AUTO-RELEASE AUTHORIZATION · SUPERSEDES EXPLICIT “תעלה” REQUIREMENT FOR ROUTINE RELEASES]

1. STANDING AUTHORIZATION. ZURIEL grants standing Human-Gate authorization for routine code/runtime releases that are demonstrably GATE-CLEAN, DEPENDENCIES-CLOSED, CURRENT-MAIN-RECONCILED, CI/GOLDEN-GREEN, SECURITY/PRIVACY-CLEAN where applicable, and free of overlapping active writers. A separate “תעלה” / “העלה” message is no longer required for such releases.
2. RELEASE WHEN READY, NOT WHEN ASKED. The primary agent owns release timing. When the complete dependency batch becomes clean, it should merge/apply/deploy the authorized bounded release and verify live state without asking ZURIEL for an extra confirmation. Do not leave gate-clean work indefinitely branch-only merely waiting for a release word.
3. DEPENDENCY-AWARE BATCHING. Release follows the canonical dependency DAG/batch, not PR creation order. A higher layer waits for required lower layers. Independent clean lanes may release independently when doing so cannot create a temporary incompatible state. Stacked/dependent PRs are composed/rebased/reconciled before release rather than blindly merged one by one.
4. RELEASE RECOMMENDATION IS MANDATORY. Every material completion/handoff must classify its release state as exactly one of: AUTO_RELEASE_NOW · BUNDLE_WITH(<scope>) · BLOCKED_BY(<dependency/gate>) · SAFE_INDEPENDENT_WAITING_RUNTIME · DO_NOT_RELEASE_SUPERSEDED/PARKED. The agent explains the decisive dependency in plain language.
5. AUTO-RELEASE PREFLIGHT. Before automatic release refresh live sync and verify at minimum: canonical owner/current main; exact head/base; open dependency/blocker state; required tests/checks; migration/RLS/security gates when touched; no active overlapping writer; rollback/recovery path; release batch compatibility. Any uncertainty that can change safety = BLOCKED, not guessed.
6. POST-RELEASE PROOF. Automatic release is not complete at merge. Verify actual production/live object state, exact deployed version/bundle/function/migration as applicable, critical smoke/golden path, and record AFTER with MERGED/APPLIED/DEPLOYED/LIVE/VERIFIED separately. Silent deployment failure remains failure.
7. STANDING AUTHORIZATION DOES NOT COVER IRREVERSIBLE PRODUCT/TRUTH DECISIONS. Still require explicit ZURIEL Human Gate for: canonicalizing/publishing governed research truth when owner requires Human Gate; destructive/non-recoverable data loss; new paid prices/economics; major production cutover Legacy→2029; materially weakening privacy/security; permanent deletion/retirement of preserved capability/history; or an explicit active law that names a separate Human decision. Routine reversible schema migrations that are already owner/gate-approved may ship as part of a clean batch.
8. “תעלה” REMAINS AN OVERRIDE/EXPEDITE COMMAND, NOT A REQUIRED TOKEN. If ZURIEL says תעלה, proceed only if gate-clean; the command never bypasses blockers. If he says wait/hold, that explicit hold overrides standing authorization for the named scope until lifted.
9. VERCEL/RESOURCE SAFETY REMAINS. Batch releases sensibly, preserve quota safeguards, and avoid duplicate deployments. Optimization of deployment count must not postpone a dependency-clean release indefinitely.

OWNER CHECK: EXTEND_E$sod_frag$, $sod_frag$[v4 · Human-Gate ZURIEL · 10.11.2026 — אישור מפורש לכל מיזוג ולכל פריסה · אין הרשאה עומדת · 2029 הוא המוצר הפעיל היחיד]
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

OWNER CHECK: EXTEND_E$sod_frag$,
    $sod_frag$
1. PREFLIGHT ADDITION. AUTO-RELEASE PREFLIGHT (v2 §5) additionally require$sod_frag$, $sod_frag$
1. PREFLIGHT ADDITION. RELEASE PREFLIGHT (§5) additionally require$sod_frag$
  ];
  for i in 1 .. coalesce(array_length(v_ops, 1), 0) by 2 loop
    v_pos := strpos(v_txt, v_ops[i]);
    if v_pos = 0 then raise exception 'P0e %: fragment % not found', v_tgt, (i + 1) / 2; end if;
    if strpos(substr(v_txt, v_pos + 1), v_ops[i]) > 0 then raise exception 'P0e %: fragment % not unique', v_tgt, (i + 1) / 2; end if;
    v_txt := overlay(v_txt placing v_ops[i + 1] from v_pos for char_length(v_ops[i]));
  end loop;
  if md5(v_txt) <> '78d80d2264e0b5062b425319b25a3e3a' or encode(sha256(convert_to(v_txt, 'UTF8')), 'hex') <> '9e0aac2829ffaef94170a515df3b808d73fde48a28e2e2d8455f47188e831061' or char_length(v_txt) <> 6532 then
    raise exception 'P0e %: rebuilt text differs from the approved literal of 10_ (md5 %)', v_tgt, md5(v_txt);
  end if;
  v_meta := (v_dor.metadata - array['auto_release_preconditions']::text[]) || $sod_meta${"human_gate_v4": "ZURIEL 2026-11-10", "merge_is_not_deploy": true, "release_advice_states": ["READY_FOR_APPROVAL", "BUNDLE_WITH", "BLOCKED_BY", "SAFE_INDEPENDENT_WAITING_RUNTIME", "DO_NOT_RELEASE_SUPERSEDED/PARKED"], "release_preconditions": ["gate_clean", "dependencies_closed", "current_main_reconciled", "required_checks_green", "security_privacy_clean_if_applicable", "no_overlapping_writer", "rollback_recovery_known"], "standing_auto_release": false, "separate_taale_required": true, "release_advice_state_aliases": {"AUTO_RELEASE_NOW": "READY_FOR_APPROVAL"}, "v4_explicit_release_approval": {"decided_at": "2026-11-10", "supersedes": "v2 standing authorization (§§1, 2, 8)", "owner_check": "EXTEND_EXISTING", "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.", "no_new_system": true, "procedure_ref": "CLAUDE.md — נוהל פריסה ל-Production מסשן ענן", "active_product": "2029", "legacy_retired": "2026-11-05", "production_since": "2026-11-04"}, "explicit_human_gate_remaining": ["governed_truth_canonicalization_or_publication", "destructive_irreversible_data_loss", "pricing_economics", "privacy_security_weakening", "permanent_capability_history_retirement"], "explicit_approval_required_per_action": true}$sod_meta$::jsonb;
  if md5(v_meta::text) <> '4620b9f9d94ecf9c3ca603910b12691c' then raise exception 'P0e %: rebuilt metadata differs from 10_ (md5 %)', v_tgt, md5(v_meta::text); end if;
  update public.nodes set is_active=false where id=v_dor.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$⛔ Release v4 — Explicit Approval per Merge & Deployment · No Standing Authorization$sod_lbl$, v_txt, v_meta, true, 'deploy_on_request', 4,
          v_dor.depends_on, 3, v_dor.weight, v_dor.hebrew_date, v_dor.axis_theme, v_dor.gallery_id, v_dor.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> '78d80d2264e0b5062b425319b25a3e3a' then raise exception 'P0 deploy_on_request: new description md5 mismatch'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='deploy_on_request' and is_active) <> 1 then raise exception 'P0 deploy_on_request: active version count is not 1'; end if;

  -- C. inter_agent_coordination_law: v17 → v18 (7 fragments)
  v_tgt := 'inter_agent_coordination_law'; v_txt := v_iac.description;
  v_ops := array[
    $sod_frag$ערי פרסום אינם משתנים.


--- HISTORICAL V1–V16: conflicting communication clauses superseded by v17 ---
עיקרון-על: כשצוריאל$sod_frag$, $sod_frag$ערי פרסום אינם משתנים.

הוראת צוריאל מחייבת — 10.11.2026 (v18): 2029 הוא Production והמוצר הפעיל היחיד; אין הרשאת שחרור עומדת.
2029 עלה ל-Production ב-4.11.2026 ו-Legacy פרש ב-5.11.2026 (קוד Legacy נשמר בהיסטוריית Git בלבד ואינו יעד פריסה, Preview או חזרה). סעיפים 75, 79 ו-80 (v12) תיארו את המצב שלפני המעבר והם היסטוריים; 76–78 נשארים בתוקף כעיקרון: חומר Legacy הוא ראיה היסטורית בלבד, לא סמכות עיצוב או ארכיטקטורה. כל מיזוג ל-main וכל פריסה ל-Production מחייבים אישור מפורש של צוריאל לפעולה המסוימת (deploy_on_request, הגרסה הפעילה). ההרשאה העומדת והשחרור האוטומטי של v13 (סעיפים 82, 86, 87) בוטלו; ייעוץ השחרור (81, 83–85, 88) נשאר, ותוצאתו המלצה לצוריאל — לעולם לא פעולה אוטומטית.


--- HISTORICAL V1–V16: conflicting communication clauses superseded by v17; production/release clauses 75–82 and 86–88 updated by v18 ---
עיקרון-על: כשצוריאל$sod_frag$,
    $sod_frag$e; EXTEND_EXISTING only]
75) TEMPORARY LEGACY PRODUC$sod_frag$, $sod_frag$e; EXTEND_EXISTING only] — HISTORICAL PRE-CUTOVER STATE: superseded by v18 (10.11.2026); 2029 = Production since 4.11.2026
75) [HISTORICAL · superseded by v18] TEMPORARY LEGACY PRODUC$sod_frag$,
    $sod_frag$bility independent.
79) CUTOVER IS EXPLICIT. No agent may assume the new site is production merely because 2029 work exists, and no agent may assume the legacy site is the long-term system merely because it is currently live. The transition point is a Human-Gate decision by ZURIEL and must be recorded with exact release/live state.
80) FRESH-AGENT ACCEPTANCE. A project-entry agent must be able to state both truths without prior conversation memory: CURRENT PRODUCTION = legacy/transitional until explicit cutover; TARGET ARCHITECTURE = 2029. Confusing those two states is an entry-routing failure and must be reported as DRIFT.

OWNER CHECK: EXTEND_EX$sod_frag$, $sod_frag$bility independent.
79) [HISTORICAL · cutover executed 4.11.2026 by explicit ZURIEL decision; Legacy retired 5.11.2026] CUTOVER IS EXPLICIT. No agent may assume the new site is production merely because 2029 work exists, and no agent may assume the legacy site is the long-term system merely because it is currently live. The transition point is a Human-Gate decision by ZURIEL and must be recorded with exact release/live state.
80) FRESH-AGENT ACCEPTANCE (updated by v18). A project-entry agent must be able to state without prior conversation memory: CURRENT PRODUCTION = 2029 (since 4.11.2026); Legacy is retired (5.11.2026) and is not a production, Preview or rollback target; TARGET ARCHITECTURE = 2029. Treating Legacy as current production is an entry-routing failure and must be reported as DRIFT. [Historical pre-cutover wording: CURRENT PRODUCTION = legacy/transitional until explicit cutover.]

OWNER CHECK: EXTEND_EX$sod_frag$,
    $sod_frag$2026 — DEPENDENCY-AWARE AUTO-RELEASE / RELEASE ADVICE · EXTEND_EXISTING]
81) AGENT OWNS RELEASE RECOMMENDATION. At completion/checkpoint, Primary Owner must tell ZURIEL what should happen operationally, not merely “waiting for תעלה”. It classifies the exact scope using the canonical release-advice states from deploy_on_request v2 and names dependencies/bundle order.
82) AUTO-RELEASE ON CLEAN STATE. For routine release scopes covered by standing authorization, once live preflight proves GATE-CLEAN + DEPENDENCIES-CLOSED + CI/GOLDEN/SECURITY CLEAN as applicable + NO OVERLAP, the Primary Owner proceeds through merge/migration/deploy/live verification without a second user prompt.
83) DEPENDENCY GRAPH BE$sod_frag$, $sod_frag$2026 — DEPENDENCY-AWARE RELEASE ADVICE · EXTEND_EXISTING · standing auto-release revoked by v18 (10.11.2026)]
81) AGENT OWNS RELEASE RECOMMENDATION. At completion/checkpoint, Primary Owner must tell ZURIEL what should happen operationally, not merely “waiting for תעלה”. It classifies the exact scope using the canonical release-advice states from deploy_on_request (active version) and names dependencies/bundle order.
82) [REVOKED by v18 · 10.11.2026] EXPLICIT APPROVAL, NO AUTO-RELEASE. A clean live preflight (GATE-CLEAN + DEPENDENCIES-CLOSED + CI/GOLDEN/SECURITY CLEAN as applicable + NO OVERLAP) makes a scope READY_FOR_APPROVAL; the Primary Owner presents the exact commit/deployment to ZURIEL and merges, applies migrations or deploys only after his explicit approval of that specific action. [Former v13 text: auto-release on clean state under standing authorization, without a second user prompt.]
83) DEPENDENCY GRAPH BE$sod_frag$,
    $sod_frag$ates can determine.
86) AUTO-RELEASE DOES NOT AUTO-CANONICALIZE. Dispatch/release standing authorization does not grant autonomous governed-truth publication, destructive irreversible changes, pricing/economics, major Legacy→2029 cutover, or other explicitly Human-Gated product decisions. Those remain separately gated.
87) USER HOLD. Explicit ZURIEL “hold/wait/do not release” for a scope creates a release hold in coordination context and overrides standing authorization until lifted.
88) AFTER MUST INCLUDE RELEASE ADVICE/RESULT. Every material AFTER includes: release_advice; dependency_state; exact branch/PR/head; merged/applied/deployed/live/verified booleans/states; blocker if any; next auto-action. Session end must leave enough information for a fresh agent to continue release choreography without asking ZURIEL what to upload.

OWNER CHECK: EXTEND_$sod_frag$, $sod_frag$ates can determine.
86) RELEASE APPROVAL DOES NOT CANONICALIZE. There is no standing release authorization (v18). Approval of a release does not grant autonomous governed-truth publication, destructive irreversible changes, pricing/economics, or other explicitly Human-Gated product decisions. Those remain separately gated.
87) USER HOLD. Explicit ZURIEL “hold/wait/do not release” for a scope creates a release hold in coordination context until lifted.
88) AFTER MUST INCLUDE RELEASE ADVICE/RESULT. Every material AFTER includes: release_advice; dependency_state; exact branch/PR/head; merged/applied/deployed/live/verified booleans/states; blocker if any; next proposed action (a merge, deploy or DB action still awaits ZURIEL's explicit approval). Session end must leave enough information for a fresh agent to continue release choreography without asking ZURIEL what to upload; approval of the action itself is still required.

OWNER CHECK: EXTEND_$sod_frag$,
    $sod_frag$law + deploy_on_request v2. No new queue/release s$sod_frag$, $sod_frag$law + deploy_on_request (active version). No new queue/release s$sod_frag$,
    $sod_frag$CONTRACT_V2.md + palette.js/designTokens.js (values), SystemFrame (frame co$sod_frag$, $sod_frag$CONTRACT_V2.md + paletteTokens2029.js/designTokens.js (values; palette.js was removed on 5.11.2026), SystemFrame (frame co$sod_frag$
  ];
  for i in 1 .. coalesce(array_length(v_ops, 1), 0) by 2 loop
    v_pos := strpos(v_txt, v_ops[i]);
    if v_pos = 0 then raise exception 'P0e %: fragment % not found', v_tgt, (i + 1) / 2; end if;
    if strpos(substr(v_txt, v_pos + 1), v_ops[i]) > 0 then raise exception 'P0e %: fragment % not unique', v_tgt, (i + 1) / 2; end if;
    v_txt := overlay(v_txt placing v_ops[i + 1] from v_pos for char_length(v_ops[i]));
  end loop;
  if md5(v_txt) <> '0ce1688c34a59353b42c2e1b53322c78' or encode(sha256(convert_to(v_txt, 'UTF8')), 'hex') <> '09a21eaba07b1301e9fdeb6991f22b36856386fbf3a163dc21872b79f8bbb130' or char_length(v_txt) <> 42309 then
    raise exception 'P0e %: rebuilt text differs from the approved literal of 10_ (md5 %)', v_tgt, md5(v_txt);
  end if;
  v_meta := v_iac.metadata || $sod_meta${"v13_auto_release": {"status": "STANDING_AUTO_RELEASE_REVOKED_2026-11-10", "human_gate": "ZURIEL 2026-09-17", "owner_check": "EXTEND_EXISTING", "superseded_by": "v18_2029_production_explicit_release", "user_hold_overrides": true, "auto_canonicalization": false, "release_advice_states": ["AUTO_RELEASE_NOW", "BUNDLE_WITH", "BLOCKED_BY", "SAFE_INDEPENDENT_WAITING_RUNTIME", "DO_NOT_RELEASE_SUPERSEDED/PARKED"], "standing_auto_release": true, "separate_taale_required": false, "dependency_order_agent_owned": true, "release_recommendation_required": true}, "v12_2029_temporary_legacy_boundary": {"status": "HISTORICAL_PRE_CUTOVER", "human_gate": "ZURIEL 2026-09-16", "owner_check": "EXTEND_EXISTING", "no_new_owner": true, "superseded_by": "v18_2029_production_explicit_release", "current_production": "LEGACY_TRANSITIONAL_UNTIL_EXPLICIT_CUTOVER", "target_architecture": "2029", "new_site_cutover_declared": false, "legacy_is_design_authority": false, "legacy_is_current_production_runtime": true, "fresh_agent_must_distinguish_current_vs_target": true}, "v18_2029_production_explicit_release": {"human_gate": "ZURIEL 2026-11-10", "owner_check": "EXTEND_EXISTING", "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.", "no_new_system": true, "legacy_retired": "2026-11-05", "label_corrected": "label read 'v16' while rule_version was 17", "production_since": "2026-11-04", "current_production": "2029", "release_advice_states": ["READY_FOR_APPROVAL", "BUNDLE_WITH", "BLOCKED_BY", "SAFE_INDEPENDENT_WAITING_RUNTIME", "DO_NOT_RELEASE_SUPERSEDED/PARKED"], "standing_auto_release": false, "release_advice_state_aliases": {"AUTO_RELEASE_NOW": "READY_FOR_APPROVAL"}, "legacy_is_current_production_runtime": false, "explicit_approval_per_merge_and_deploy": true}}$sod_meta$::jsonb;
  if md5(v_meta::text) <> 'e69f38e5bfa1e25973d6656076cc169c' then raise exception 'P0e %: rebuilt metadata differs from 10_ (md5 %)', v_tgt, md5(v_meta::text); end if;
  update public.nodes set is_active=false where id=v_iac.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$Inter-Agent Coordination v18 — 2029 Production · Explicit Release Approval$sod_lbl$, v_txt, v_meta, true, 'inter_agent_coordination_law', 18,
          v_iac.depends_on, 17, v_iac.weight, v_iac.hebrew_date, v_iac.axis_theme, v_iac.gallery_id, v_iac.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> '0ce1688c34a59353b42c2e1b53322c78' then raise exception 'P0 inter_agent_coordination_law: new description md5 mismatch'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='inter_agent_coordination_law' and is_active) <> 1 then raise exception 'P0 inter_agent_coordination_law: active version count is not 1'; end if;

  -- D. foundation_closure_protocol_law: v7 → v8 (2 fragments)
  v_tgt := 'foundation_closure_protocol_law'; v_txt := v_fcp.description;
  v_ops := array[
    $sod_frag$te ZURIEL · 17.9.2026 — STANDING AUTO-RELEASE BINDING · EXTEND_EXISTING]
AUTO-RELEASE BINDING. Once a bounded routine release scope has satisfied every applicable lower MUST, gate, dependency, current-main reconciliation, required specialist/security/privacy acceptance and release recovery condition, standing Human-Gate authorization under deploy_on_request v2 permits the Primary Owner to release without waiting for a separate “תעלה”. Gate-clean is the authorization condition.
NO-SKIP REMAINS ABSOLUTE. Standing authorization changes who triggers a clean release; it does not weaken any Foundation MUST or acceptance standard. קדימה/תעלה/auto-release never waive a blocker.
HUMAN-DECISION RESERVE. Explicit Human Gate remains for decisions that change canonical governed truth/publication where required, destructive irreversible state, paid product economics, major Legacy→2029 production cutover, material privacy/security weakening, permanent deletion/retirement of preserved history/capability, or another owner-specific Human decision.
RELEASE ADVICE. Gate closure/handoff must expose whether the scope is AUTO_RELEASE_NOW, BUNDLE_WITH, BLOCKED_B$sod_frag$, $sod_frag$te ZURIEL · 17.9.2026 — RELEASE BINDING · EXTEND_EXISTING · standing auto-release revoked by v8 (ZURIEL 10.11.2026)]
RELEASE BINDING (v8). Once a bounded release scope has satisfied every applicable lower MUST, gate, dependency, current-main reconciliation, required specialist/security/privacy acceptance and release recovery condition, it is READY_FOR_APPROVAL: the Primary Owner presents the exact commit/deployment to ZURIEL and releases only after his explicit approval of that specific action (deploy_on_request, active version). Gate-clean is a precondition, never an authorization; there is no standing release authorization.
NO-SKIP REMAINS ABSOLUTE. Explicit approval does not weaken any Foundation MUST or acceptance standard. קדימה/תעלה never waive a blocker.
HUMAN-DECISION RESERVE. Explicit Human Gate remains for decisions that change canonical governed truth/publication where required, destructive irreversible state, paid product economics, material privacy/security weakening, permanent deletion/retirement of preserved history/capability, or another owner-specific Human decision.
RELEASE ADVICE. Gate closure/handoff must expose whether the scope is READY_FOR_APPROVAL (formerly AUTO_RELEASE_NOW), BUNDLE_WITH, BLOCKED_B$sod_frag$,
    $sod_frag$law + deploy_on_request v2. No new gate system.

[$sod_frag$, $sod_frag$law + deploy_on_request (active version). No new gate system.

[$sod_frag$
  ];
  for i in 1 .. coalesce(array_length(v_ops, 1), 0) by 2 loop
    v_pos := strpos(v_txt, v_ops[i]);
    if v_pos = 0 then raise exception 'P0e %: fragment % not found', v_tgt, (i + 1) / 2; end if;
    if strpos(substr(v_txt, v_pos + 1), v_ops[i]) > 0 then raise exception 'P0e %: fragment % not unique', v_tgt, (i + 1) / 2; end if;
    v_txt := overlay(v_txt placing v_ops[i + 1] from v_pos for char_length(v_ops[i]));
  end loop;
  if md5(v_txt) <> 'eb603a65f8a4a9a58e8d4548f0663e65' or encode(sha256(convert_to(v_txt, 'UTF8')), 'hex') <> '03bd388c36ef418053874b85c8f717af024320cd8ce1badabd43a56bec104e86' or char_length(v_txt) <> 17029 then
    raise exception 'P0e %: rebuilt text differs from the approved literal of 10_ (md5 %)', v_tgt, md5(v_txt);
  end if;
  v_meta := v_fcp.metadata || $sod_meta${"command_semantics": {"taale": "explicit_approval_for_exact_presented_scope", "kadima": "within_current_gate_only", "waiver": "explicit_replan_or_supersession_only"}, "v6_auto_release_binding": {"status": "STANDING_AUTO_RELEASE_REVOKED_2026-11-10", "human_gate": "ZURIEL 2026-09-17", "owner_check": "EXTEND_EXISTING", "superseded_by": "v8_explicit_release_approval_binding", "no_skip_unchanged": true, "human_decision_reserve": true, "separate_taale_required": false, "standing_auto_release_for_gate_clean_routine_scope": true}, "v8_explicit_release_approval_binding": {"human_gate": "ZURIEL 2026-11-10", "owner_check": "EXTEND_EXISTING", "no_new_system": true, "no_skip_unchanged": true, "standing_auto_release": false, "explicit_approval_per_merge_and_deploy": true}}$sod_meta$::jsonb;
  if md5(v_meta::text) <> '6b786f67bc7613c52a5e1640982e58bb' then raise exception 'P0e %: rebuilt metadata differs from 10_ (md5 %)', v_tgt, md5(v_meta::text); end if;
  update public.nodes set is_active=false where id=v_fcp.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$Foundation Closure Protocol v8 — Bottom-Up Closure + Explicit Release Approval$sod_lbl$, v_txt, v_meta, true, 'foundation_closure_protocol_law', 8,
          v_fcp.depends_on, 7, v_fcp.weight, v_fcp.hebrew_date, v_fcp.axis_theme, v_fcp.gallery_id, v_fcp.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> 'eb603a65f8a4a9a58e8d4548f0663e65' then raise exception 'P0 foundation_closure_protocol_law: new description md5 mismatch'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='foundation_closure_protocol_law' and is_active) <> 1 then raise exception 'P0 foundation_closure_protocol_law: active version count is not 1'; end if;

  -- E. system_suggestions_law: v5 → v6 (2 fragments)
  v_tgt := 'system_suggestions_law'; v_txt := v_ssl.description;
  v_ops := array[
    $sod_frag$SystemSuggestionsTab.jsx. הרחבה עתידית: גלאי UX/$sod_frag$, $sod_frag$SystemSuggestionsTab.jsx (מסוף הניהול הישן; הוסר ב-5.11.2026, #1239). הרחבה עתידית: גלאי UX/$sod_frag$,
    $sod_frag$ks and no writer overlap under deploy_on_request v2. Major runtime/framewor$sod_frag$, $sod_frag$ks and no writer overlap, and then only with ZURIEL's explicit approval of the exact merge/deploy (deploy_on_request, active version; no standing authorization). Major runtime/framewor$sod_frag$
  ];
  for i in 1 .. coalesce(array_length(v_ops, 1), 0) by 2 loop
    v_pos := strpos(v_txt, v_ops[i]);
    if v_pos = 0 then raise exception 'P0e %: fragment % not found', v_tgt, (i + 1) / 2; end if;
    if strpos(substr(v_txt, v_pos + 1), v_ops[i]) > 0 then raise exception 'P0e %: fragment % not unique', v_tgt, (i + 1) / 2; end if;
    v_txt := overlay(v_txt placing v_ops[i + 1] from v_pos for char_length(v_ops[i]));
  end loop;
  if md5(v_txt) <> '98d4d88e16d2ec5f70dac6e5a7f98ea5' or encode(sha256(convert_to(v_txt, 'UTF8')), 'hex') <> 'b29d2c5fa2b16c5911301872bb2b0762964fe2694dd90b4e27fcce7d6c97dca2' or char_length(v_txt) <> 17885 then
    raise exception 'P0e %: rebuilt text differs from the approved literal of 10_ (md5 %)', v_tgt, md5(v_txt);
  end if;
  v_meta := v_ssl.metadata || $sod_meta${"human_gate_v6_release": {"changed": ["§19: release reuses deploy_on_request (active version) only with explicit approval", "SystemSuggestionsTab.jsx marked removed (5.11.2026, #1239)"], "human_gate": "ZURIEL 2026-11-10", "owner_check": "EXTEND_EXISTING", "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.", "no_new_system": true}}$sod_meta$::jsonb;
  if md5(v_meta::text) <> 'f4e5216a8eb44645ea0978b35161a82e' then raise exception 'P0e %: rebuilt metadata differs from 10_ (md5 %)', v_tgt, md5(v_meta::text); end if;
  update public.nodes set is_active=false where id=v_ssl.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$System Intelligence v6 — Resource-Aware Reliability + Explicit Release Approval$sod_lbl$, v_txt, v_meta, true, 'system_suggestions_law', 6,
          v_ssl.depends_on, 5, v_ssl.weight, v_ssl.hebrew_date, v_ssl.axis_theme, v_ssl.gallery_id, v_ssl.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> '98d4d88e16d2ec5f70dac6e5a7f98ea5' then raise exception 'P0 system_suggestions_law: new description md5 mismatch'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and is_active) <> 1 then raise exception 'P0 system_suggestions_law: active version count is not 1'; end if;

  -- F. project_codex #4 publishing_conventions (5 fragments)
  v_tgt := 'codex publishing_conventions'; v_txt := v_c4;
  v_ops := array[
    $sod_frag$e:
- Same Post identity in legacy and 2029.
- Source witn$sod_frag$, $sod_frag$e:
- Same Post identity across historical (WordPress/Legacy-era) records and 2029.
- Source witn$sod_frag$,
    $sod_frag$מקור כדי לכפות צבעי 2029 או שינוי של תצוגת Legacy.
9. VISUAL ACCEPTANCE: ל$sod_frag$, $sod_frag$מקור כדי לכפות צבעי 2029. (תצוגת Legacy אינה קיימת עוד מאז 5.11.2026.)
9. VISUAL ACCEPTANCE: ל$sod_frag$,
    $sod_frag$ינו מתיר פרסום אוטומטי. מכבדים את היעד שנקבע (Legacy, 2029, או אחר); הוראת פרסום אינה אישור לשינוי קוד/ענפי Preview, מיזוג, פריסה או העלאה כפולה לשתי המערכות.
2. מסלול ChatGPT בבריר$sod_frag$, $sod_frag$ינו מתיר פרסום אוטומטי. היעד הוא 2029 — המוצר הפעיל היחיד (Legacy פרש ב-5.11.2026 ואינו יעד פרסום); הוראת פרסום אינה אישור לשינוי קוד/ענפי Preview, מיזוג או פריסה.
2. מסלול ChatGPT בבריר$sod_frag$,
    $sod_frag$וגה בפועל במובייל/דפדפן וביעד שנתבקש, לרבות Legacy אם הוזכר. DB INSERT/UPDATE לבדו $sod_frag$, $sod_frag$וגה בפועל במובייל/דפדפן ב-2029. DB INSERT/UPDATE לבדו $sod_frag$,
    $sod_frag$לא לכל שערי הפרסום.

—— LEGACY MODIFIED DATE REQUIRED · 27.10.2026 · publishing_conventions operational correction ——
כש-ChatGPT מפרסם פוסט חדש ב-public.posts לצפייה ב-Legacy או כפרסום משותף, חובה להגדיר posts.modified לתאריך הפרסום (לרוב זהה ל-posts.date; בעריכה בפועל לפי updated time) כבר ב-INSERT. אין להסתפק ב-date/created_at בלבד: ה-Legacy Home fetchHomePosts בגרסה הפעילה ממיין לפי modified DESC NULLS LAST, והיעדר modified עלול להוריד פוסט חדש לתחתית ולהעלימו מ״עדכונים אחרונים״ למרות home_hidden=false. לאחר כתיבה לוודא שהפוסט נכנס ל-32 התוצאות הראשונות, אינו טיוטה/פורום/לא-בבית, ונראה בפיד; לא לשנות קוד, פריסה, P$sod_frag$, $sod_frag$לא לכל שערי הפרסום.

—— POST MODIFIED DATE REQUIRED · 27.10.2026 · re-scoped to 2029 on 10.11.2026 · publishing_conventions operational correction ——
כש-ChatGPT או כל סוכן אחר מפרסם פוסט חדש ב-public.posts, חובה להגדיר posts.modified לתאריך הפרסום (לרוב זהה ל-posts.date; בעריכה בפועל לפי updated time) כבר ב-INSERT. אין להסתפק ב-date/created_at בלבד: קוראי 2029 ממיינים לפי modified DESC NULLS LAST (getLatestPostCards ב-src/lib/supabase.js; fetchPostsCatalog2029 ו-fetchPostSearchSuggestions2029 ב-src/lib/research/postsCatalog2029Projection.js), והיעדר modified עלול להוריד פוסט חדש לתחתית הרשימות. (ב-27.10 נכתב הכלל עבור דף הבית של Legacy, fetchHomePosts, שהוסר ב-5.11.2026; הדרישה נשארת בתוקף ב-2029.) modified קובע סדר בלבד ואינו אות ל״עדכון חדש״ (SOD1820_DESIGN_CONTRACT_V2.md §8.1). לאחר כתיבה לוודא שהפוסט מופיע בראש רשימות הפוסטים של 2029, אינו טיוטה/פורום/מוסתר מהבית, ונראה בפועל; לא לשנות קוד, פריסה, P$sod_frag$
  ];
  for i in 1 .. coalesce(array_length(v_ops, 1), 0) by 2 loop
    v_pos := strpos(v_txt, v_ops[i]);
    if v_pos = 0 then raise exception 'P0e %: fragment % not found', v_tgt, (i + 1) / 2; end if;
    if strpos(substr(v_txt, v_pos + 1), v_ops[i]) > 0 then raise exception 'P0e %: fragment % not unique', v_tgt, (i + 1) / 2; end if;
    v_txt := overlay(v_txt placing v_ops[i + 1] from v_pos for char_length(v_ops[i]));
  end loop;
  if md5(v_txt) <> 'f39efab93a4d4bfa851586d4fc4259f5' or encode(sha256(convert_to(v_txt, 'UTF8')), 'hex') <> 'd98c9a71fcb4b42b0a956b35d0ae4285ab83fa675c8503e8df66a257a195994b' or char_length(v_txt) <> 72978 then
    raise exception 'P0e %: rebuilt text differs from the approved literal of 10_ (md5 %)', v_tgt, md5(v_txt);
  end if;
  update public.project_codex set body=v_txt, updated_at=now() where id=4;
  if (select md5(body) from public.project_codex where id=4) <> 'f39efab93a4d4bfa851586d4fc4259f5' then raise exception 'P0 codex publishing_conventions: new body md5 mismatch'; end if;

  -- G. project_codex #9 branches_deploy (4 fragments)
  v_tgt := 'codex branches_deploy'; v_txt := v_c9;
  v_ops := array[
    $sod_frag$
# Branches & Deploy — Live 2026-09-23

Canonical owner: `deploy_on_request v2`.
This codex is an opera$sod_frag$, $sod_frag$
# Branches & Deploy — vercel.json re-read at main 932aba4bd (11.11.2026); release policy per ZURIEL 10.11.2026

Canonical owner: `deploy_on_request` (active version).
This codex is an opera$sod_frag$,
    $sod_frag$t law.

## Production
- `main` = production.
- Merge/push to `main` may create a production Vercel deployment and must follow the release owner/gates.
- Never use production$sod_frag$, $sod_frag$t law.

## Production
- 2029 is the only active product: Production since 2026-11-04. Legacy was retired on 2026-11-05 and is not a deployment, Preview or rollback target.
- `main` is the release source, not an automatic deployment. A merge or push to `main` does not create a Production deployment: `git.deploymentEnabled=false` in both `vercel.json` roots (repository root and `public-reading-deploy`), and per CLAUDE.md the project's Ignored Build Step skips `main` builds.
- A Production deployment is a separate, manual action for an exact `main` SHA (Vercel MCP, per CLAUDE.md «נוהל פריסה ל-Production מסשן ענן»). Every merge to `main` and every Production deployment, alias change or rollback requires ZURIEL's explicit approval for that specific action. There is no standing authorization.
- Never use production$sod_frag$,
    $sod_frag$## Development branches
Live `vercel.json` currently uses `git.deploymentEnabled`:
- `gpt/g3-topic-golden-slug-rank-foundation-v1` → true (historical explicit exception)
- `gpt/*` → false
- `claude/*` → false

Therefore normal GPT/CLAUDE development branches intentionally do **not** create Vercel Preview deployments and do not consume deployment quota.

This supersedes the old operational note that `ignoreCommand` is the live non-main mechanism. Live verification on 2026-09-23 found no such active `ignoreCommand`; branch filtering is currently implemented by `git.deploymentEnabled`.

## Authorized Preview lane
Reserved branch namespace: `preview/*`.

Purpose:
- Human Visual Gate / temporary branch preview only.
- Created only when preview/release is authorized by ZURIEL or the active release owner permits it.
- Source must be an exact approved artifact head.
- If branch creation alone does not fire Vercel Git Integration, create one inert carrier/marker commit on the `preview/*` branch to produce a real push event.
- Marker must not modify application behavior.
- Verify Vercel deployment metadata before sharing:
  - Git ref starts with `preview/`;
  - source artifact is known;
  - `target=null` / Preview, never production;
  - deployment reaches `READY`;
  - requested preview route returns HTTP 200.
- Generate/share a protected Preview URL when Deployment Protection is enabled.
- Never merge/promote a preview carrier branch.
- Close/delete preview carrier after Human Visual review when no longer needed.

Why this works:
Vercel `deploymentEnabled` uses minimatch; unspecified branches default to deployment enabled. The current `gpt/*` and `claude/*` rules remain false, while `preview/*` is outside those blocked namespaces.

## F11 proof
On 2026-09-23:
- canoni$sod_frag$, $sod_frag$## Development branches
Current `vercel.json` (both roots) sets `git.deploymentEnabled: false` globally. By Vercel's semantics no branch — `main`, `gpt/*`, `claude/*`, `preview/*` or any other — creates a deployment merely by being pushed. (Live Vercel project settings were not re-read in this pass.)

Superseded, kept as history (2026-09-23): the per-branch map (`gpt/g3-topic-golden-slug-rank-foundation-v1` → true; `gpt/*` → false; `claude/*` → false) and the earlier `ignoreCommand` note no longer describe the configuration.

## Preview
A Preview deployment is created only as an explicitly approved, bounded action (CLAUDE.md rule 7: a protected Preview requires ZURIEL's explicit approval), from an exact approved artifact head, never as production (`target=null`). Verify before sharing: source artifact known; Preview target; `READY`; requested route returns HTTP 200. Generate/share a protected Preview URL when Deployment Protection is enabled. Never merge or promote a preview carrier branch.

Historical mechanism (2026-09-23): a `preview/*` carrier branch with an inert marker commit triggered Vercel Git Integration because `preview/*` was outside the blocked namespaces. With the global `deploymentEnabled: false` a push to `preview/*` no longer deploys by itself; the record below is provenance only.

## F11 proof (historical, 2026-09-23)
On 2026-09-23:
- canoni$sod_frag$,
    $sod_frag$nged.

## Safety
Do not broaden `gpt/*` or `claude/*` to true merely to get a Preview.
Use `preview/*` so development remains quota-protected and Preview creation remains an explicit, bounded action.
$sod_frag$, $sod_frag$nged.

## Safety
Do not enable Git deployments (globally or per branch) merely to get a Preview. Preview and Production creation remain explicit, bounded, approved actions.$sod_frag$
  ];
  for i in 1 .. coalesce(array_length(v_ops, 1), 0) by 2 loop
    v_pos := strpos(v_txt, v_ops[i]);
    if v_pos = 0 then raise exception 'P0e %: fragment % not found', v_tgt, (i + 1) / 2; end if;
    if strpos(substr(v_txt, v_pos + 1), v_ops[i]) > 0 then raise exception 'P0e %: fragment % not unique', v_tgt, (i + 1) / 2; end if;
    v_txt := overlay(v_txt placing v_ops[i + 1] from v_pos for char_length(v_ops[i]));
  end loop;
  if md5(v_txt) <> '8d87b8459f2fec3c25f9bf7cea443d3b' or encode(sha256(convert_to(v_txt, 'UTF8')), 'hex') <> 'e2e955afda91c3b5affc3fec6ee5aa853c019f72fb2a1dd8fd323cbed49aba9a' or char_length(v_txt) <> 3079 then
    raise exception 'P0e %: rebuilt text differs from the approved literal of 10_ (md5 %)', v_tgt, md5(v_txt);
  end if;
  update public.project_codex set body=v_txt, updated_at=now() where id=9;
  if (select md5(body) from public.project_codex where id=9) <> '8d87b8459f2fec3c25f9bf7cea443d3b' then raise exception 'P0 codex branches_deploy: new body md5 mismatch'; end if;

  -- H. final cross-check of the whole end state
  if (select count(*) from public.nodes where type='rule' and rule_id='deploy_on_request' and is_active and rule_version=4 and supersedes_version=3 and md5(description)='78d80d2264e0b5062b425319b25a3e3a' and md5(metadata::text)='4620b9f9d94ecf9c3ca603910b12691c') <> 1 then raise exception 'P0e final: deploy_on_request v4 not in place'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='deploy_on_request' and rule_version=3 and not is_active and md5(description)='f93e73ce0ad3bc66457e6ff07cdb2322') <> 1 then raise exception 'P0e final: deploy_on_request v3 not kept as inactive history'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='inter_agent_coordination_law' and is_active and rule_version=18 and supersedes_version=17 and md5(description)='0ce1688c34a59353b42c2e1b53322c78' and md5(metadata::text)='e69f38e5bfa1e25973d6656076cc169c') <> 1 then raise exception 'P0e final: inter_agent_coordination_law v18 not in place'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='inter_agent_coordination_law' and rule_version=17 and not is_active and md5(description)='02d188d1b92e32ea51907d059b18c47f') <> 1 then raise exception 'P0e final: inter_agent_coordination_law v17 not kept as inactive history'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='foundation_closure_protocol_law' and is_active and rule_version=8 and supersedes_version=7 and md5(description)='eb603a65f8a4a9a58e8d4548f0663e65' and md5(metadata::text)='6b786f67bc7613c52a5e1640982e58bb') <> 1 then raise exception 'P0e final: foundation_closure_protocol_law v8 not in place'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='foundation_closure_protocol_law' and rule_version=7 and not is_active and md5(description)='336934e50ca48dba8cb00cf64986b878') <> 1 then raise exception 'P0e final: foundation_closure_protocol_law v7 not kept as inactive history'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and is_active and rule_version=6 and supersedes_version=5 and md5(description)='98d4d88e16d2ec5f70dac6e5a7f98ea5' and md5(metadata::text)='f4e5216a8eb44645ea0978b35161a82e') <> 1 then raise exception 'P0e final: system_suggestions_law v6 not in place'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and rule_version=5 and not is_active and md5(description)='9b5c19de501b1985da01ddfc9c646d3c') <> 1 then raise exception 'P0e final: system_suggestions_law v5 not kept as inactive history'; end if;
  if (select md5(body) from public.project_codex where id=4) <> 'f39efab93a4d4bfa851586d4fc4259f5' then raise exception 'P0e final: codex publishing_conventions not in place'; end if;
  if (select md5(body) from public.project_codex where id=9) <> '8d87b8459f2fec3c25f9bf7cea443d3b' then raise exception 'P0e final: codex branches_deploy not in place'; end if;
  raise notice 'P0e applied: deploy_on_request v4, inter_agent_coordination_law v18, foundation_closure_protocol_law v8, system_suggestions_law v6, codex #4, codex #9';
end
$sod_p0e$;
