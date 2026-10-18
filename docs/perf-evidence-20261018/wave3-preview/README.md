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

## Protection and hosted acceptance boundary

Project protection remains enabled through Vercel SSO for Preview deployments;
password protection and trusted-IP changes were not introduced. Anonymous
requests to all four requested hosted routes returned `302` to Vercel SSO:

- `/`
- `/number/718`
- `/world`
- `/post/flydubai-fz1073-363-14000-remzei-geula`

This confirmed that protection remained in force at initial deployment. In a
separate, explicitly approved follow-up acceptance pass, the central session
created one expiring deployment-scoped share link, supplied its secret to the
measurement process through standard input only, and revoked it immediately
after the matrix completed. The revocation response returned an empty
`protectionBypass` object. The secret is absent from the repository and the
measurement receipts.

The hosted pass used the same unmodified comparison runner, Chromium build,
profiles, route order, three-sample count and read-only network boundary as the
`8f78c0c7` baseline. All **30/30** samples completed without a usable-content
failure. `GET`, `HEAD` and `OPTIONS` were permitted; `POST` was limited to the
same 54 pre-approved read RPCs. Analytics, product writes, service workers and
websockets remained blocked before application navigation.

### Hosted median comparison

| Profile / journey | Usable baseline → Wave 3 | LCP baseline → Wave 3 | Requests | Transfer (kB) |
|---|---:|---:|---:|---:|
| Mobile Home | 3493 → 2872 ms (**−17.8%**) | 3560 → 2500 ms (**−29.8%**) | 155 → 151 | 833 → 1121 |
| Mobile Number 718 | 5699 → 2982 ms (**−47.7%**) | 5936 → 3136 ms (**−47.2%**) | 161 → 164 | 714 → 698 |
| Mobile World | 5318 → 2996 ms (**−43.7%**) | 5396 → 3032 ms (**−43.8%**) | 170 → 168 | 1146 → 1149 |
| Mobile Post | 5360 → 5081 ms (**−5.2%**) | 6480 → 5856 ms (**−9.6%**) | 135 → 133 | 3194 → 3197 |
| Mobile Home→World | 2555 → 2262 ms (**−11.5%**) | n/a | 136 → 132 | 594 → 609 |
| Desktop Home | 1950 → 1566 ms (**−19.7%**) | 3868 → 2416 ms (**−37.5%**) | 158 → 158 | 1558 → 1562 |
| Desktop Number 718 | 3026 → 2663 ms (**−12.0%**) | 3340 → 2968 ms (**−11.1%**) | 164 → 170 | 1155 → 1140 |
| Desktop World | 3539 → 2732 ms (**−22.8%**) | 4288 → 2992 ms (**−30.2%**) | 174 → 172 | 1587 → 1589 |
| Desktop Post | 4454 → 3611 ms (**−18.9%**) | 5952 → 4440 ms (**−25.4%**) | 139 → 137 | 3836 → 3838 |
| Desktop Home→World | 2407 → 1679 ms (**−30.3%**) | n/a | 151 → 143 | 1429 → 1111 |

The `site_flags` change is directly visible: all Wave 3 samples made two
network events for the single logical read, while the baseline normally made
four events for two logical reads. Timing changes are directionally strong but
were captured in different hosted time windows with uncontrolled CDN and
Postgres cache state. Request and byte deltas are therefore the stronger causal
evidence.

This remains **NOT RELEASE-ACCEPTED**. Mobile Number and World remain above the
2.5 s laboratory LCP target, Post remains far above it, desktop Number CLS is
`0.1062`, and desktop Post CLS remains `0.2082`. Mobile Home transfer bytes also
varied upward by 34.5% and require a controlled explanation before acceptance.
The next heavy fixes remain responsive Post media, deferred World story depth,
and a compact Number opening projection; this receipt does not claim those are
already integrated.

Reproducibility artifacts:

- `baseline-8f78c0c7.json.gz` — prior hosted receipt.
- `wave3-9dbdc89a.json.gz` — this hosted receipt.
- `hosted-comparison.json` — exact medians and deltas.
- `tools/hosted-comparison-runner.py` — byte-identical runner used for both
  receipts; SHA-256
  `cfaad96d63f5c382c3c98aa96e2a4e72d761cfe615fce0a574658154afcbdc2f`.

The deployment remains an isolated review candidate, and this receipt commit is
documentation only; it must not trigger an automatic redeployment.
