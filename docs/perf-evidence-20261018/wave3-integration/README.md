# Wave 3 performance integration handoff

## Boundary and verified baseline

This is a branch-only integration of two completed, non-overlapping performance
changes. It does not authorize or record a PR, CI run, deployment, merge, live
database write, live flag change, or Production change.

- Integration branch: `gpt/perf-unified-wave3-20261018`
- Exact immutable integration base:
  `origin/gpt/perf-unified-wave2-20261018@c066590fb88d5c1fe48238d7b49739ddf0b8eea4`
- Base tree: `1b049efaf909a0578c8b1c450423dc0094e41599`
- `origin/main` observed at task start:
  `6ef3ec2d6c139cd06af628b20ac2d5c3fb776a70`
- This branch remains divergent from current main (`272` commits on this side,
  `5` on main at verification time). It is an integration lane, not a release
  or permission to copy its full tree over main.

The canonical Supabase project `linswmnnkjxvweumprav` was reached through the
general Supabase connector using `SELECT` statements only. Live owner selection
confirmed `inter_agent_coordination_law` v17, `site_flags_lock_law` v3 and
`traffic_intelligence_law` v11. A bounded `work_log_current` scan found no
active writer overlapping the integrated files. The only unresolved active
writer found was an unrelated Post middleware scope.

## Exact sources and integration

Both remote heads were re-fetched and matched the supplied SHAs. Each source is
exactly one commit above the common candidate base
`8f78c0c7ced835849a816a815abf05a7247ceead`; each source is `1` commit ahead
while Wave 2 is `5` commits ahead of that base.

| Order | Scope | Verified source head | Rewritten integration commit |
| --- | --- | --- | --- |
| 1 | One successful `site_flags` snapshot per 2029 navigation | `origin/gpt/perf-site-flags-fanout-20261018@0830eab085919abe9e535064b31b5d86ee449d6b` | `fd831f89499937824116609ab3b48241b1c0f761` |
| 2 | RUM v2 measurement foundation | `origin/gpt/perf-rum-v2-20261018@0c71482fe35a53b776239c9885a2996766241051` | `b10c5dd31ae224d0aeea713970fd4832b759a8d5` |

Both cherry-picks applied without conflict. No resolution was guessed.

As an independent content proof, a temporary Git index was loaded with the exact
Wave 2 base and then received the complete binary-safe `base..source` diff for
site flags followed by the complete RUM diff. The constructed tree and the
pre-handoff integration tree were identical:

`a0a9543cc8b607207b483838039d7266a7b98816`

## Preserved boundaries

- Legacy keeps its prior in-flight-only `site_flags` reader. The successful
  navigation snapshot is compiled only for the 2029 build; its dedicated Legacy
  behavior test passed, and the full Legacy build passed.
- No Post, World, System Frame or Number visual/component file changed in this
  wave. `index.html`, `2029.html`, `.github/workflows/**`, `vercel.json`, RLS,
  deployment configuration and live flags are unchanged.
- The only repository database file added is
  `supabase/migrations/20261018021029_g3_2029_web_vitals_acceptance_rum_v2.sql`.
  It was not applied. A live read of `supabase_migrations.schema_migrations`
  returned `rum_v2_migration_applied=false`.
- A read-only live flag check retained the relevant review state, including
  `fx_number_lookup_page=false`, `fx_now_feed=false`, `fx_analytics=true` and
  `lock_number=true`. No flag writer was called.
- Number's review-only branch binding remains
  `gpt/perf-unified-candidate-20261018`. Consequently this Wave 3 branch does
  not silently inherit the Number opening. Before a final hosted Preview, update
  that exact binding in a separate bounded change and rerun Preview auth/route
  acceptance on the resulting SHA.

## Verification

All authoritative reruns completed on the pre-handoff integration head
`b10c5dd31ae224d0aeea713970fd4832b759a8d5`.

- Site flags/runtime controls: `32/32` focused tests passed. Coverage includes
  simultaneous and staggered consumers, per-navigation freshness, auth/viewer
  invalidation, retry after failure, late-response isolation, admin readback,
  baseline fallback, accelerator independence and unchanged Legacy behavior.
- RUM v2: core and wiring scripts passed; `6/6` unit tests and `1/1` real
  Chromium loopback test passed. The browser test proves early memory-only
  collection, Preview zero telemetry writes and zero identity reads, final over
  checkpoint ordering, hard-load versus SPA semantics, and usable-content
  detection.
- System Frame and canonical contract gates passed.
- Public/SEO gates: `20/20` public launch/SEO tests, server crawler/AI parity,
  `1/1` public entry build test and `3/3` public-language tests passed.
- Integrated Preview auth guard: `8/8` passed, including refusal of
  `site_flags` writes.
- Wave 2 Number gates: `16/16` passed; the existing Number Preview acceptance
  script also passed.
- Wave 2 Home/readiness/retry/scroll suites: `165/165` Chromium and Node tests
  passed with no skip. The exact built shell matrix passed all `12/12`
  width/theme cells with `CLS=0`, reading-marker delta `0 px`, horizontal
  overflow `0 px`, reserve `160 px`, and sticky header top `0 px`.
- Full Legacy + 2029 production build passed.
- Built bundle budget passed `5/5`: static entry `9` chunks / `187.2 KiB` gzip;
  Home `+26` / `+151.7 KiB`, World `+37` / `+253.6 KiB`, Post `+29` /
  `+175.3 KiB`, Number `+31` / `+202.8 KiB`.
- `git diff --check` passed, and the worktree was clean before this handoff was
  added.

The first build attempt used a borrowed dependency directory that lacked the
declared `@react-three/fiber` package, so it stopped before the 2029 build and
left no usable `dist`. A lockfile `npm ci` in the isolated worktree corrected the
environment; the authoritative full build and bundle rerun above then passed.
This was an environment setup failure, not a product regression.

## Release ordering and remaining acceptance

RUM v2 reuses `public.ingest_event -> public.events`; it does not create a new
analytics store. The application can emit v2 envelopes while the live admin
projection still understands v1 only. Therefore an authorized release must
review and apply the repository RUM migration before or together with the app
build, then verify the admin analytics RPC as an authenticated administrator.
Releasing the app first would create a measurement blind spot and could make v2
traffic look absent from the admin projection.

This integration does not provide hosted timing, real-corpus, authenticated,
physical-phone, Firefox, Safari or Production acceptance. Preview intentionally
writes no RUM, so hosted candidate speed remains a separate lab/browser
measurement. A future final Preview must first receive the bounded Number branch
binding update described above, then use one exact SHA and deployment receipt for
the complete route matrix.
