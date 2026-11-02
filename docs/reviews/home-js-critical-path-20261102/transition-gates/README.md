# Protected artifact acceptance: concrete proposal, not activation

Task: `PUBLIC_HOME_JS_CRITICAL_PATH_20261102`; delegated BEFORE
`fd88ee41-bce1-493d-8ba5-fbb3d579e8fe`. Source base and remote product head verified
as `0d4ad83644a74abe5d990f7a628dd955fd0c638a`; remote main remains
`2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`. Evidence-only handoff
`6e9870a977f9ad28d869a6846b0b3558be8e2f6c` was read, not substituted as product.

This lane writes only this documentation directory on
`gpt/2029-home-js-transition-proposals-20261102`. The patch is **PROPOSED**, not
applied to application or deployment source. No build, test, browser, deployment,
shared configuration change, backup export or restore was performed by this lane.
Root owns implementation, validation, deployment and the combined acceptance.

## Decision and actual blockers

The existing artifact can be accepted on a protected Preview without modifying
`scripts/test-legacy-production-lock.mjs`, root `vercel.json`, `src/App.jsx`,
`CORE_PUBLIC_LAUNCH_2029`, live domains or the Production authorization. The current
user instruction authorizes progressing the transition gates and protected
Preview work. `AGENTS.md` specifically requires separate approval for changing
the **Legacy Production lock**; this patch does not do that. Its exact Preview-only
admission is within that existing scope, subject to root review and negative tests.

The older activation document described one future activation path and requested
separate guard approval. It did not implement a separate protected-review path.
The proposal here adds that narrower path; it does **not** treat that document as
permission to activate Production. Any subsequent change admitting Production,
canonical hosts, aliases, shared protection settings or a weakened Legacy guard
remains outside this proposal. Exact future cutover approval is still required.

Today the actual technical blockers are:

1. `build-public-reading-production.mjs` rejects every hosted environment, even
   Preview. `authorization.js` rejects every default handler request.
2. The document adapter accepts only canonical origins and redirects noncanonical
   aliases to the canonical site. A review host needs its own exact admission and
   must retain the canonical metadata without redirecting the review away.
3. The current canonical robots handler allows indexing after authorization.
   A protected review must instead disallow indexing while testing canonical XML.

`protected-hosted-review.proposal.patch` addresses only those boundaries in nine
files. `proposal-manifest.json` pins their original and proposed hashes. No reader,
calculation, content, model, RLS, Auth, mail server, feature policy or SW transport
is changed by the proposed patch.

## Exact proposed admission

- The ordinary local build remains dormant, with `activation.state=dormant`,
  `productionReady=false`, `deployed=false` and a null review receipt. It still
  rejects every hosted environment unless the explicit review command is used.
- The per-deployment build command must contain both `--protected-review` and
  `--review-source=FULL_CLEAN_INTEGRATED_SHA`. A branch name or environment flag
  alone cannot select or authorize it. The command pin must equal actual Git HEAD
  and Vercel's commit SHA; dirty tracked source is rejected.
- Platform identity must be the existing project
  `prj_43q7k7QFAcWnin1tcBjce5xOi7Cq`, the single integrated branch, `VERCEL=1`,
  `VERCEL_ENV=preview` and `VERCEL_TARGET_ENV=preview`. A production/custom/development
  target, missing identity, wrong project/branch/source or malformed URL fails closed.
- The compiler emits an immutable, nonsecret receipt containing exact source SHA,
  deployment ID and unique deployment hostname. Each hosted Node/Edge handler must
  match that compiled receipt against its platform identity. Canonical domains,
  branch aliases and other Preview deployments are rejected by the request-origin
  check even if they point to the same bundle. No request header/query is an unlock.
- Production admission remains impossible: `productionAuthorized=false` and the
  original Production authorization remains dormant. This review build cannot be
  promoted as a tested Production release; any future release requires its own
  exact activation/configuration delta and acceptance.
