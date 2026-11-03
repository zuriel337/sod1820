# Proposed staged Production-target review — no application or deployment

**Current continuation:** the proposal patch is rebased over the same candidate's stable-preview Auth seam and existing-origin allowlist. The five affected isolated stage tests passed again; no stage guard was applied. The immutable exact deployment remains the stage boundary; its Preview-only Auth alias does not become an approved Production origin. Files in this folder are permanent; older /tmp references below describe the historical review. See `proposed-files.json` and `../../../four-completions.md`.

Status: **PROPOSAL_ONLY / NOT_APPLIED / NO_DEPLOYMENT_AUTHORIZATION**.
Base read: `957e4a6a7148f20cadd921303d8c9a86a8b6a7b5`, branch `gpt/2029-public-cutover-final-preparation-20261103`.

## Decision

Configuration alone is sufficient to keep reviewing the already supported **Preview-target production-config artifact** on its admitted branch. It is **not sufficient for an actual Production-target build**: current review admission requires `VERCEL_ENV=preview`, `VERCEL_TARGET_ENV=preview` and the exact existing Preview branch. A Production target is rejected before useful hosted operation. Faking those platform variables or switching the standard integrated-preview builder is not an acceptable workaround.

The attached narrow change adds a separately selected **staged Production-target review mode** under the existing artifact owner. It does not implement or approve public cutover. The existing dormant deployment-policy remains untouched, as do the Legacy build gate, Legacy root configuration, shared flags, routes, model/billing policy, and domains.

## Exact proposed files

- `/tmp/finalprep-production-review.proposal.patch` changes only:
  - `public-reading-deploy/review-admission.js`;
  - `public-reading-deploy/authorization.js` (clarifies the existing review authority; no independent policy/store);
  - `scripts/build-public-reading-production.mjs`.
- `/tmp/finalprep-production-review-tests.proposal.patch` adds the proposed focused `test/public-reading-production-review.test.mjs` without modifying/removing existing tests.
- Proposed file copies and SHA256 fingerprints: `/tmp/finalprep-production-review-proposal/manifest.json`.
- Read-only platform evidence: `/tmp/finalprep-production-review-vercel-evidence.json`.

The future explicit build command is:

```text
node scripts/build-public-reading-production.mjs --protected-production-review --review-source=<exact-final-40-character-SHA>
```

This is a **build command description, not deployment authorization or a command run in this review**. The future source must include the reviewed patch and all final product fixes;957 is the proposal baseline, not the eventual modified source SHA.

Admission requires all of:

- actual Vercel Production target and environment, exact existing project;
- exact proposed preparation branch, not main or an arbitrary ref;
- Git HEAD equals the requested40-character SHA and platform SHA;
- no application-source changes, with only the existing fully compared nested-config materialization exception;
- actual immutable deployment ID and unique deployment hostname;
- generated runtime receipt matches every one of those platform values.

Default/local builds remain dormant. Existing Preview mode remains Preview-only. No environment flag, request, query/header or shared site flag can manufacture a generated review receipt.

Staged receipt explicitly keeps `productionAuthorized=false`, `indexingAuthorized=false`, `cutoverAuthorized=false`, `domainAssignmentAuthorized=false`, and artifact `productionReady=false`. Here `productionAuthorized` retains the existing meaning of public activation; `target=production` records the actual platform build target. Current document/API origin checks accept only the exact immutable review origin; canonical domains remain rejected. Documents/XML stay noindex; robots disallows crawling. This is still a protected review, never an indexable public release.

The proposal **does not implement the later cutover gate**. Promoting this review artifact alone would still leave canonical requests rejected/noindex. An exact cutover decision and the corresponding reviewed activation delta remain separate. Do not promise that a Preview promotion preserves the build: Vercel documents that promoting Preview creates a new Production deployment.

## Actual Vercel capability, not an assumed option

Official documentation confirms **`vercel deploy --prod --skip-domain`** creates a staged Production deployment without sending the domain's traffic to it. The current public CLI source maps `--skip-domain` to `autoAssignCustomDomains=false`. These are documentation/source observations only; no CLI deployment was executed.

However:

