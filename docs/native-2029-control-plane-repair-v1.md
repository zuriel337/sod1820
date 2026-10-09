# Native 2029 Control Plane repair — branch evidence and next slices

Task: `SOD1820_NATIVE_2029_CONTROL_PLANE_REPAIR_V1`. Actor: existing GPT.
Owner: Experience Governance v8 → existing System Frame / Design V2.
Verdict: **EXTEND_EXISTING**. 2029 is the sole management destination.
Base: `45315ef269fd1aef7eadb8b5ca445839e435390f`, verified through GitHub
and a successful `git fetch origin --prune` after environment permissions were repaired.
The configured proxy was retained; no network protection was bypassed.

## Focused repair

`App2029` mounts `ControlPlane2029Page` at `/2029/control`. The page passes
its surface to the existing `Sod2029Shell` compatibility export, which resolves
to the single `SystemFrame2029` implementation. That frame calls
`resolveExperienceContext`. The page previously passed `admin`, which the
resolver did not recognize, and crashed before operational effects could mount.

The existing `EXPERIENCE_SURFACE` and surface defaults now carry `ADMIN`.
Its internal operational projection is quiet, static by default, capped at S1,
without voice or spatial audio. The page consumes the shared constant.
Unknown surfaces still throw. The auth/profile gate and four admin RPCs are
unchanged. No new registry, store, management owner or fallback surface exists.
`SystemFrame2029` and `App2029` need no bypass or source modification.

## Runtime acceptance and its limits

`tests/control-plane-2029.spec.cjs` mounts the actual App2029/AuthProvider/page/
frame/resolver. It has two explicit transport modes:

- CI: synthetic HTTP responses, with all production/external requests blocked.
  It tests admin rendering, real DOM refresh and trace selection, three presets
  at 1440/390/320px, RTL/overflow/touch targets, ordinary/anonymous denial,
  monitoring failure and empty traces. These are runtime integration checks,
  not proof of real backend authorization.
- Disposable child: real GoTrue password-login sessions, profile lookup and
  PostgREST RPC responses on existing `krnaxxndgtrdnaddlzws`. No API/module/role
  mocks. Production and other external hosts are blocked. The same admin matrix
  runs, and ordinary/anonymous direct calls to all four admin readers must fail
  without returning the synthetic trace material. Existing guards can return
  either 401/403 or HTTP 400 with the specific `P0001` forbidden exception;
  an arbitrary HTTP 400 does not satisfy the assertion.

The native test failed on the unfixed main-derived build (Control Plane heading
absent after the resolver failure). Thus the new CI gate detects the original
integration regression that the old static suite missed. The first real run
passed all nine admin combinations but exposed an overly narrow test expectation
for the existing SQL denial's HTTP status. The expectation was corrected to check
the actual authorization exception; product permissions were not changed.

Final suite results and preview are recorded below after verification. The build
uses `npm ci` and the committed lockfile. Browser tooling and all passwords/JWTs
remain outside Git. Screenshots contain only synthetic stage content.

This is not F01/F02 acceptance, historical migration replay certification, a
production admin session test, or G4 closure. The predecessor's 37 security checks
are not rerun or claimed here. The child remains the existing schema replica;
its historical replay limitation remains with the original Foundation owner.

## Management capability map

This bounded map checks current native route/client wiring, existing components,
and the live canonical function/table catalogs. **Infrastructure present** does
not mean its future management action has passed role/privacy acceptance.
Legacy components are implementation evidence, not destination UI to extend.

