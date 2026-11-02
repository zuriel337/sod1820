# Required validation and rollback for protected artifact review

Status: **test plan, not tests run**. Do not run builds or browsers during the
exclusive Home performance window. Root schedules these after that window.

## Before a hosted review

1. Recheck relevant ownership and the exact remote product head. Apply only the
   scoped patch after root review. Preserve unrelated Home optimization changes.
   Rebase the proposal by content if its nine source hashes changed; do not
   wholesale replace a newer file. Commit the integrated result, obtain the exact
   clean SHA, and pin it in the per-deployment command and Git-source request.
2. Extend the existing artifact test suite; do not replace its dormant/default,
   canonical URL, metadata, transport, unsubscribe or worker-lifecycle assertions.
   Unit-test the pure review admission function using **synthetic** platform values:

   | Input | Required result |
   |---|---|
   | Exact clean source/project/branch/Preview identity | Receipt pins SHA, deployment ID, unique host; Production/indexing false |
   | Missing mode or missing/duplicate/empty source pin | Reject before compilation |
   | Local/no Vercel, production, development or custom target | Reject review build |
   | Missing/wrong project, branch, SHA or dirty tracked source | Reject |
   | Canonical domain, branch alias, foreign Vercel host, port, URL path or malformed host | Reject |
   | Null/malformed/missing generated receipt | No hosted admission; no fallback to env-only activation |
   | Different runtime SHA/deployment/host/project/branch | Reject |
   | Query/header/cookie claims `approved`, `production` or a different SHA | No effect |
   | Valid review runtime request carrying canonical Host | HTTP 421; never document/redirect/data |
   | Ordinary local build after a review build | Writes null receipt and restores fully dormant default |

3. Use a separate fixture process per generated identity to avoid import-cache
   contamination. Test the real document, robots, XML and card adapters on a
   synthetic review identity. Existing canonical-mode tests continue under a
   default dormant build with their explicit local injection seam.

   - Every HTML status (200/404/503) and HEAD has no-store/noindex; only a public
     missing item is 404 and a source failure remains 503.
   - Historical root slugs, encoded slugs, native `/post`, `/?p=`, repeated/encoded
     query parameters, user `path` parameter and fragment return retain ownership.
     Review requests never get redirected to Production just because of their host.
   - Canonical/OG/JSON-LD/XML still use `https://sod1820.co.il` and the existing old/new
     Post policy; no invented Preview canonical and no self-indexing review URL.
   - Review robots: HTTP 200, Disallow `/`, no advertised sitemap. Inspectable XML
     retains canonical `<loc>` values and explicit noindex, excludes private,
     expired or missing source occurrences using the already accepted public reader.
   - Canonical and foreign Host/X-Forwarded-Host/proto spoofing does not admit the
     review. GET/HEAD limitations, source failure, duplicate data and outbound
     caller credential stripping remain covered by existing tests.
   - The generated module is present in Node **and Edge card** output and not in
     public dist. `.generated/*`, raw HTML and internal authority are not public
     filesystem routes; legitimate public artifact metadata contains no secrets.
4. Build the clean source with the default local dormant compiler; run the
   existing artifact unit and browser lifecycle tests plus the new admission
   tests. Preserve the real Legacy→reading-SW→Legacy lifecycle check and current
   policy/source handshake. Confirm root lock/config/App/flag are byte-unchanged.
   Run the relevant public SEO/URL/source tests and `git diff --check`, then scan
   source additions and emitted handlers/assets for secrets. Do not weaken existing
   tests because the generated module adds a build prerequisite.
5. Verify the nested artifact config has no fixed buildCommand shadowing the
   per-deployment pinned command. A default build still uses its unchanged package
   script and remains dormant. Run protected-review compilation only through the real, pinned Preview deployment
   identity. A synthetic env test proves rejection/logic only, not actual Vercel
   hosting. Never fake `VERCEL_ENV`, strip it or upload another build as this SHA.

## Hosted acceptance, read-only public content

- Save Vercel's source SHA, deployment ID, project, immutable URL, target and
  protection receipt. Confirm the generated artifact's identity and SW SHA agree.
  Independently confirm anonymous access is denied. Do not publish bypass tokens,
  profile storage or cookies in evidence.
- Recheck all canonical aliases and Legacy `/` against their pre-deployment
  receipt. The new review must own none of them. No alias/promotion/domain tool is
  part of this operation.
- Accept public Home→Post→World→Number→expression→back, old and native direct Post
  URLs, calculator parameters/share/back, gallery/video direct/reload, service
  pages, genuine 404 and server 503. Reuse valid current browser evidence where
  unchanged; the changed deployment boundary requires exact-host HTTP acceptance.
- Verify actual HTML/HEAD headers, canonical/OG/JSON-LD, XML, robots, content types,
  raw document hiding, query preservation, hashed immutable assets, no-store
  documents/API/SW, and fresh/returning SW admission. Confirm no policy drift versus
  the dormant artifact's transport; no cache of personal data or fallback HTML.
- Check service capability closures. Real administrator login remains an explicit
  user-use check. Use local/synthetic tokens for unsubscribe/signature failures and
  fixtures for positive mail/signup. No live unsubscribe, newsletter subscription,
  message, model, credit, Cardcom or product-data write is permitted as a test.
- Use the independent deny-only network guard for behavioral browser checks;
  distinguish blocked unreviewed calls and controlled fixtures from real reads.
  Never count a guard-blocked action as successful server behavior.

Acceptance records must say **protected artifact review**, not Production passed,
cutover authorized, backup restored, or all systems open. The review intentionally
overlays noindex/protection; a later public-indexable Production activation is a
different, exact, separately authorized configuration.

## Rollback and stop rules

No canonical traffic has moved, so a failed review does not require a website
rollback, SW change on live users, alias update, data reversal or server rollback.
Keep the last accepted immutable Preview URL available. Do not promote the failed
review, remove SSO protection, delete deployment evidence or change shared flags.

For a code defect, root prepares a normal corrective/revert commit of only this
bounded patch on the isolated branch, keeps all later Home fixes, and returns the
new artifact to default dormant mode. Do not reset/force-push/checkout user files.
Stop using a review URL if its target/protection/identity is wrong. Any request to
remove or alter an existing deployment is a separate action, not implicit cleanup.

For a future authorized website rollback, reuse the existing exact Legacy worker
and traffic-return procedure, reverified at the time. That procedure does not
restore database rows, object bytes or subscriptions. Production backup recovery
is a separate acceptance gate with its own approved destination and source set.
