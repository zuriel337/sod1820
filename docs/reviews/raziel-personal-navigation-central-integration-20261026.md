# Raziel personal companion and navigation — central integration

Task: `RAZIEL_PERSONAL_COMPANION_AND_NAVIGATION_CENTRAL_INTEGRATION_20261026`.

## Provenance and scope

- Integration branch: `gpt/2029-central-raziel-personal-navigation-integration-20261026`.
- First parent: `cf843c2a1abbbc4d46bc96e69accba2ffef6545b` (frozen central ELS/media/World integration).
- Source: `claude/raziel-navigation-adaptation-20261026` at `7f0ac2ab6194f92fbeb2ee42c2252dbaeaa920f2`.
- Source fork: `83da5b2c6bb4f09df2ccaa7771122fd6805dea74`.
- Complete source commits: `6e609ebed58024d01339148771a76c6ea351298c`, `956416cf3ca122991dc6f5cd453ba10198f79b8d`, `7f0ac2ab6194f92fbeb2ee42c2252dbaeaa920f2`.
- One true merge, no cherry-pick. Git patch comparison found all three source patches missing; semantic review identified earlier central navigation work that had to be retained.
- Live BEFORE: `69e98e73-e8ea-4dea-923e-dfd7849db51f`, passive to ZURIEL.

## Conflict decisions

Six overlapping files were reconciled manually: the existing session Provider and request builder, shared navigation resolver, WhatsApp handler, navigation contract test and navigation browser test.

- Preserve central saved conversations, guest UX, safe actions, the single Provider/session/transport/ResearchProvider, existing Workspace and World changes.
- Add the companion action/privacy projection and abort seam to the existing Provider and transport. No new owner, store, API or engine.
- Preserve central whole-URL-token checks (reject nested foreign URLs and noncanonical number paths), newest-first WhatsApp timestamp ordering and security tests.
- Explicit World requests target `/world`. A research-map request requires verified number context and targets its existing number page; missing context asks for a number rather than guessing World.
- Preserve existing continuation/one-shot precedence and prevent private companion context or an unrelated message from supplying stale number focus.
- Keep the source adjacent-clarification numeric WhatsApp gate. Incoming captionless media also ends previous focus.
- Extend the existing saved-session projection for the new `world` intent with exact route/number validation. Existing v1 saved research-map links remain readable.
- Reject already-cancelled transport requests and ignore cancelled late quota/answer responses before global events or fallback telemetry.
- SystemFrame, App2029, ResearchProvider and `research-run` retain their central versions unchanged relative to the first parent.

## Acceptance evidence

- Focused navigation/handler/companion, saved-session and Preview selector tests: **65/65 PASS**. This includes the source's requested 44 cases plus inherited central hardening and integration coverage.
- Frozen base broad Raziel suite: **619 total, 616 PASS, 3 FAIL**.
- Candidate broad suite, same file-selection policy plus the new files: **645 total, 642 PASS, 3 FAIL; no new failure**. The three inherited failures are J current-post, J public-topic allowlist and M current-post golden. No gate is weakened or represented as entirely green.
- Built Chromium navigation acceptance: **320px and 1440px PASS**, no horizontal overflow, zero model requests for navigation, one synthetic response for an ordinary question.
- Static Preview + real service-worker Chromium acceptance: **320px and 1440px PASS**. Exact branch/SHA receipt, clarification → 73, explicit number/map/World, router clicks and one mock-only ordinary response; all off-origin traffic blocked.
- `npm run build:2029`: PASS. Existing chunk-size/dynamic-import warnings remain.
- Built graph: PASS, **411,093 eager gzip bytes; 47,649 recovered**, above the required 12,288 recovery.
- Source hard isolation, cheap hardening, My Workspace, System Frame and Legacy Production Lock: PASS.
- Personal-area presence/RTL contracts: **7/7 PASS**.
- JavaScript/TypeScript syntax checks and `git diff --check`: PASS.

Detailed command output and final hosted receipts belong to the external task evidence directory, `/workspace/artifacts/raziel-personal-navigation-integration-20261026`, not a new product data store.

## Isolated Frontend Preview

Use the existing static `preview-deploy` build, **not the repository-root deployment**. The exact new integration branch is allowlisted alongside the previous reviewed safe-actions Preview branch. Production and unapproved explicit mock branches fail closed. The identity receipt records the actual SHA and branch, `transport=mock-only`, `product_writes=false`, `edge_deploy=false`.

The existing service worker supplies clearly labelled synthetic answers; these are UI fixtures, not model or canonical-engine results. Hosted browser acceptance must inspect that identity and exercise navigation in the actual protected deployment. Test browsers intercept external reads as well, so acceptance does not forward backend/model requests. Ordinary Preview browsing can still perform the existing approved public reads; do not claim the service worker blocks all database reads.

## Limits and release boundary

- The personal companion is an explicit callable session/server seam. There is not yet a dedicated UI caller of `submitPersonalAreaCompanion`; this integration does not claim a new completed personal-area product flow.
- Cancellation prevents client-side completion, stale quota events and fallback logs. It cannot guarantee cancellation of a model already executing on a server.
- The evidence receipt is shape-checked, not a server proof of ownership/existence or engine verification. It only enables opening the approval interface, never saving or promoting a finding. The client requests `fast`; a direct request can still select the existing quota-governed `deep` mode.
- This is not authorization to deploy `wa-raziel`, `ai-analyze` or `research-run`.
- WhatsApp release remains blocked until `https://sod1820.co.il/2029/number/73` is reachable in Production and an explicitly authorized real WhatsApp Canary passes.
- No product DB/RLS/migration/site-flag changes, main merge/push, Production, domain alias, promotion or rollback.
- Preview is protected and frontend-only. Final deployment ID, identity verification and ownership release are recorded in the completion receipt after READY.