1. The connected `vercel_create_deployment` tool's current request schema exposes **neither** `skip-domain` **nor** `autoAssignCustomDomains`. Do not pass an unsupported field, rely on an omitted value, or treat `skipAutoDetectionConfirmation` as domain control.
2. The REST create-deployment documentation's `autoAssignCustomDomains` occurrence is in its **response** schema; it does not prove that the current connector accepts that request field.
3. `vercel` is not currently on this workspace's PATH. No credentials were read or requested. A later authenticated CLI path must use the existing approved credential channel without exposing environment/token values.
4. This builder needs a real Git checkout and real platform Git/SHA/deployment identity. CLI local-file upload can differ from the existing connected-Git deployment path. Its compatibility has not been demonstrated; never copy `.git`, fake VERCEL variables, waive dirty checks, or claim successful prebuilt parity to get around it.
5. The connected project read returns SSO `all_except_custom_domains`, but **does not return current auto-assignment configuration**. The old lock document's “disabled” assertion is historical and not current proof.
6. An application build receipt cannot prove that Vercel did not move aliases. That is a separate deployment-control verification, using the actual supported platform mechanism and before/after observations of all three canonical entries.

Therefore **staged Production creation remains blocked under the current connected invocation path**, even if this code proposal is later approved. First verify an authenticated supported creation path that both preserves exact Git/platform identity and explicitly suppresses domain assignment. Do not discover those semantics by creating an unapproved Production deployment. A protected Preview-target artifact remains the supported review fallback meanwhile.

Read-only canonical lookup at review time still resolved `sod1820.co.il` to Legacy:
`dpl_BFpwZGiYL3Qpdy9nCuGKGb9Xmko2`, SHA `d1837efcf5a978d10a514010f3695680f231e116`, targetProduction/READY. This fresh observation supersedes older deployment numbers only as evidence, not as a change to the guard. Verification of all three canonical aliases and live rollback target remains mandatory immediately before any separately authorized future action.

## Proposed negative acceptance

The new test proposal keeps all existing tests and adds:

- ActualProduction-shaped values fail in default Preview mode; explicit stage mode has all public/cutover/indexing/domain permissionsfalse.
- Missing/wrong platform fields, wrong project/ref/SHA, main, dirty application files and copied deployment/host fail closed.
- Invalid/combined/duplicate modes or missing/duplicate pins reject before compilation.
- Canonical/root aliases, arbitrary hosts and manipulated target/mode/receipt flags cannot enable stage access.
- Nested-config exception still rejects changed content, staged changes, additional files, symlinks/mode changes and mismatched targets.
- With synthetic isolated identity only, actual document/robots/XML adapters accept the immutable review origin, deny canonical origins before source reads, retain noindex/disallow and preserve the existing product document.

Run later, after approval/application, using existing focused review/admission/artifact tests plus this new file. Do not claim the proposed suite passed: **only `node --check` on proposed JavaScript and `git apply --check` on both patches were run here**. No build, browser/performance rerun or shared mutation occurred.

The Legacy gate file's SHA256 is unchanged:
`edb822d3da9a957997ab85f2e0a8b757cec916bcc8768587fec22b7040dd478e`.
Both existing gates (`test-legacy-production-lock.mjs`, `test-one-tree-content-contract.mjs`) remain called by the builder; no assertion is weakened or skipped.

## Approval boundary and return

AGENTS.md separately requires explicit approval for changing a production guard and explicit **2029 Production cutover + exact SHA + exact deployment ID** for moving the site. Neither exists for this proposal. A later staging authorization must explicitly permit Production-target creation without alias/domain assignment after the safe mechanism is verified; it must not be inferred from Preview/build approval.

Proposal rollback before deployment is removal of the narrow source delta. A failed staged build does not justify touching Legacy aliases, deleting data or changing shared service settings. Existing Legacy remains the website. Site rollback and DB/media recovery are different operations; this proposal performs neither.

Sources:
- Existing AGENTS.md:3–13; deployment-policy/review-admission/authorization and public-reading builder/handlers/tests at the pinned base.
- https://vercel.com/docs/cli/deploying-from-cli
- https://vercel.com/docs/cli/promote
- https://vercel.com/docs/rest-api/deployments/create-a-new-deployment
- Current connected tool schemas and read-only project/deployment metadata.

## Root integration validation

The root tested the rebased proposal in a separate copied fixture: **5/5 passed**, including actual document/robots/XML adapters with synthetic platform identity only. Initial copy lacked tracked adapter dependencies; these were supplied before the passing run. The source proposal remains un-applied to the product checkout. Preview admission itself was rebound only to the new isolated preparation branch, with all exact identity/Production-denial checks retained. The earlier “syntax only” statements above describe the read-only review stage. See `isolated-proposal-tests.txt` for the final root receipt. No deployment, domain or shared change was performed by these tests.
