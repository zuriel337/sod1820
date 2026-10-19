# POST 2029 source-first acceptance

Date: 2026-10-19  
Candidate base: `gpt/2029-hybrid-stage-preview-20261018` at `aa0b27500457bb89f96f36ecf0a73b7a80488c50`  
Acceptance branch: `gpt/post-2029-surface-acceptance-20261019`

## Finding

The public Post row was not the cold-path bottleneck. The exact public FZ1073 row was 35,336 response bytes and completed about one second after navigation in the local throttled run. The reader still waited for the full 2029 route graph and then for verification, connection resolution and the Golden context pack before it exposed the source.

The fix creates a small source-only projection and paints it from the existing early Post read. The full projection module, verification RPCs, relationship checks, context pack, comments and convergence measures start only after the primary source has painted. A failure in those extensions keeps the source readable. The public row is reused, so the full phase does not repeat the body read. Legacy, Post content, routing, DB, RLS and live switches are unchanged.

## Controlled mobile result

Profile: local clean Hybrid build, real anonymous public reads, Chromium, 390×844 dark mode, 150 ms latency, 200,000 bytes/sec download, 75,000 bytes/sec upload, 4× CPU slowdown, three fresh browser contexts. The Hybrid read-only guard blocked product writes; only its allowlisted read RPCs ran.

| Metric | Before runs | After runs | Median change |
|---|---:|---:|---:|
| Source hero | 12,529 / 11,729 / 12,829 ms | 9,149 / 9,128 / 9,391 ms | 12,529 → 9,149 ms (−27.0%) |
| Source body | source was gated by the full projection | 9,168 / 9,157 / 9,430 ms | source now paints with the hero |
| Full extensions ready | same as the original source gate | 13,445 / 14,551 / 16,272 ms | intentionally moved after source |
| LCP | 13,732 / 12,908 / 13,924 ms | 10,976 / 11,088 / 11,064 ms | 13,732 → 11,064 ms (−19.4%) |
| FCP | 3,916 / 3,948 / 3,916 ms | 4,124 / 4,076 / 4,084 ms | 3,916 → 4,084 ms (+168 ms) |
| CLS | about 0.0038 | 0.01265 | passes the 0.1 gate; late extension layout remains visible |

No page errors or unexpected writes were observed. The title, source body and canonical Post identity were present in every run. The result does **not** pass the target `LCP <= 2.5s`, so it is not release acceptance.

## Remaining critical path

The largest remaining cold path is shared client code and System Frame, not the Post row:

- 2029 entry: 358.9 KB raw / 116.5 KB gzip; about 3.5 seconds in this profile.
- Supabase client chunk: 191.0 KB raw / 49.9 KB gzip; about 2.7 seconds, in parallel with entry.
- System Frame JS: 210.9 KB raw / 63.5 KB gzip; requested after entry and about 3.3 seconds in this profile.
- System Frame CSS: 194.4 KB raw / 28.9 KB gzip; requested after entry and about 3.3 seconds in this profile.

A conditional route-module preload was measured and removed because it did not improve the median and increased transferred bytes. The next performance wave should split optional System Frame capabilities from the reading shell and remeasure Home, World and Post together. That is a shared-frame change and should be owned separately from this Post reader patch.

## Acceptance boundary

- Full enrichment remains available and replaces the primary projection when ready.
- Missing/private/preview fallback behavior remains in the full reader.
- The source remains visible if extension loading rejects.
- View/activity effects are keyed to the Post identity, so the primary-to-full transition does not duplicate them.
- Comments and convergence measures wait until the enrichment phase no longer competes with the first source paint.
- No Production deployment, merge, DB/RLS change or live flag change was performed.

## Validation

- The source-first contract passed 3/3 focused tests, including preservation of the source when enrichment fails.
- The existing Home/Post browser regression set passed 54/54 in Chromium against a built application.
- The focused Post/2029 suites passed after updating the stale comments assertion to require the canonical comments component behind the enrichment boundary.
- `npm run build:2029` completed successfully.
- The 2029 bundle guard passed 5/5. The built Post opening graph is 13 additional chunks / 100.3 KB gzip, below its 30 chunks / 185 KB budget. Before this split it was 29 chunks / 176.8 KB gzip.
- The Hybrid routing/build gate passed 8/8, including the early write guard and the exact candidate route inventory.
- `git diff --check` passed.

Raw measurements are in `measurements.json`.
