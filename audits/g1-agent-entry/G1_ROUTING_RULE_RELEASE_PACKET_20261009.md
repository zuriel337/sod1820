# G1 routing rule release preparation — 2026-10-09

**PREPARED / BRANCH ONLY / NOT APPLIED / G1 NOT CLOSED.**

Existing task: `SOD1820_PRO_SESSION_2_G1_ROUTING_ACCEPTANCE_V1`.
Existing branch: `gpt/g1-routing-acceptance-oct08-v1`; Draft PR: [#1006](https://github.com/zuriel337/sod1820/pull/1006).
This is a finite release packet for two existing owners, not a new contract, law, router, registry, runtime or startup document.
These audit snapshots are review evidence only and must not become normal agent entry authority.

## Verified baseline and branch synchronization

- Canonical Supabase: `linswmnnkjxvweumprav`; general Supabase connector, bounded read-only startup.
- Active selector: `nodes.type='rule' AND nodes.is_active=true`. `rules_active` alone includes historical rows.
- Verified main: `45315ef269fd1aef7eadb8b5ca445839e435390f`.
- Original G1 head: `92dd7c134d15be7ca5e11164befebeb94ab321a2`; 7 ahead / 37 behind main before synchronization.
- Synchronization commit: `8c066e9178339a2c7c66251b7d7fb53f05ebb71a`; parents are original G1 head and verified main. The branch has **0 behind** that main.
- Shell Git transport still fails to reach configured proxy:8080. Synchronization uses the authorized GitHub Git-data connector: complete main tree + original G1's three paths. Both modified documents on main matched the merge-base blobs, so no conflicting main edits were discarded. The existing smoke script was branch-only.
- Main `AGENTS.md` blob `2bbfca4eb06329c88e98b3bebf2266881087459c` was verified unchanged. `CLAUDE.md` and active Design V2 are preserved unchanged.
- Claim: `51d2490a-d3bb-4d8d-8e0a-f2b36b82b09f`, GPT is sole branch-preparation builder. Relevant Control Plane AFTER/ACK showed no overlapping active writer. This scope excludes all Control Plane/World runtime files, F01/F02 and live rule edits. Rescan before any continuation.

## Exact successor packet

[`G1_ROUTING_RULE_SUCCESSORS_20261009.json`](G1_ROUTING_RULE_SUCCESSORS_20261009.json) contains full source rows, complete proposed successors, exact clause substitutions, source/candidate SHA-256 values and application requirements.
Proposed v3/v9 are **not allocated or active**. Stop and reprepare if either source row, active family or version availability changes.
Candidates have `is_active=false`, omit source IDs/timestamps, retain lineage and original metadata, and add preparation provenance with `human_gate_approval=null`. Inherited predecessor approval metadata is history, never approval of these successors.

### A. live_state_resolution_law v2 → proposed v3

Only the final obsolete session-entry paragraph changes. All preceding live verification and schema-before-write clauses remain byte-identical. Label, dependency fields and original metadata stay unchanged.

**Before**

> זהו חוק-ליבה מקביל ל-agent_onboarding_law: הוא לא מחליף את קריאת ה-nodes/project_codex/work_log בתחילת סשן, אלא קובע שכל טענת-מצב שהם מספקים דורשת אימות חי לפני שמשתמשים בה כבסיס לפעולה.

**After**

> כניסת סוכן לסשן/משימה מתבצעת לפי הגרסה הפעילה הנוכחית של inter_agent_coordination_law: LIVE-FIRST ו-OWNER-FIRST; ניתוב לבעל האחריות הקנוני, קריאת בעל האחריות והתלויות הישירות המינימליות הנדרשות בלבד, וקריאת work_log_current הרלוונטי למשימה ולתיאום בין סוכנים. אין חובת קריאה גורפת של כל החוקים ב-nodes או כל מסמכי project_codex בתחילת סשן. כל טענת-מצב עדיין דורשת אימות חי במקור הרלוונטי לפני שימוש כבסיס לפעולה; כל DB WRITE עדיין מחייב אימות סכמה חיה ותיאום/תיעוד ב-work_log לפני הכתיבה, ודיווח DRIFT נשאר חובה. agent_onboarding_law ההיסטורי אינו מופעל מחדש.

### B. experience_governance_foundation_v1_law v8 → proposed v9

Only one 2029 web visual dependency in the body changes; version and label follow successor lineage. The remainder of the full Experience body is byte-identical, including contextual voice, shared projection, sidecar/spatial stage, source/time/truth semantics and protected artwork. Existing `depends_on` and original metadata remain unchanged.

**Before**

`Dependencies: SOD1820_DESIGN_CONTRACT_V1.md,`

**After**

`Dependencies: SOD1820_DESIGN_CONTRACT_V2.md (active 2029 web visual contract; V1 remains historical/Legacy provenance and all Brand Core protections remain in force),`

`agent_onboarding_law v1` remains inactive and untouched.
`sod1820_canonical_identity_law v5` and `logo_integrity_law v3` remain unchanged, including protected V1 Brand Core provenance. Do not bulk-replace their V1 references.
The owner-index Experience row still correctly says **v8 ACTIVE** today; change it to the actually applied successor only as part of the separately approved live/code-pointer choreography.

## Routing checks and permissions

[`G1_ROUTING_LIVE_BASELINE_20261009.json`](G1_ROUTING_LIVE_BASELINE_20261009.json) records scoped live rule IDs/versions/declared dependencies, immutable main blobs, codex identity/timestamps and a registered public method.
[`G1_ROUTING_ENTRY_CASES_20261009.json`](G1_ROUTING_ENTRY_CASES_20261009.json) carries four natural-language cases, required owners, captured versions, declared direct dependencies, conditional reads, permission boundaries and eight pending real replays.
The files are fixtures for verification, **not** an implementation of AI routing or an authorization source.

| Entry task | Semantic owner(s) verified | Current baseline / key direct dependencies | Permission boundary |
|---|---|---|---|
| World / 2029 UX | Experience + Reality | Experience v8, Reality v8, Design V2, canonical UI v7; declared Experience dependencies captured; frame/Research Context only as task needs | Read/propose; implementation needs isolated scope and sole writer. No DB, publication or release grant |
| Post + image | `project_codex.publishing_conventions` + visual Experience | Codex id 4 / updated_at; Experience v8, Design V2, identity v5, logo v3, voice/Truth; legacy protocol only for actual legacy maintenance | Draft permission is not save/publish permission; schema/owner/Human Gate for later writes |
| Gematria research | `project_codex.gematria_engine` + engine/Registry | Codex id 5 / updated_at; engine v2, Registry v6; Engine's declared Intake/Strategy/Truth dependencies; registered רגיל v1 / `fn_ragil`, public entitlement | Registered deterministic computation is allowed where execution entitlement permits; no method mutation/save/canonicalization/publication inferred |
| Release readiness | Foundation + deploy + Coordination | Foundation v7, deploy v3, Coordination v13 → current Live State v2; affected acceptance/security evidence on demand | Read-only assessment; explicit user hold prevents merge, live law apply and production deploy |

Codex records do not have a synthetic `rule_version`: identify them by slug/id/updated_at and resolve referenced active laws live.
Direct dependency **IDs and versions** are checked; dependency **bodies** are loaded only when they can change the task decision. Do not recursively load the whole tree.

Known additional pointer DRIFT: `project_codex.gematria_engine` still mentions Registry v5, while active `canonical_methods_registry_law` is v6. Routing checks resolve v6 and reject v5 as current authority. The unrelated codex body is not rewritten in this G1 packet. This must also be disclosed during real replay.

## Executed verification

Run from repository root:

```bash
node --test scripts/test-g1-agent-routing-smoke.mjs
node scripts/test-g1-agent-routing-smoke.mjs
```

The five original tests are retained. The extended suite checks the exact two candidate changes, unchanged fields/metadata/Brand history, immutable main adapters, all four route expectations with active versions and declared direct dependencies/permission boundaries, and rejection of inactive/duplicate/stale owners. The real-session evidence records must remain pending.

Validation uses an isolated copy of the exact GitHub-synchronized documentation inputs plus the new packet/test files, Node v24.19.0, no package install. Direct invocation reports named assertions; this environment's `node --test` reports an aggregate file result.
No product runtime file changed, so no full product build or Control Plane/browser/security acceptance is claimed.
Live predecessor rows were re-read after preparation and compared in full to the captured sources. No live successor was inserted or activated.

## Controlled application and real GPT/Claude acceptance — NOT EXECUTED

1. Main reviewer independently reviews the exact packet, SHA, tests, sole writer and dependency/release hold. Claude specialist challenge remains useful for the new clause semantics and is required if the authorized release owner identifies a contract/release risk; previous static review is not a review of this new packet. No specialist dispatch/receipt is claimed.
2. Obtain explicit approval for **exact live rule successors**. Reverify live schema/constraints, predecessor full-row hashes/versions, available successor versions and absence of overlapping G1/Experience-law writers. P0/Control Plane scope owners retain their tasks.
3. The existing authorized live rule owner performs one reviewed atomic version transition: new IDs/timestamps; preserve old rows; deactivate only the exact predecessor IDs; activate exactly one successor/family; preserve all unrelated fields. No onboarding or Brand owner updates. Use new metadata approval for the actual approval, never the predecessor's inherited approval.
4. Verify exact applied bodies/metadata/lineage and unchanged protected owners. Record actual applied IDs/versions in `work_log`. Release the synchronized code pointers through the separate authorized code gate, including actual active Experience version in Owner Index. No merge/deploy authorization is provided by this packet.
5. Run **eight independent cold-entry sessions**: GPT and Claude × World/UX, post/image, Gematria, release. Provide only each natural-language prompt and standard entry adapters; do not seed the expected-route fixture as hints. The agent must actually read canonical owners, active versions, necessary dependencies, relevant work_log and proper live sources, resolve grants/holds, and report DRIFT.
6. Save session IDs, actual read traces/path/slug/rule/version/SHA/time/reason, permission outcome, explicit roles, no-overlap result and verified AFTER receipts in existing `work_log`. Bulk system scans or fabricated tool evidence fail. Static tests do not prove model behavior.
7. Main reviewer decides G1 closure only after actual successor application + pointer release + eight real replay results. **Preparation complete does not mean G1 closed.**

No apply script is registered as a Supabase migration, no live rule changed, and no release automation/parallel coordination mechanism was created.