| Capability | Classification | Existing owner and implementation to consume | Native gap / constraint |
|---|---|---|---|
| Admin route gate, health, AI cost, storage egress, video map, refresh, root traces and spans | Exists and works in 2029 after this repair, verified on the disposable child | `AuthProvider`; `visits.js`: `admin_system_health`, `admin_video_map_health`, `admin_op_trace_list_v1`, `admin_op_trace_v1`; Traffic/System Operations | Production release and exact deployment acceptance remain separate |
| Current work log, history, status/archive and assignment/task provenance | Infrastructure present; native management UI missing | Work-log Authority v2 / Coordination v13; `work_log_current`, `work_log`; `get_work_log_current`, `admin_worklog_update`, `admin_worklog_archive_done`; existing assignment/dispatch fields | Do not connect legacy `get_work_log`. History and security-dependent management wait for original F01/F02 closure and their own browser acceptance |
| User directory and authorized user detail | Infrastructure present; native admin UI missing | Person v6 / Access v5; `users`, `profiles`, `admin_users_overview`, `admin_user_journey`; existing `getUsersOverview` / `getUserJourney` | Private email/phone/journey data must stay inside the authorized admin projection |
| Dedicated governed role-change action | Missing from the inspected native route/client and live admin role/permission endpoint catalog | Extend existing Person/Access authorization owners | No dedicated `admin_*role/permission` endpoint was found. Do not invent a parallel permission store or expose direct role edits; establish a scoped reviewed action and acceptance first |
| Posts: drafts, editing, revisions and publication | Infrastructure present; native management UI missing. Native reading exists | Existing publishing conventions; `posts`, `post_revisions`; `admin_save_post`, `admin_restore_post_revision`; existing shared adapters; native `Posts2029Page` / `Post2029Page` | Reproject the existing capabilities in 2029, preserve draft/publication/source distinction and explicit Human Gate. Do not import Legacy editor presentation |
| Media intake, existing objects, placement and delivery | Infrastructure present; native admin intake/curation UI missing. Native health exists | Existing Storage/media owners; `gallery_images`, Storage; repository `media-upload-intent`, `mediaResumableUpload.js`, media queue; existing edit/curation adapters | Reuse intent/signed upload/resume and provenance. Storage capabilities depending on F02 stay blocked; no new bucket/asset registry or client thumbnail generation |
| Research objects, findings, evidence and candidate review | Infrastructure present; native admin review UI missing. Native research/read projections exist | Research Workspace v5 / Intake v13 / Truth v3; `research_objects`, `research_items`, Universal Finding adapters; `admin_research_map`, `admin_convergence_candidates`, `admin_candidate_decide`, relation-evidence readers | Verification, canonicalization and publication remain distinct; no automatic approval/canonicalization |
| Alerts, operational suggestions and notification destinations | Infrastructure present; native admin action/settings UI missing | System Suggestions v5; `system_suggestions`; `admin_suggestions_list`, `admin_suggestion_decide`, `admin_notify_get`, `admin_notify_set`, `admin_fire_watchman`; existing adapters | Read aggregate state first; reviewed mutations later. Existing stale-sensor/UNKNOWN billing semantics remain honest |
| System/capability settings | Infrastructure present; native governed settings UI missing | Existing `nodes` settings, `site_flags`, Site Flags v3 and domain settings owners; shared readers | Browser admin is not service-role. No generic arbitrary settings writer or permission weakening; expose only owner-approved bounded commands |

No core management domain above needs a second Store/Registry/System.
The missing role-change action is a bounded implementation gap inside existing
authorization ownership, not a new domain.

## Sequenced connection plan — not implemented in this repair

1. **Release the focused runtime repair separately** after the appropriate exact-SHA
   release gate. Keep the native admin route internal/noindex and outside public
   navigation. Verify the deployed admin session separately from stage/CI.
2. **Native read-only management projections:** user directory/detail, research
   candidates/evidence, alerts/suggestions and a settings summary, composed in the
   existing Control Plane over reviewed existing readers. Each is its own bounded
   branch and three-role/native/mobile/preset acceptance, not one large transplant.
3. **Work-log/task projection:** only after the original F01/F02 security owner
   closes the relevant gate. Start with the protected current reader and existing
   provenance/status semantics. History, archive and assignment operations need
   explicit authorization and replay/denial tests. Never use the unsafe old RPC
   merely because it already exists.
4. **Posts/publication and media management:** reuse existing canonical adapters,
   revision history, identity, upload intent/resume and publication Human Gate.
   Land editing and publication as separate slices. F02-dependent media operations
   wait for security closure. Verify that drafts/private media do not enter public
   projections.
5. **Governed mutations and settings:** review existing role/entitlement ownership
   and missing bounded role-change command; then expose approved suggestion,
   notification and settings operations with denial/audit/rollback acceptance.
   No arbitrary table editor, automatic role promotion or new coordination layer.

F01/F02, PR #999 and G1 retain their original writers and are untouched. No merge,
main push, production deployment, product-schema or production-permission change
is part of this branch.

## Verified final evidence

- `npm ci` + `npm run build`: PASS (both independent Legacy/2029 build graphs).
  Existing bundle-size/dynamic-import warnings remain; no build failure.
- `test:experience-context`, native Control Plane contract, System Frame,
  canonical wiring, operational trace contract/runtime, Web Vitals core/wiring,
  source isolation and built dependency graph: PASS.
- Native built-runtime HTTP-fixture acceptance: **13/13 PASS**, no skips.
- Native real GoTrue/PostgREST acceptance on the existing child: **11/11 PASS**,
  no skips; nine admin viewport/preset combinations plus ordinary/anonymous
  route and direct-backend denial. Monitoring/refresh/trace readers return HTTP
  200 for admin. No production/private source data is used.
- Machine-readable sanitized evidence:
  [native-2029-control-plane-acceptance.json](native-2029-control-plane-acceptance.json).
- Browser regression is enforced by the existing 2029 Isolation Gate workflow.
- Draft PR / exact preview verification: recorded in the task AFTER once the
  branch has been pushed. No production release is authorized by these results.
