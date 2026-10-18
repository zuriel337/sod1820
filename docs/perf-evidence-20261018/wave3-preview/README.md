# Wave 3 Preview receipt

Status: **PREVIEW-ONLY · READY · PROTECTED · NOT PRODUCTION**.

This receipt records the bounded review deployment requested for the Wave 3
performance candidate. It does not authorize or record a PR, CI run, merge,
`main` update, Production deployment, public alias, database/RLS change, live
flag change, or release acceptance.

## Exact source and bounded change

- Source branch/head re-fetched and verified:
  `origin/gpt/perf-unified-wave3-20261018@6124db8d7ddac82654a09c49abf8ed60fe999d47`.
- Preview branch: `gpt/perf-unified-wave3-preview-20261018`.
- Deployed code commit:
  `9dbdc89af81f960ce3baeae6a9e37e34535bf595`.
- The only code delta from Wave 3 is one exact string in
  `src/lib/numberReviewPreview2029.js`:
  `NUMBER_REVIEW_PREVIEW_BRANCH_2029` now equals the Preview branch above.
- The binding remains conjunctive: `SOD_BUILD_TARGET=2029`,
  `VERCEL_ENV=preview`, and that exact Git ref. It was not widened to a pattern,
  another environment, or another branch.

The canonical Supabase project `linswmnnkjxvweumprav` was reached through the
general connector with `SELECT` statements only. Live owner selection confirmed
`inter_agent_coordination_law` v17, `deploy_on_request` v3, and
`site_flags_lock_law` v3. The bounded current-work scan found no active writer
overlapping this one-file binding. At completion, live state remains:

- `lock_number=true`, mode `all`;
- `fx_number_lookup_page=false`, mode `all`.

No database or flag writer was called.

## Local verification

The following passed before deployment:

- Number review/source, launch/SEO, site-flags, runtime-switch, convergence,
  locked-route preload, and RUM v2 unit set: **47/47**.
- Integrated Preview auth/write guard: **8/8**. The Preview cannot invent a
  missing launch row, open Number on another host, or write `site_flags`.
- 2029 server/crawler SEO and AI parity: **PASS**.
- Full Legacy + 2029 production build: **PASS**.
- 2029 bundle budget: **5/5**; entry `9` chunks / `187.2 KiB` gzip, Home
  `+26` / `+151.7 KiB`, World `+37` / `+253.6 KiB`, Post `+29` /
  `+175.3 KiB`, Number `+31` / `+202.8 KiB`.
- Exact-branch Preview browser gate: **2/2**. A synthetic closed
  `lock_number` row opened `/number/718` only in the exact Preview build, with
  zero unsafe writes; initial Home remained free of the visible loading status.
- RUM v2 real-Chromium guard: **1/1**. Preview emitted zero telemetry writes
  and made zero identity reads.
- Normal-build locked-route real-Chromium gate: **1/1**. World and Number route
  code started in parallel with the access gate, while protected content/data
  remained behind authorization.
- Exact-branch Preview local route smoke: `/`, `/number/718`, `/world`, and
  `/post/flydubai-fz1073-363-14000-remzei-geula` all mounted their expected 2029
  surfaces with no maintenance lock and no unsafe request in the loopback
  boundary.
- `git diff --check`: **PASS**.

One non-authoritative locked-route invocation was first run against the special
exact-Preview build. Its synthetic test expected closed Number to show the
maintenance lock, but this build intentionally projects that same row open, so
the invocation timed out waiting for `.mlock`. It was rerun on the canonical
normal 2029 build and passed. The exact-Preview behavior itself is covered by the
separate 2/2 browser gate above.

## Vercel target and deployment

Authenticated Vercel project discovery resolved exactly one intended target:

- Team: `sod1820's projects`
  (`sod1820-s-projects`, `team_vtfWHZfKvdbob8gvynQb5N89`).
- Project: `sod1820`
  (`prj_43q7k7QFAcWnin1tcBjce5xOi7Cq`).
- Connected Git repository: `zuriel337/sod1820`.

The CLI was pinned to `vercel@64.5.0`, but this executor had no existing CLI
credential or project link. `project inspect --non-interactive` stopped at the
device-login boundary; no login was completed and no project was linked. The
same authenticated Vercel connector was therefore used to verify the sole
team/project/Git connection and create the Preview from the exact remote ref and
SHA. No target mismatch was accepted.

- Deployment: `dpl_HdaTc9JvqtJDdTeYNj713R3Sx3pq`.
- Immutable URL:
  `https://sod1820-2ala52dua-sod1820-s-projects.vercel.app`.
- Branch alias:
  `https://sod1820-git-gpt-perf-unified-wave3-pr-1fdb4c-sod1820-s-projects.vercel.app`.
- State: `READY`.
- Target: Preview (`target=null`), never Production.
- Vercel metadata: ref
  `gpt/perf-unified-wave3-preview-20261018`, SHA
  `9dbdc89af81f960ce3baeae6a9e37e34535bf595`.
- Alias error: none.

## Protection and hosted-smoke boundary

Project protection remains enabled through Vercel SSO for Preview deployments;
password protection and trusted-IP changes were not introduced. Anonymous
requests to all four requested hosted routes returned `302` to Vercel SSO:

- `/`
- `/number/718`
- `/world`
- `/post/flydubai-fz1073-363-14000-remzei-geula`

This confirms that protection remains in force. It does not count as hosted app
content acceptance. This executor had neither an authenticated Vercel CLI
session nor a same-project development OIDC token. A temporary share/bypass
secret was deliberately not created, revealed, or installed. Consequently the
hosted content behind SSO was not opened in this pass; the exact-build local
four-route smoke above is the available content check.

No hosted speed claim is made. The deployment remains an isolated review
candidate, and this receipt commit is documentation only; it must not trigger an
automatic redeployment.
