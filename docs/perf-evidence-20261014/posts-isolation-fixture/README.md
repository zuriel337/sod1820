# Posts isolation on /world, shared fixture harness (task PERF_POSTS_WORLD_FIXTURE_RERUN_20261014)
Base: claude/perf-testing-2029-5ayyow @ 13fccd0b86f11ba972ecc9fc55eef39ba2fd2254 (+ posts-mode.patch = src diff c70b483e vs 91a4c925, build constant VITE_WORLD_POSTS).
Harness: scripts/perf/harness.mjs unmodified, conditions of docs/perf-measurement-conditions-2029.md: mobile 390x844, CPU x4, 1.6 Mbps/150 ms, cold, 7 runs per invocation, fixtures replayed with fixed 150 ms Supabase delay (does NOT measure DB time). 3 invocations per variant in rotated order (r1..r3); fixtures-union file recorded from the live public reads for base+full+basic+off so all variants see the same data; fixture misses = 0 in every run.
Variants: base = unmodified tree; full = patch applied, post projection behind dynamic import, same requests as base; basic; off (reserved space).
Not measured: DB time, desktop, warm, hosted/Israel/real device.