- `canonical`, `og:url`, JSON-LD and XML retain the existing canonical public URL
  policy, including old Post addresses. Documents get `noindex,nofollow,noarchive`;
  review robots disallows all and does not advertise a review sitemap. XML remains
  inspectable behind protection with canonical URLs and an explicit noindex header.

The generated authority module is private build input, not a public API or a new
feature-switch store. It belongs beside the existing generated HTML. It is null
on a dormant build, must be included by file tracing in **every** relevant Node/Edge
function, and must not be reused from a previous build. Build before importing the
artifact handler tests: their new static generated-module import deliberately has
no permissive missing-file fallback. Tests must verify that a missing/bad artifact
fails closed rather than replacing it with environment-only authorization.

## Hosting operation prepared for root

Use `protected-review-deployment.request.json` only after replacing both
`FROZEN_REVIEW_SHA` occurrences with the same final clean, tested, remote source SHA.
The request pins Git `sha`, does not use latest-branch mode, and overrides build/root
settings **for this deployment**, not the project's shared settings. The patch
removes only the nested artifact config's fixed `buildCommand`, so it cannot
shadow this deployment-scoped pinned command; its package build script and all
redirects/headers remain unchanged. Do not call
`update_project`, an environment-update tool, promotion, rollback or alias tools.

The request intentionally omits `target` and `customEnvironmentSlugOrId`: current
Vercel create-deployment documentation makes omission Preview; explicit `staging`
can assign a staging alias. Do not substitute `production`, `--prod`, `staging`,
`withLatestCommit:true` or fake/clear system variables. The connector's create schema
does not expose `autoAssignCustomDomains`; do not invent an argument or claim it was
set. Before creation, inspect existing project/domain associations and stop if this
Preview could move a custom/Production domain. Record and compare canonical aliases
afterward; the protected review uses only its unique immutable deployment URL.

Read-only project inspection on 2026-11-02 found SSO protection enabled with
`deploymentType=all_except_custom_domains`; no protection was changed. Reverify
immediately before deployment and test unauthenticated denial afterward. Application
identity checks do not prove Vercel SSO protection. If protection or any required
system identity is unavailable, stop; do not widen a regex or permit public hosting.

The documented system variables are available at build and runtime. The Vercel
documentation also qualifies `VERCEL_URL` use with Standard Protection: exact
hosted behavior is an acceptance dependency, not assumed proof. Missing Git metadata,
missing `.git`, a mismatching custom environment or missing Node/Edge file tracing
must be reported as a hosting blocker, not worked around by substituting an env SHA.

## State and handoff

| Gate | Evidence / next action |
|---|---|
| Exact 0d4 A3 / Isolation / G4 | Already accepted in the prior handoff; no repeat for this proposal and no claim of backup recovery |
| Protected hosted artifact | Concrete patch/payload/test/rollback documents prepared; implementation and all validation still pending |
| Canonical Production activation | Still dormant and separately gated; no cutover request is ready |
| Real DB and media recovery | Actual dated sets and approved destination remain unidentified; see `BACKUP-ACCESS.md` |
| Actual admin use / mail | Prior limitations remain; no real login, subscription, unsubscribe or mail test by this lane |

The final user request should contain only the missing metadata/target access in
`BACKUP-ACCESS.md`. A new blanket Production or guard approval is not requested for
this Preview-only proposal. If implementation discovers a genuine change to the
Legacy lock or shared settings, root must first produce that exact separate delta.

References: [prior acceptance](../../doc37-alignment-20261102/ACCEPTANCE.md) on
evidence SHA `6e9870a`; [existing production artifact](../../public-launch-closure-20261102/production/README.md);
[activation and rollback](../../public-launch-closure-20261102/production/ACTIVATION-AND-ROLLBACK.md);
[Vercel system variables](https://vercel.com/docs/environment-variables/system-environment-variables);
[create-deployment API](https://vercel.com/docs/rest-api/deployments/create-a-new-deployment).
